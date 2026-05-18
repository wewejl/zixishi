import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const candidates = [
  resolve(rootDir, 'node_modules/vite/bin/vite.js'),
  resolve(rootDir, '../frontend/node_modules/vite/bin/vite.js')
];

const viteBin = candidates.find((candidate) => existsSync(candidate));

if (!viteBin) {
  console.error('Vite is not installed. Run `npm install` in merchant-web or frontend first.');
  process.exit(1);
}

const child = spawn(process.execPath, [viteBin, ...process.argv.slice(2)], {
  cwd: rootDir,
  stdio: 'inherit'
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
