const fs = require('fs');
const parser = require('./frontend/node_modules/@babel/parser');
const f = 'frontend/app/dashboard/talent/page.tsx';
const s = fs.readFileSync(f, 'utf8');
try {
  parser.parse(s, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  console.log('Babel parse ok');
} catch (e) {
  console.error('Babel parse error:', e.message);
  if (e.loc) console.error('Location', e.loc);
}
