import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct (session-mode) connection — PgBouncer transaction
    // mode can't run DDL or hold transactions long enough.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
