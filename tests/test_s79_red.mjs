import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };

function runTest(file) {
    try {
        const out = execFileSync('node', [file], { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
        return { code: 0, out };
    } catch (e) {
        return { code: e.status ?? 1, out: (e.stdout || '') + (e.stderr || '') };
    }
}

const tmp = mkdtempSync(join(tmpdir(), 's79red-'));

{
    const src = readFileSync(ROOT + 'js/core/nexus-guard.js', 'utf-8');
    const broken = src.replace(/window\.addEventListener\('error',[\s\S]*?\}, true\);/, '');
    check('guard 破坏注入生效(源码确含该块)', broken !== src);
    writeFileSync(tmp + '/nexus-guard.js', broken);
    const t = readFileSync(ROOT + 'tests/test_nexus_guard.mjs', 'utf-8')
        .replace("const ROOT = new URL('../js/core/', import.meta.url).pathname;", `const ROOT = ${JSON.stringify(tmp + '/')};`);
    writeFileSync(tmp + '/test_guard.mjs', t);
    const r = runTest(tmp + '/test_guard.mjs');
    check('删全局 error handler→守底必红', r.code !== 0 && (/FAIL/.test(r.out) || /Error/.test(r.out)));
}

{
    const src = readFileSync(ROOT + 'js/core/nexus-draft.js', 'utf-8');
    const broken = src.replace(/window\.addEventListener\('beforeunload',[\s\S]*?\}\);\n/, '');
    check('draft 破坏注入生效(源码确含该块)', broken !== src);
    writeFileSync(tmp + '/nexus-draft.js', broken);
    const t = readFileSync(ROOT + 'tests/test_nexus_draft.mjs', 'utf-8')
        .replace("const ROOT = new URL('../js/core/', import.meta.url).pathname;", `const ROOT = ${JSON.stringify(tmp + '/')};`);
    writeFileSync(tmp + '/test_draft.mjs', t);
    const r = runTest(tmp + '/test_draft.mjs');
    check('删 beforeunload 拦截→守底必红', r.code !== 0 && /FAIL/.test(r.out));
}

{
    const src = readFileSync(ROOT + 'js/core/nexus-draft.js', 'utf-8');
    const broken = src.replace(/entry\.cleanUntilInput = true;\n(\s*)writeStore\(entry\.key, null\);/, 'writeStore(entry.key, null);');
    const broken2 = broken.replace(/if \(entry\.cleanUntilInput\) return;/, '');
    check('clear 语义破坏注入生效', broken2 !== broken);
    writeFileSync(tmp + '/nexus-draft.js', broken2);
    const t = readFileSync(ROOT + 'tests/test_nexus_draft.mjs', 'utf-8')
        .replace("const ROOT = new URL('../js/core/', import.meta.url).pathname;", `const ROOT = ${JSON.stringify(tmp + '/')};`);
    writeFileSync(tmp + '/test_draft2.mjs', t);
    const r = runTest(tmp + '/test_draft2.mjs');
    check('删 cleanUntilInput 语义→守底必红(提交后仍拦截被捕获)', r.code !== 0 && /FAIL/.test(r.out));
}

let pass = 0;
for (const [name, ok] of results) {
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
    if (ok) pass++;
}
console.log(pass + '/' + results.length + ' passed');
process.exit(pass === results.length ? 0 : 1);
