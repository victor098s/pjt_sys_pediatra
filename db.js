import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  user:"postgres",
  host:"localhost",
  database:"bd_sys_pediatra",
  password:"senai",
  port:5432,
});

export default pool;
