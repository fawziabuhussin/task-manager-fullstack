import * as dotenv from "dotenv";
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || "3000", 10),
  JWT_SECRET: process.env.JWT_SECRET || "ASDASD2E123123123123123123QASDASD",
  CSRF_SECRET: process.env.CSRF_SECRET || "ASDASD2E123123123123123123QASDASD",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",
  NODE_ENV: process.env.NODE_ENV || "development",
};
