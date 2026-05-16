import { Pool } from "pg";
import { config } from "dotenv";
import { execSync } from "child_process";

// Load environment variables from .env file
config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
  connectionString,
});

async function resetDatabase() {
  console.log("Starting database reset...");

  const client = await pool.connect();
  try {
    // Drop all tables in the public schema
    console.log("Dropping all tables...");
    await client.query(`
      DO $$ 
      DECLARE 
          r RECORD;
      BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
              EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
      END $$;
    `);

    // Drop all custom types if any (optional but good for a full reset)
    console.log("Dropping all custom types...");
    await client.query(`
      DO $$ 
      DECLARE 
          r RECORD;
      BEGIN
          FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e') LOOP
              EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
          END LOOP;
      END $$;
    `);

    console.log("✓ Database tables dropped");
  } finally {
    client.release();
  }

  // Close the pool before running migrations via child process
  await pool.end();

  // Run migrations
  console.log("\nRunning consolidated migration...");
  try {
    execSync("npm run migrate", { stdio: "inherit" });
    console.log("\n✓ Database successfully reset and migrated");
  } catch (error) {
    console.error("\n✗ Failed to run migrations after reset");
    process.exit(1);
  }
}

resetDatabase().catch((error) => {
  console.error("Database reset failed:", error);
  process.exit(1);
});
