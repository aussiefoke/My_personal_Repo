import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../../db/index';

const pool = new Pool({
  connectionString: 'postgresql://chargesmart:chargesmart@localhost:5432/chargesmart_dev',
  max: 10,
});

export const db = drizzle(pool, { schema });
export { schema };