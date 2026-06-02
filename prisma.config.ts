
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "app/(backend)/prisma/schema.prisma",
  migrations: {
    path: "app/(backend)/prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
