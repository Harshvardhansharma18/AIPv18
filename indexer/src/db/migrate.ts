import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { config } from '../config.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations(): Promise<void> {
  const pool = new Pool({
    connectionString: config.databaseUrl,
  });

  try {
    const db = drizzle(pool);
    const migrationsFolder = path.join(__dirname, 'migrations');
    
    console.log(`Running migrations from: ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
