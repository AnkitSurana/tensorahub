// api/index.js
//
// Vercel entry point. Vercel treats this file as a serverless function and
// routes every request to it (see the rewrite rule in vercel.json). It's
// the exact same Express app used locally and on Railway, just without
// calling .listen() -- Vercel's runtime handles receiving requests itself.

module.exports = require('../app');
