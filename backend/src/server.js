import { createApp } from './app.js';
import { env } from './config/env.js';
import { initMeta, migrate, seed } from './db.js';

migrate();
initMeta();
seed();

const app = createApp();

app.listen(env.port, () => {
  console.log(`Zixishi API listening on http://localhost:${env.port}`);
});
