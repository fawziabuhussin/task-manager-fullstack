import { z } from "zod";

export const upsertTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional(), // ISO string
  done: z.boolean().optional(),
});
