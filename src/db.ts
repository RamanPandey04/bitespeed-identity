import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Contact" (
        id               SERIAL PRIMARY KEY,
        "phoneNumber"    VARCHAR(20),
        email            VARCHAR(255),
        "linkedId"       INTEGER REFERENCES "Contact"(id),
        "linkPrecedence" VARCHAR(10) NOT NULL CHECK ("linkPrecedence" IN ('primary', 'secondary')),
        "createdAt"      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt"      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "deletedAt"      TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS idx_email  ON "Contact"(email);
      CREATE INDEX IF NOT EXISTS idx_phone  ON "Contact"("phoneNumber");
      CREATE INDEX IF NOT EXISTS idx_linked ON "Contact"("linkedId");
    `);
    console.log("db init done");
  } finally {
    client.release();
  }
}