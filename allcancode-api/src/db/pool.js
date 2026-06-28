import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/allcancode";

export const pool = new Pool({
  connectionString
});
