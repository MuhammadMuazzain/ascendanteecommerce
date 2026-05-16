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

async function dropAllTables() {
  console.log("Dropping all tables...");

  // Get all table names
  const result = await pool.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename
  `);

  const tables = result.rows.map((row) => row.tablename);

  if (tables.length === 0) {
    console.log("No tables to drop.");
    return;
  }

  console.log(`Found ${tables.length} table(s): ${tables.join(", ")}`);

  // Drop all tables with CASCADE to handle foreign keys
  for (const table of tables) {
    try {
      await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
      console.log(`✓ Dropped table: ${table}`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`✗ Error dropping table ${table}:`, error.message);
      }
    }
  }

  console.log("\n✓ All tables dropped");
}

async function runMigrations() {
  const migrationsDir = join(process.cwd(), "migrations");
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  console.log(`\nFound ${files.length} migration file(s)`);

  for (const file of files) {
    const filePath = join(migrationsDir, file);
    const sql = readFileSync(filePath, "utf-8");

    console.log(`\nRunning migration: ${file}`);
    try {
      await pool.query(sql);
      console.log(`✓ Successfully applied: ${file}`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`✗ Error applying ${file}:`, error.message);
        throw error;
      } else {
        throw error;
      }
    }
  }

  console.log("\n✓ All migrations completed");
}

async function main() {
  try {
    await dropAllTables();
    await runMigrations();
  } catch (error) {
    console.error("Operation failed:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
