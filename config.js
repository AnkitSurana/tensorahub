// config.js
// Reads config.json fresh on every call, same pattern as manifest.js --
// change the app name in that one file, no restart needed, no other
// file needs touching.

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw);
}

module.exports = { loadConfig };
