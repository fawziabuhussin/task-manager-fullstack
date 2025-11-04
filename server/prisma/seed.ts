import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Seed IP allow-list with localhost
  await prisma.ipAllowList.upsert({
    where: { ip: "127.0.0.1" },
    create: { ip: "127.0.0.1", label: "Localhost" },
    update: { isActive: true },
  });
  console.log("Seeded IP allow-list with 127.0.0.1");
}

main().finally(async () => prisma.$disconnect());
