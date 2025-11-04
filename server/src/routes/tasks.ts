import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware/auth";
import { requireCsrf } from "../middleware/csrf";
import { upsertTaskSchema } from "../validators/task";

export const tasksRouter = Router();

tasksRouter.use(requireAuth, requireCsrf);

tasksRouter.get("/", async (req, res) => {
  const userId = (req as any).auth.userId as string;
  const page = parseInt((req.query.page as string) || "1", 10);
  const pageSize = Math.min(50, parseInt((req.query.pageSize as string) || "10", 10));
  const search = (req.query.search as string) || "";
  const sortParam = (req.query.sort as string) || "createdAt:desc";
  const [field, direction] = sortParam.split(":");
  const where = {
    userId,
    ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { [field || "createdAt"]: (direction === "asc" ? "asc" : "desc") as any },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.task.count({ where }),
  ]);
  res.json({ items, total, page, pageSize });
});

tasksRouter.post("/", async (req, res, next) => {
  try {
    const userId = (req as any).auth.userId as string;
    const input = upsertTaskSchema.parse(req.body);
    const created = await prisma.task.create({
      data: {
        userId,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        done: input.done ?? false,
      },
    });
    res.status(201).json(created);
  } catch (e) { next(e); }
});

tasksRouter.get("/:id", async (req, res) => {
  const userId = (req as any).auth.userId as string;
  const id = req.params.id;
  const task = await prisma.task.findFirst({ where: { id, userId } });
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json(task);
});

tasksRouter.put("/:id", async (req, res, next) => {
  try {
    const userId = (req as any).auth.userId as string;
    const id = req.params.id;
    const input = upsertTaskSchema.partial().parse(req.body);
    const existing = await prisma.task.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    const updated = await prisma.task.update({
      where: { id },
      data: {
        title: input.title ?? existing.title,
        description: input.description ?? existing.description,
        dueDate: input.dueDate ? new Date(input.dueDate) : existing.dueDate,
        done: typeof input.done === "boolean" ? input.done : existing.done,
      },
    });
    res.json(updated);
  } catch (e) { next(e); }
});

tasksRouter.delete("/:id", async (req, res) => {
  const userId = (req as any).auth.userId as string;
  const id = req.params.id;
  const existing = await prisma.task.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).json({ error: "Not found" });
  await prisma.task.delete({ where: { id } });
  res.status(204).end();
});
