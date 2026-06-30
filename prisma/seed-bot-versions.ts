import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const clients = await prisma.client.findMany({
    include: { botVersions: { select: { id: true } } },
  });

  let created = 0;
  let attached = 0;

  for (const client of clients) {
    if (client.botVersions.length > 0) continue;
    if (!client.n8nWebhookUrl) continue;

    const version = await prisma.botVersion.create({
      data: {
        clientId: client.id,
        label: "v1",
        n8nWebhookUrl: client.n8nWebhookUrl,
        isActive: true,
        notes: "Migrated from legacy client-level webhook URL",
      },
    });
    created++;

    const updated = await prisma.testRun.updateMany({
      where: { clientId: client.id, botVersionId: null },
      data: { botVersionId: version.id },
    });
    attached += updated.count;

    console.log(
      `Client ${client.name}: created v1, attached ${updated.count} runs`,
    );
  }

  console.log(`\nDone: created ${created} bot versions, attached ${attached} runs.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
