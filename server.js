// server.js
//
// Entry point for local development and for Railway (or any host that runs
// a normal, persistent Node process). Not used on Vercel -- see
// api/index.js for that path, which imports the same app.js but skips
// .listen() entirely (Vercel handles that itself).

const app = require('./app');
const { loadConfig } = require('./config');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  const cfg = loadConfig();
  console.log(`${cfg.appName} running at http://localhost:${PORT}`);
});
