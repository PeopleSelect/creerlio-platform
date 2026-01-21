const esbuild = require('./frontend/node_modules/esbuild');
const fs = require('fs');
const s = fs.readFileSync('frontend/app/dashboard/talent/page.tsx','utf8');
try {
  esbuild.transformSync(s, { loader: 'tsx' });
  console.log('esbuild parse ok');
} catch (e) {
  console.error('esbuild error:', e.message);
}
