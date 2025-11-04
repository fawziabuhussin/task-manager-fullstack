import { Router, Request, Response } from "express";
import { prisma } from "../prisma";

export const devRouter = Router();

devRouter.get("/ip", (req: Request, res: Response) => {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "";
  res.json({ ip });
});

devRouter.get("/mailbox", async (req: Request, res: Response) => {
  const emails = await prisma.outboxEmail.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  const items = emails.map(e => `
    <li style="margin-bottom:12px;padding:8px;border:1px solid #ddd;border-radius:8px;">
      <div><strong>To:</strong> ${e.to}</div>
      <div><strong>Subject:</strong> ${e.subject}</div>
      <pre style="white-space:pre-wrap">${e.body}</pre>
      <div style="color:#666;font-size:12px">${e.createdAt.toISOString()}</div>
    </li>
  `).join("");
  res.send(`
    <html><head><title>Dev Mailbox</title></head>
    <body style="font-family:sans-serif;max-width:800px;margin:32px auto;">
      <h1>Dev Mailbox</h1>
      <p>Latest 50 emails:</p>
      <ul style="list-style:none;padding:0">${items}</ul>
    </body></html>
  `);
});
