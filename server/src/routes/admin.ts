import { Router } from "express";
import { prisma } from "../prisma";

export const adminRouter = Router();

// Simple read-only for now; in real app protect with role-based auth.
adminRouter.get("/ip-allowlist", async (req, res) => {
  const items = await prisma.ipAllowList.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ items });
});

adminRouter.post("/ip-allowlist", async (req, res) => {
  const { ip, label } = req.body || {};
  if (!ip) return res.status(400).json({ error: "ip required" });
  const created = await prisma.ipAllowList.create({ data: { ip, label } });
  res.status(201).json(created);
});

adminRouter.delete("/ip-allowlist/:id", async (req, res) => {
  const id = req.params.id;
  await prisma.ipAllowList.delete({ where: { id } });
  res.status(204).end();
});
