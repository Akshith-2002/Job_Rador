import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { Job } from "./entity/Job";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  username: process.env.PGUSER || process.env.USER,
  password: process.env.PGPASSWORD || undefined,
  database: process.env.PGDATABASE || "job_scrapper",
  synchronize: true, // auto-creates / updates the jobs table
  logging: false,
  entities: [Job],
});
