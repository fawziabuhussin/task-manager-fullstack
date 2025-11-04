import { prisma } from "../prisma";

export async function sendEmail(to: string, subject: string, body: string) {
  await prisma.outboxEmail.create({
    data: { to, subject, body },
  });
}
