import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import { config } from "dotenv";

// Load environment variables from .env file
config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
  connectionString,
});

async function runMigrations() {
  const migrationsDir = join(process.cwd(), "migrations");
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration file(s)`);

  for (const file of files) {
    const filePath = join(migrationsDir, file);
    const sql = readFileSync(filePath, "utf-8");

    console.log(`\nRunning migration: ${file}`);
    try {
      await pool.query(sql);
      console.log(`✓ Successfully applied: ${file}`);
    } catch (error) {
      if (error instanceof Error) {
        // Check if it's a "already exists" error (table/index already created)
        if (error.message.includes("already exists")) {
          console.log(`⚠ Skipping ${file} (already applied)`);
        } else {
          console.error(`✗ Error applying ${file}:`, error.message);
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  await pool.end();
  console.log("\n✓ All migrations completed");
}

runMigrations().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
