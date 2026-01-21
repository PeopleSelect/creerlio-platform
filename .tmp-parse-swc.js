const fs = require('fs');
const f = 'frontend/app/dashboard/talent/page.tsx';
const s = fs.readFileSync(f, 'utf8');
let swc;
try { swc = require('./frontend/node_modules/@swc/core'); } catch (e) { console.error('swc not found', e.message); process.exit(1); }
try {
  swc.parseSync(s, { syntax: 'typescript', tsx: true });
  console.log('SWC parse ok');
} catch (e) {
  console.error('SWC parse error:', e.message);
}
