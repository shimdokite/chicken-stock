import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getDatasourceUrl() {
  const datasourceUrl = process.env.DATABASE_URL;

  if (!datasourceUrl) {
    return undefined;
  }

  try {
    const url = new URL(datasourceUrl);

    if (
      url.hostname.endsWith(".pooler.supabase.com") &&
      url.port === "5432"
    ) {
      url.port = "6543";

      if (!url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
      }
    }

    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }

    return url.toString();
  } catch {
    return datasourceUrl;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: getDatasourceUrl(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
