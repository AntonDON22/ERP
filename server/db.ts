import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // максимум соединений в пуле
  min: 2, // минимум соединений в пуле
  idleTimeoutMillis: 30000, // время жизни неактивного соединения
  connectionTimeoutMillis: 10000, // таймаут подключения
});
export const db = drizzle({ client: pool, schema });
