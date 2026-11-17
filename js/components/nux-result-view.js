(function () {
    'use strict';

    window.NexusUtils && NexusUtils.injectStyle('nrv-css', [
            '.nrv { margin-top: 4px; }',
            '.nrv-summary { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }',
            '.nrv-summary-item { font-size: 11px; padding: 2px 8px; background: rgba(var(--app-accent-rgb,99,102,241),.08); color: var(--app-accent,#6366f1); border-radius: var(--nx-radius-sm,6px); }',
            '.nrv-table-wrap { overflow-x: auto; max-height: 220px; overflow-y: auto; background: var(--nx-bg-surface,#fff); border-radius: var(--nx-radius-sm,6px); }',
            '.nrv-table { width: 100%; border-collapse: collapse; font-size: 11px; }',
            '.nrv-table th, .nrv-table td { padding: 5px 8px; border: 1px solid var(--nx-border,rgba(0,0,0,.08)); text-align: left; white-space: nowrap; max-width: 240px; overflow: hidden; text-overflow: ellipsis; }',
            '.nrv-table th { background: var(--nx-bg-muted,#f1f5f9); color: var(--app-accent,#6366f1); font-weight: 600; position: sticky; top: 0; }',
            '.nrv-table tr:nth-child(even) td { background: var(--nx-bg-muted,#f1f5f9); }',
            '.nrv-kv-item { display: flex; gap: 8px; padding: 3px 0; font-size: 11px; border-bottom: 1px dashed var(--nx-border,rgba(0,0,0,.08)); }',
            '.nrv-kv-key { color: var(--nx-text-muted,#94a3b8); flex: 0 0 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
            '.nrv-kv-val { color: var(--nx-text-body,#334155); word-break: break-word; }',
            '.nrv-editable .nrv-table td[data-edit], .nrv-editable .nrv-kv-val[data-edit] { cursor: text; }',
            '.nrv-editable .nrv-table td[data-edit]:hover, .nrv-editable .nrv-kv-val[data-edit]:hover { outline: 1px dashed var(--app-accent,#6366f1); outline-offset: -2px; }',
            '.nrv-edit-input { width: 100%; font: inherit; font-size: 11px; padding: 2px 4px; border: 1px solid var(--app-accent,#6366f1); border-radius: 4px; background: var(--nx-bg-surface,#fff); color: var(--nx-text-body,#334155); box-sizing: border-box; }',
            '.nrv-instruct-wrap { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; }',
            '.nrv-instruct-anchor { font-size: 10px; padding: 2px 8px; background: rgba(var(--app-accent-rgb,99,102,241),.1); color: var(--app-accent,#6366f1); border-radius: 999px; max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
            '.nrv-instruct-anchor-clear { border: none; background: none; color: var(--nx-text-muted,#94a3b8); font-size: 10px; cursor: pointer; padding: 0 2px; text-decoration: underline; }',
            '.nrv-instruct { flex: 1; min-width: 160px; font-size: 11px; padding: 5px 8px; border: 1px solid var(--nx-border,rgba(0,0,0,.12)); border-radius: var(--nx-radius-sm,6px); background: var(--nx-bg-surface,#fff); color: var(--nx-text-body,#334155); }',
            '.nrv-instruct:focus { outline: none; border-color: var(--app-accent,#6366f1); }',
            '.nrv-instruct:disabled { opacity: .55; cursor: not-allowed; }'
        ].join(''));

    const NuxResultView = {
        name: 'NuxResultView',
        props: {
            struct: { type: Object, default: null },
            editable: { type: Boolean, default: false },
            readonly: { type: Boolean, default: false },
            instruct: { type: Boolean, default: false },
            busy: { type: Boolean, default: false }
        },
        emits: ['edit', 'instruct'],
        data() {
            return { editCell: null, editValue: '', anchor: null, draft: '' };
        },
        computed: {
            canEdit() { return this.editable && !this.readonly && !this.busy; },
            anchorText() {
                const a = this.anchor;
                if (!a) return '';
                return a.kind === 'table' ? ('第 ' + (a.row + 1) + ' 行·' + a.column) : a.key;
            }
        },
        methods: {
            cellClick(kind, idx, column) {
                if (!this.canEdit) return;
                if (kind === 'table') {
                    const rows = (this.struct && this.struct.rows) || [];
                    this.editCell = { kind: 'table', row: idx, column: column };
                    this.editValue = String((rows[idx] || {})[column] ?? '');
                    this.anchor = { kind: 'table', row: idx, column: column };
                } else {
                    const pairs = (this.struct && this.struct.pairs) || [];
                    this.editCell = { kind: 'kv', index: idx, key: pairs[idx] ? pairs[idx].k : '' };
                    this.editValue = String((pairs[idx] || {}).v ?? '');
                    this.anchor = { kind: 'kv', key: this.editCell.key };
                }
                this.$nextTick(() => {
                    const el = this.$el.querySelector('.nrv-edit-input');
                    el && el.focus();
                });
            },
            commitEdit() {
                const c = this.editCell;
                if (!c) return;
                this.editCell = null;
                const next = this.editValue;
                let oldValue = '';
                if (c.kind === 'table') {
                    const rows = (this.struct && this.struct.rows) || [];
                    oldValue = String((rows[c.row] || {})[c.column] ?? '');
                } else {
                    const pairs = (this.struct && this.struct.pairs) || [];
                    oldValue = String((pairs[c.index] || {}).v ?? '');
                }
                if (next === oldValue) return;
                this.$emit('edit', {
                    kind: c.kind,
                    row: c.kind === 'table' ? c.row : undefined,
                    column: c.kind === 'table' ? c.column : undefined,
                    key: c.kind === 'kv' ? c.key : undefined,
                    oldValue: oldValue,
                    newValue: next
                });
            },
            cancelEdit() { this.editCell = null; },
            submitInstruction() {
                if (this.busy) return;
                const text = String(this.draft || '').trim();
                if (!text) return;
                this.draft = '';
                this.$emit('instruct', {
                    instruction: text,
                    target: this.anchor ? Object.assign({}, this.anchor) : null
                });
            },
            clearAnchor() { this.anchor = null; }
        },
        template: `
            <div v-if="struct" class="nrv" :class="{ 'nrv-editable': canEdit }">
                <div v-if="struct.kind === 'table'" class="nrv-table-wrap">
                    <div v-if="struct.summary" class="nrv-summary">
                        <span v-for="(v, k) in struct.summary" :key="k" class="nrv-summary-item">{{ k }}: {{ v }}</span>
                    </div>
                    <table class="nrv-table">
                        <thead><tr><th v-for="c in struct.columns" :key="c">{{ c }}</th></tr></thead>
                        <tbody>
                            <tr v-for="(r, ri) in struct.rows" :key="ri">
                                <template v-for="c in struct.columns" :key="c">
                                    <td v-if="editCell && editCell.kind === 'table' && editCell.row === ri && editCell.column === c">
                                        <input class="nrv-edit-input" v-model="editValue"
                                               @keydown.enter.prevent="commitEdit" @keydown.esc="cancelEdit" @blur="commitEdit" />
                                    </td>
                                    <td v-else :data-edit="canEdit ? '1' : null" @click="cellClick('table', ri, c)">{{ r[c] }}</td>
                                </template>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-else-if="struct.kind === 'kv'" class="nrv-kv">
                    <div v-for="(p, pi) in struct.pairs" :key="p.k" class="nrv-kv-item">
                        <span class="nrv-kv-key">{{ p.k }}</span>
                        <span v-if="editCell && editCell.kind === 'kv' && editCell.index === pi" class="nrv-kv-val">
                            <input class="nrv-edit-input" v-model="editValue"
                                   @keydown.enter.prevent="commitEdit" @keydown.esc="cancelEdit" @blur="commitEdit" />
                        </span>
                        <span v-else class="nrv-kv-val" :data-edit="canEdit ? '1' : null" @click="cellClick('kv', pi, p.k)">{{ p.v }}</span>
                    </div>
                </div>
                <div v-if="instruct" class="nrv-instruct-wrap">
                    <span v-if="anchor" class="nrv-instruct-anchor">将作用于：{{ anchorText }}<button type="button" class="nrv-instruct-anchor-clear" @click="clearAnchor">改全文</button></span>
                    <input class="nrv-instruct" v-model="draft" :disabled="busy"
                           :placeholder="busy ? '处理中…' : '说一句怎么改（回车发送）'"
                           @keydown.enter.prevent="submitInstruction" />
                </div>
            </div>
        `
    };

    window.NuxResultView = NuxResultView;
})();
