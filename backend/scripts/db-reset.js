import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = join(__dirname, '..');
const dataDir = join(backendDir, 'data');
const databasePath = join(dataDir, 'zixishi.sqlite');
const databaseFiles = [
  databasePath,
  `${databasePath}-wal`,
  `${databasePath}-shm`,
];

const confirmed = process.argv.includes('--yes') || process.env.CONFIRM_RESET === '1';

function printTargetFiles() {
  for (const filePath of databaseFiles) {
    const status = existsSync(filePath) ? 'exists' : 'missing';
    console.log(`- ${filePath} (${status})`);
  }
}

if (!confirmed) {
  console.log('Local development database reset is protected.');
  console.log('This command deletes the SQLite database files and rebuilds a clean seeded database.');
  console.log('Files that would be deleted:');
  printTargetFiles();
  console.log('');
  console.log('Run with explicit confirmation to reset:');
  console.log('  npm run db:reset -- --yes');
  console.log('  CONFIRM_RESET=1 npm run db:reset');
  process.exit(0);
}

console.log('Deleting local SQLite database files:');
printTargetFiles();

for (const filePath of databaseFiles) {
  rmSync(filePath, { force: true });
}

const dbModuleUrl = pathToFileURL(join(backendDir, 'src', 'db.js')).href;
const { configureDatabase, migrate, initMeta, seed, db } = await import(dbModuleUrl);

configureDatabase(db);
migrate();
initMeta();
seed();
db.close();

console.log('Database reset complete. Clean seed data has been applied.');
