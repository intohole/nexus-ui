// S98 守底：fontawesome 退役三件——census 守护、build 契约、别名语义。
// 撤守卫必红：构建器别名表损坏/产物契约缺失/css 裸色值任一即 fail。
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('../', import.meta.url).pathname;
const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };

// ---- census 守护件在位 ----
check('census: 脚本在位', existsSync(ROOT + 'tools/fontawesome_census.py'));
check('census: vendor 排除在位（fa 副本不自计）', /"vendor"/.test(readFileSync(ROOT + 'tools/fontawesome_census.py', 'utf8')));
{
    let ok = false;
    try {
        const out = execFileSync('python3', [ROOT + 'tools/fontawesome_census.py'], { encoding: 'utf8', cwd: ROOT });
        ok = /进度:/.test(out);
    } catch (e) { ok = false; }
    check('census: 可执行出进度行', ok);
}

// ---- build 契约：nexus-ui 自身子集构建全绿 ----
let css = '';
{
    let ok = false;
    try {
        const out = execFileSync('python3', [ROOT + 'tools/nux_icons_build.py', '--repo', 'nexus-ui', '--out', '/tmp/s98_guard_nexusui.css'], { encoding: 'utf8', cwd: ROOT });
        ok = /MISSING/.test(out) === false && /built \d+ icons/.test(out);
    } catch (e) { ok = false; }
    check('build: nexus-ui 子集构建零 missing', ok);
    css = existsSync('/tmp/s98_guard_nexusui.css') ? readFileSync('/tmp/s98_guard_nexusui.css', 'utf8') : '';
}
check('build: 容器类承载在位（currentColor+mask）', /\.fa,\.fas,\.far,\.fab.*background-color:currentColor/.test(css) && css.includes('-webkit-mask-image'));
check('build: fa-spin 动画等价在位', css.includes('nuxfa-spin'));
check('build: 尺寸类等价在位（lg/2x/fw）', css.includes('.fa-lg') && css.includes('.fa-2x') && css.includes('.fa-fw'));
check('build: 许可注记在位（CC BY 4.0）', css.includes('CC BY 4.0'));
{
    const stripped = css.replace('.fa-inverse{background-color:#fff}', '');
    check('build: 呈现面零裸 hex（S64 暗色契约）', !/#([0-9a-fA-F]{3,6})\b/.test(stripped));
}
check('build: 图标类数量充分（nexus-ui ≥90）', (css.match(/mask-image/g) || []).length >= 180);

// ---- 别名语义守卫：无环+目标合法+高频名有落点 ----
{
    const src = readFileSync(ROOT + 'tools/nux_icons_build.py', 'utf8');
    const m = src.match(/ALIASES = \{([\s\S]*?)\n\}/);
    check('alias: 表在位', !!m);
    if (m) {
        const pairs = [...m[1].matchAll(/"([a-z0-9-]+)":\s*"([a-z0-9-]+)"/g)];
        const map = Object.fromEntries(pairs.map(p => [p[1], p[2]]));
        let acyclic = true;
        for (const k of Object.keys(map)) {
            const seen = new Set([k]);
            let cur = map[k];
            while (map[cur]) {
                if (seen.has(cur)) { acyclic = false; break; }
                seen.add(cur);
                cur = map[cur];
            }
            if (!acyclic) break;
        }
        check('alias: 归一无环', acyclic && pairs.length > 100);
        const mustHave = ['times', 'check-circle', 'sync-alt', 'home', 'trash-alt', 'edit', 'search', 'cog', 'file-alt', 'shield-alt'];
        check('alias: v4/v5 高频名全有落点', mustHave.every(n => map[n]));
    }
}

// ---- 渲染验证页在位（mask 方案浏览器验证载体）----
check('e2e: 渲染验证页在位', existsSync(ROOT + 'tests/e2e_fa_icons.html'));

// ---- mask data URI 良构性：css 内每个图标 URL 可解码且为合法 SVG（图形数据静态证明）----
{
    const uris = [...css.matchAll(/mask-image:url\('data:image\/svg\+xml;utf8,([^']+)'\)/g)].map(m => m[1]);
    let wellformed = 0;
    for (const u of uris) {
        try {
            const svg = decodeURIComponent(u.replace(/%3C/g, '<').length ? u : u);
            const dec = decodeURIComponent(u);
            if (dec.includes('<svg') && dec.includes('<path') && dec.includes('viewBox')) wellformed += 1;
        } catch (e) { }
    }
    check('mask: data URI 全部可解码且 SVG 良构', uris.length > 150 && wellformed === uris.length);
}

let fail = 0;
for (const [name, ok] of results) { if (!ok) { fail += 1; console.log('FAIL ' + name); } }
console.log(`test_fa_retire: ${results.length - fail}/${results.length} passed`);
if (fail > 0) process.exit(1);
