import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Schema push/migrations need the session pooler (supports prepared
    // statements) — the app runtime uses DATABASE_URL's transaction
    // pooler instead, see src/index.ts.
    url: process.env.DIRECT_URL!,
  },
});
