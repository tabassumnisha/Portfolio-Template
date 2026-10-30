'use strict';
/* © 2026 Ride Bangla Limited. Standard Licence, see LICENSE-NOTE.md. */
/* server/index.js — entry point: `npm start` */
const { load } = require('./config');
const { createApp } = require('./app');

const cfg = load();
const app = createApp(cfg);
app.server.listen(cfg.port, cfg.host, () => {
  console.log(`Creative Portfolio CMS running:  http://localhost:${cfg.port}   (admin panel: /admin/)`);
});

function shutdown() { app.close().then(() => process.exit(0)); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
