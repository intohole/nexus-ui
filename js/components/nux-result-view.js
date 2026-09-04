(function () {
    'use strict';

    if (!document.getElementById('nrv-css')) {
        const style = document.createElement('style');
        style.id = 'nrv-css';
        style.textContent = [
            '.nrv { margin-top: 4px; }',
            '.nrv-summary { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }',
            '.nrv-summary-item { font-size: 11px; padding: 2px 8px; background: var(--route-bg, #eef3fb); color: var(--primary-dark, #2c5aa8); border-radius: 6px; }',
            '.nrv-table-wrap { overflow-x: auto; max-height: 220px; overflow-y: auto; background: #fff; border-radius: 6px; }',
            '.nrv-table { width: 100%; border-collapse: collapse; font-size: 11px; }',
            '.nrv-table th, .nrv-table td { padding: 5px 8px; border: 1px solid var(--border, #e5e7eb); text-align: left; white-space: nowrap; max-width: 240px; overflow: hidden; text-overflow: ellipsis; }',
            '.nrv-table th { background: var(--route-bg, #eef3fb); color: var(--primary-dark, #2c5aa8); font-weight: 600; position: sticky; top: 0; }',
            '.nrv-table tr:nth-child(even) td { background: var(--bg, #f7f8fa); }',
            '.nrv-kv-item { display: flex; gap: 8px; padding: 3px 0; font-size: 11px; border-bottom: 1px dashed var(--border, #e5e7eb); }',
            '.nrv-kv-key { color: var(--text-muted, #8a93a6); flex: 0 0 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
            '.nrv-kv-val { color: var(--text, #29303f); word-break: break-word; }'
        ].join('\n');
        document.head.appendChild(style);
    }

    const NuxResultView = {
        name: 'NuxResultView',
        props: { struct: { type: Object, default: null } },
        template: `
            <div v-if="struct" class="nrv">
                <div v-if="struct.kind === 'table'" class="nrv-table-wrap">
                    <div v-if="struct.summary" class="nrv-summary">
                        <span v-for="(v, k) in struct.summary" :key="k" class="nrv-summary-item">{{ k }}: {{ v }}</span>
                    </div>
                    <table class="nrv-table">
                        <thead><tr><th v-for="c in struct.columns" :key="c">{{ c }}</th></tr></thead>
                        <tbody>
                            <tr v-for="(r, ri) in struct.rows" :key="ri">
                                <td v-for="c in struct.columns" :key="c">{{ r[c] }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-else-if="struct.kind === 'kv'" class="nrv-kv">
                    <div v-for="p in struct.pairs" :key="p.k" class="nrv-kv-item">
                        <span class="nrv-kv-key">{{ p.k }}</span><span class="nrv-kv-val">{{ p.v }}</span>
                    </div>
                </div>
            </div>
        `
    };

    window.NuxResultView = NuxResultView;
})();