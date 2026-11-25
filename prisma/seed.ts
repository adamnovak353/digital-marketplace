import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.provider.upsert({
    where: { key: "payments" },
    update: { mode: "MOCK", status: "not_connected", note: "Mock adapter. No live charges." },
    create: { key: "payments", name: "Payments", mode: "MOCK", status: "not_connected", note: "Mock adapter. No live charges." },
  });
  console.log("Provider rows updated. Catalog, users, and orders are seeded in memory by the demo service.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
