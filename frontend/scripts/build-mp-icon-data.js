import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const iconDir = join(root, 'src/static/icons-mp');
const outputFile = join(root, 'src/utils/mp-icon-data.js');

const usedIconFiles = [
  'ic-access-f3e0c0.png',
  'ic-arrow-left-031632.png',
  'ic-arrow-left-1f2f4d.png',
  'ic-bluetooth-f3e0c0.png',
  'ic-bolt-031632.png',
  'ic-bolt-44474d.png',
  'ic-bolt-f3e0c0.png',
  'ic-calendar-031632.png',
  'ic-cancel-75777e.png',
  'ic-check-circle-6a5d43.png',
  'ic-check-circle-f0debd.png',
  'ic-chevron-right-4b5360.png',
  'ic-chevron-right-9c7836.png',
  'ic-chevron-right-ffffff.png',
  'ic-copy-ffffff.png',
  'ic-diamond-f0debd.png',
  'ic-diamond-f3e0c0.png',
  'ic-group-031632.png',
  'ic-help-031632.png',
  'ic-home-031632.png',
  'ic-home-44474d.png',
  'ic-hourglass-031632.png',
  'ic-lock-open-6a5d43.png',
  'ic-lock-open-f3e0c0.png',
  'ic-menu-031632.png',
  'ic-menu-1f2f4d.png',
  'ic-menu-44474d.png',
  'ic-password-031632.png',
  'ic-power-1f2f4d.png',
  'ic-power-6a5d43.png',
  'ic-rank-031632.png',
  'ic-receipt-031632.png',
  'ic-seat-031632.png',
  'ic-seat-1f2f4d.png',
  'ic-seat-44474d.png',
  'ic-seat-6a5d43.png',
  'ic-seat-ffffff.png',
  'ic-settings-031632.png',
  'ic-shield-lock-031632.png',
  'ic-shield-lock-6a5d43.png',
  'ic-shop-031632.png',
  'ic-shop-44474d.png',
  'ic-star-6a5d43.png',
  'ic-star-9c7836.png',
  'ic-task-031632.png',
  'ic-user-031632.png',
  'ic-user-1f2f4d.png',
  'ic-user-44474d.png',
  'ic-volume-off-1f2f4d.png',
  'ic-volume-off-6a5d43.png',
  'ic-wifi-6a5d43.png',
  'ic-window-1f2f4d.png',
  'ic-window-6a5d43.png',
];

const entries = {};

for (const file of usedIconFiles) {
  const path = join(iconDir, file);
  if (!existsSync(path)) {
    throw new Error(`Missing generated mini-program icon: ${path}`);
  }
  entries[file.replace(/\.png$/, '')] = `data:image/png;base64,${readFileSync(path).toString('base64')}`;
}

mkdirSync(join(root, 'src/utils'), { recursive: true });
writeFileSync(
  outputFile,
  `export const MP_ICON_DATA = ${JSON.stringify(entries, null, 2)};\n`,
);

console.log(`Generated ${Object.keys(entries).length} inline mini-program icons.`);
