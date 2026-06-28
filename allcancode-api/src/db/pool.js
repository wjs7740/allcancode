import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/allcancode";
const sub2apiConnectionString = process.env.SUB2API_DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/sub2api";

export const pool = new Pool({
  connectionString
});

export const sub2apiPool = new Pool({
  connectionString: sub2apiConnectionString
});
