(function () {
    const STYLE_ID = 'nux-interrupt-card-style';
    function ensureStyle() {
        window.NexusUtils && NexusUtils.injectStyle(STYLE_ID, `
.nc-it{background:var(--nx-bg-surface,#fff);border:1px solid var(--nx-border,rgba(0,0,0,.08));border-left:3px solid var(--nx-warning,#f59e0b);border-radius:var(--nx-radius-md,10px);padding:14px 16px;display:flex;flex-direction:column;gap:10px;max-width:min(560px,100%)}
.nc-it-head{display:flex;align-items:flex-start;gap:8px}
.nc-it-icon{color:var(--nx-warning,#f59e0b);flex-shrink:0;margin-top:1px}
.nc-it-title{font-size:14px;font-weight:600;color:var(--nx-text-heading,#0f172a)}
.nc-it-body{font-size:13px;color:var(--nx-text-body,#475569);line-height:1.6}
.nc-it-payload{font-size:12px;color:var(--nx-text-muted,#94a3b8);background:var(--nx-bg-tertiary,#f8fafc);border-radius:var(--nx-radius-sm,8px);padding:8px 10px;max-height:140px;overflow:auto;font-family:var(--nx-font-mono,SFMono-Regular,Menlo,monospace);white-space:pre-wrap;word-break:break-all}
.nc-it-edit textarea{border:1px solid var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-sm,8px);background:var(--nx-bg-surface,#fff);padding:8px 12px;font-size:13px;color:var(--nx-text-heading,#0f172a);width:100%;box-sizing:border-box;resize:vertical;min-height:56px}
.nc-it-edit textarea:focus{outline:none;border-color:var(--app-accent,#6366f1)}
.nc-it-actions{display:flex;gap:8px;flex-wrap:wrap}
.nc-it-btn{border-radius:var(--nx-radius-sm,8px);padding:8px 16px;font-size:13px;cursor:pointer;border:1px solid transparent;min-height:36px}
.nc-it-btn:disabled{opacity:.5;cursor:default}
.nc-it-btn.is-primary{background:var(--app-accent,#6366f1);color:var(--nx-text-on-accent,#fff);font-weight:600}
.nc-it-btn.is-primary:hover{background:var(--app-accent-hover,#4f46e5)}
.nc-it-btn.is-secondary{background:var(--nx-bg-surface,#fff);color:var(--nx-text-heading,#0f172a);border-color:var(--nx-border,rgba(0,0,0,.08))}
.nc-it-btn.is-secondary:hover{border-color:var(--nx-border-hover,rgba(0,0,0,.15))}
.nc-it-btn.is-danger{background:var(--nx-bg-surface,#fff);color:var(--nx-danger,#dc2626);border-color:var(--nx-border,rgba(0,0,0,.08))}
.nc-it-resolved{font-size:12px;color:var(--nx-text-muted,#94a3b8);display:inline-flex;align-items:center;gap:6px}
@media(hover:none) and (pointer:coarse){.nc-it-btn{min-height:44px}}
`);
    }
    ensureStyle();

    const ACTION_DEFAULTS = {
        approve: { label: '同意', tone: 'primary' },
        continue: { label: '继续', tone: 'primary' },
        reject: { label: '拒绝', tone: 'danger' },
        retry: { label: '重试', tone: 'secondary' },
        pause: { label: '暂停', tone: 'secondary' },
        edit: { label: '修改', tone: 'secondary' }
    };

    const NuxInterruptCard = {
        name: 'NuxInterruptCard',
        props: {
            title: { type: String, default: 'AI 请求确认' },
            body: { type: String, default: '' },
            payload: { type: [Object, String], default: null },
            actions: { type: Array, default: () => ['approve', 'reject'] },
            allowEdit: { type: Boolean, default: false },
            inputPlaceholder: { type: String, default: '补充说明…' },
            resolved: { type: [String, Boolean], default: false },
            disabled: { type: Boolean, default: false }
        },
        emits: ['action'],
        setup(props, ctx) {
            const { ref, computed } = Vue;
            const editing = ref(false);
            const draft = ref('');

            const payloadText = computed(() => {
                if (props.payload === null || props.payload === undefined) return '';
                if (typeof props.payload === 'string') return props.payload;
                try { return JSON.stringify(props.payload, null, 2); } catch (e) { return String(props.payload); }
            });

            const normActions = computed(() => (props.actions || []).map((a) => {
                const key = typeof a === 'string' ? a : (a.action || 'approve');
                const def = ACTION_DEFAULTS[key] || { label: key, tone: 'secondary' };
                return {
                    action: key,
                    label: (typeof a === 'object' && a.label) || def.label,
                    tone: (typeof a === 'object' && a.tone) || def.tone
                };
            }));

            function emitAction(action, extra) {
                if (props.disabled || props.resolved) return;
                ctx.emit('action', Object.assign({ action: action, input: '' }, extra || {}));
            }

            function onActionBtn(item) {
                if (item.action === 'edit' && props.allowEdit && !editing.value) {
                    editing.value = true;
                    return;
                }
                emitAction(item.action);
            }

            function confirmEdit() {
                const text = draft.value.trim();
                if (!text) return;
                editing.value = false;
                emitAction('edit', { input: text });
            }

            function cancelEdit() {
                editing.value = false;
                draft.value = '';
            }

            return { editing, draft, payloadText, normActions, onActionBtn, confirmEdit, cancelEdit };
        },
        template: `
<div class="nc-it" data-nux-interrupt role="group" :aria-label="title">
    <div class="nc-it-head">
        <svg class="nc-it-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 9v4"></path><path d="M12 17h.01"></path><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>
        <div class="nc-it-title">{{ title }}</div>
    </div>
    <div v-if="body" class="nc-it-body">{{ body }}</div>
    <div v-if="payloadText" class="nc-it-payload">{{ payloadText }}</div>
    <div v-if="editing" class="nc-it-edit">
        <textarea v-model="draft" :placeholder="inputPlaceholder" :aria-label="'修改内容'"></textarea>
        <div class="nc-it-actions">
            <button type="button" class="nc-it-btn is-primary" :disabled="!draft.trim()" @click="confirmEdit">确认修改</button>
            <button type="button" class="nc-it-btn is-secondary" @click="cancelEdit">取消</button>
        </div>
    </div>
    <template v-else>
        <div v-if="!resolved && normActions.length" class="nc-it-actions">
            <button v-for="item in normActions" :key="item.action" type="button"
                class="nc-it-btn" :class="'is-' + item.tone" :disabled="disabled"
                @click="onActionBtn(item)">{{ item.label }}</button>
        </div>
        <div v-if="resolved" class="nc-it-resolved">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>{{ resolved === true ? '已处理' : resolved }}</span>
        </div>
    </template>
</div>
`
    };

    window.NuxInterruptCard = NuxInterruptCard;
})();
