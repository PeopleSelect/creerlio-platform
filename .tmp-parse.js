const ts = require('./frontend/node_modules/typescript');
const fs = require('fs');
const f = 'frontend/app/dashboard/talent/page.tsx';
const s = fs.readFileSync(f, 'utf8');
const res = ts.transpileModule(s, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX } });
if (res.diagnostics && res.diagnostics.length) {
  console.log(res.diagnostics.map(d => ({
    code: d.code,
    message: ts.flattenDiagnosticMessageText(d.messageText, ' '),
    line: d.file.getLineAndCharacterOfPosition(d.start).line + 1,
    character: d.file.getLineAndCharacterOfPosition(d.start).character + 1
  })));
} else {
  console.log('No diagnostics');
}
