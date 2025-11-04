import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { env } from "./env";
import { authRouter } from "./routes/auth";
import { tasksRouter } from "./routes/tasks";
import { adminRouter } from "./routes/admin";
import { devRouter } from "./routes/dev";
import { errorHandler } from "./middleware/error";
import rateLimit from "express-rate-limit";

export function buildApp() {
  const app = express();

  // Only trust local proxy for development
  app.set("trust proxy", "loopback");

  app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }));
  app.use(cookieParser());
  app.use(express.json());

  // Basic healthcheck
  app.get("/health", (_req: express.Request, res: express.Response) => res.json({ ok: true }));

  // Rate limit login specifically
  const limiter = rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/auth/login", limiter);

  app.use("/api/auth", authRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/dev", devRouter);

  app.use(errorHandler);
  return app;
}
