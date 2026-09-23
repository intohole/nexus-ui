(function () {
    const STYLE_ID = 'nux-clarify-card-style';
    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
.nc-clarify{background:var(--nx-bg-surface,#fff);border:1px solid var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-md,10px);padding:14px 16px;display:flex;flex-direction:column;gap:14px;max-width:560px}
.nc-clarify-head{display:flex;align-items:center;gap:8px}
.nc-clarify-title{font-size:14px;font-weight:600;color:var(--nx-text-heading,#0f172a)}
.nc-q{display:flex;flex-direction:column;gap:8px}
.nc-qlabel{font-size:13px;font-weight:600;color:var(--nx-text-heading,#0f172a)}
.nc-qhint{font-weight:400;color:var(--nx-text-muted,#94a3b8)}
.nc-opts{display:flex;flex-wrap:wrap;gap:8px}
.nc-chip{border:1px solid var(--nx-border,rgba(0,0,0,.08));background:var(--nx-bg-surface,#fff);color:var(--nx-text-heading,#0f172a);border-radius:var(--nx-radius-full,999px);padding:6px 13px;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:border-color .15s,background .15s,color .15s}
.nc-chip:hover{border-color:var(--app-accent,#6366f1);color:var(--app-accent,#6366f1)}
.nc-chip[aria-pressed="true"]{border-color:var(--app-accent,#6366f1);background:rgba(var(--app-accent-rgb,99,102,241),.08);color:var(--app-accent,#6366f1)}
.nc-reco{font-size:11px;line-height:1;color:var(--app-accent,#6366f1);background:rgba(var(--app-accent-rgb,99,102,241),.12);border-radius:var(--nx-radius-full,999px);padding:2px 6px}
.nc-input{border:1px solid var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-sm,8px);background:var(--nx-bg-surface,#fff);padding:8px 12px;font-size:13px;color:var(--nx-text-heading,#0f172a);width:100%;box-sizing:border-box}
.nc-input::placeholder{color:var(--nx-text-muted,#94a3b8)}
.nc-input:focus{outline:none;border-color:var(--app-accent,#6366f1)}
.nc-actions{display:flex;gap:8px;align-items:center}
.nc-btn{border-radius:var(--nx-radius-sm,8px);padding:8px 16px;font-size:13px;cursor:pointer;border:1px solid transparent}
.nc-btn:disabled{opacity:.5;cursor:default}
.nc-primary{background:var(--app-accent,#6366f1);color:var(--nx-text-on-accent,#fff);font-weight:600}
.nc-skip{background:var(--nx-bg-surface,#fff);color:var(--nx-text-muted,#94a3b8);border-color:var(--nx-border,rgba(0,0,0,.08))}
.nc-skip:hover{color:var(--nx-text-heading,#0f172a);border-color:var(--nx-border-hover,rgba(0,0,0,.15))}
@media(hover:none) and (pointer:coarse){.nc-chip{min-height:44px}.nc-btn{min-height:44px}}
`;
        document.head.appendChild(style);
    }
    ensureStyle();

    const { reactive, computed } = Vue;

    function normalizeOptions(options) {
        return (options || []).map((opt) => {
            if (typeof opt === 'string') return { value: opt, label: opt, recommended: false };
            return { value: opt.value, label: opt.label || opt.value, recommended: !!opt.recommended };
        });
    }

    const NuxClarifyCard = {
        name: 'NuxClarifyCard',
        props: {
            questions: { type: Array, default: () => [] },
            message: { type: String, default: '先确认几个关键信息，结果会更贴合你的需求' },
            submitText: { type: String, default: '确认' },
            skipText: { type: String, default: '跳过，直接生成' },
            allowSkip: { type: Boolean, default: true },
            loading: { type: Boolean, default: false }
        },
        emits: ['submit', 'skip'],
        setup(props, ctx) {
            const norm = computed(() =>
                (props.questions || []).map((q) => ({
                    key: q.key,
                    question: q.question,
                    type: q.type === 'multiple' ? 'multiple' : 'single',
                    options: normalizeOptions(q.options),
                    allow_custom: q.allow_custom !== false,
                    max_select: q.max_select || 0,
                    required: q.required !== false,
                    placeholder: q.placeholder
                }))
            );
            const state = reactive({});
            norm.value.forEach((q) => {
                if (!state[q.key]) state[q.key] = { single: '', multiple: [], custom: '' };
                if (q.type === 'single' && !state[q.key].single) {
                    const reco = q.options.find((o) => o.recommended);
                    if (reco) state[q.key].single = reco.value;
                }
            });

            function isActive(q, value) {
                if (q.type === 'multiple') return state[q.key].multiple.indexOf(value) >= 0;
                return state[q.key].single === value;
            }

            function toggle(q, opt) {
                const s = state[q.key];
                if (q.type === 'multiple') {
                    const idx = s.multiple.indexOf(opt.value);
                    if (idx >= 0) {
                        s.multiple.splice(idx, 1);
                    } else {
                        if (!q.max_select || s.multiple.length < q.max_select) s.multiple.push(opt.value);
                    }
                } else {
                    s.single = s.single === opt.value ? '' : opt.value;
                    s.custom = '';
                }
            }

            const hasAnswer = computed(() =>
                props.questions.length > 0 && norm.value.every((q) => {
                    if (q.required) {
                        const s = state[q.key];
                        const chosen = q.type === 'multiple' ? s.multiple.length > 0 : !!s.single;
                        return chosen || !!s.custom.trim();
                    }
                    return true;
                })
            );

            function submit() {
                if (!hasAnswer.value || props.loading) return;
                const answers = {};
                norm.value.forEach((q) => {
                    const s = state[q.key];
                    const custom = s.custom.trim();
                    if (q.type === 'multiple') {
                        answers[q.key] = custom ? custom : s.multiple.slice();
                    } else {
                        answers[q.key] = custom || s.single || '';
                    }
                });
                ctx.emit('submit', answers);
            }

            function skip() {
                if (props.loading) return;
                ctx.emit('skip');
            }

            return { norm, state, isActive, toggle, submit, skip, hasAnswer };
        },
        template: `
<div class="nc-clarify" data-nux-clarify>
    <div class="nc-clarify-head">
        <div class="nc-clarify-title">{{ message }}</div>
    </div>
    <div v-for="q in norm" :key="q.key" class="nc-q">
        <div class="nc-qlabel">
            {{ q.question }}
            <span v-if="q.type === 'multiple'" class="nc-qhint">（可多选{{ q.max_select ? '，最多' + q.max_select + '项' : '' }}）</span>
        </div>
        <div class="nc-opts">
            <button v-for="(opt, idx) in q.options" :key="idx" type="button"
                class="nc-chip" :aria-pressed="isActive(q, opt.value)"
                @click="toggle(q, opt)">
                {{ opt.label }}
                <span v-if="opt.recommended" class="nc-reco">推荐</span>
            </button>
        </div>
        <input v-if="q.allow_custom" v-model="state[q.key].custom" class="nc-input"
            :placeholder="q.placeholder || '或输入你的要求…'" @keyup.enter="submit" />
    </div>
    <div class="nc-actions">
        <button type="button" class="nc-btn nc-primary" :disabled="!hasAnswer || loading" @click="submit">{{ submitText }}</button>
        <button v-if="allowSkip" type="button" class="nc-btn nc-skip" :disabled="loading" @click="skip">{{ skipText }}</button>
    </div>
</div>
`
    };

    window.NuxClarifyCard = NuxClarifyCard;
})();