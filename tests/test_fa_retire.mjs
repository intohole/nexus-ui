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

// ---- 成品契约：css/nux-icons.css 是 FA 退役后唯一承载（a3d27c0 删 vendor 源料，
// out/s98/fa_src 临时缓存被磁盘治理清空 → 重建式守卫成为死路径，改对成品断言同契约） ----
let css = '';
{
    const artifact = ROOT + 'css/nux-icons.css';
    check('artifact: 成品在位（FA 退役后唯一承载）', existsSync(artifact));
    css = existsSync(artifact) ? readFileSync(artifact, 'utf8') : '';
}
check('artifact: 容器类承载在位（currentColor+mask）', /\.fa,\.fas,\.far,\.fab.*background-color:currentColor/.test(css) && css.includes('-webkit-mask-image'));
check('artifact: fa-spin 动画等价在位', css.includes('nuxfa-spin'));
check('artifact: 尺寸类等价在位（lg/2x/fw）', css.includes('.fa-lg') && css.includes('.fa-2x') && css.includes('.fa-fw'));
check('artifact: 许可注记在位（CC BY 4.0）', css.includes('CC BY 4.0'));
{
    const stripped = css.replace('.fa-inverse{background-color:#fff}', '');
    check('artifact: 呈现面零裸 hex（S64 暗色契约）', !/#([0-9a-fA-F]{3,6})\b/.test(stripped));
}
check('artifact: 图标类数量充分（nexus-ui ≥90）', (css.match(/mask-image/g) || []).length >= 180);

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

        // ---- 消费名覆盖：census 扫仓内 fa 类消费清单 → ALIASES 归一 → 逐名查成品落点 ----
        // （替代退役的重建式「零 missing」断言：源 SVG 已随 FA 退役消失，成品即契约）
        if (css) {
            let missing = [];
            try {
                const probe = [
                    "import sys; sys.path.insert(0, 'tools')",
                    "from pathlib import Path",
                    "from fontawesome_census import iter_targets, icon_names",
                    "names = set()",
                    "for t in iter_targets(Path('nexus-ui')):",
                    "    names |= set(icon_names(t.read_text(encoding='utf8', errors='ignore')).keys())",
                    "print('\\n'.join(sorted(names)))"
                ].join('\n');
                const out = execFileSync('python3', ['-c', probe], { encoding: 'utf8', cwd: ROOT });
                const names = out.split('\n').map(s => s.trim()).filter(Boolean);
                for (const n of names) {
                    const v6 = map[n] || n;
                    if (!css.includes('.fa-' + v6) && !css.includes('.fa-' + n)) missing.push(n);
                }
            } catch (e) { missing = ['<census-fail:' + e.message.slice(0, 80) + '>']; }
            if (missing.length) console.error('  missing:', missing.slice(0, 10).join(', '), missing.length > 10 ? `（共 ${missing.length}）` : '');
            check('artifact: 消费名全覆盖零 missing（census 口径）', missing.length === 0);
        }
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
