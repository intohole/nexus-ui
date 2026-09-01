(function() {
    const STYLE_ID = 'nux-agreement-modal-style';
    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
.nux-agreement-overlay{position:fixed;inset:0;background:var(--nx-overlay-bg,rgba(0,0,0,.5));display:flex;align-items:center;justify-content:center;z-index:var(--nux-agreement-z,3000);padding:16px}
.nux-agreement{background:var(--nx-bg-surface,#fff);border-radius:16px;width:100%;max-width:520px;max-height:86vh;display:flex;flex-direction:column;box-shadow:var(--nx-shadow-lg,0 8px 24px rgba(0,0,0,.12));overflow:hidden}
.nux-agreement-header{padding:20px 24px 0}
.nux-agreement-title{font-size:18px;font-weight:600;color:var(--nx-text-heading,#0f172a);margin:0 0 6px}
.nux-agreement-subtitle{font-size:13px;color:var(--nx-text-secondary,#64748b);margin:0;line-height:1.6}
.nux-agreement-body{flex:1;overflow-y:auto;padding:16px 24px;-webkit-overflow-scrolling:touch}
.nux-agreement-section h4{font-size:14px;font-weight:600;color:var(--nx-text-heading,#0f172a);margin:0 0 8px;display:flex;align-items:center;gap:8px}
.nux-agreement-section h4::before{content:'';display:inline-block;width:3px;height:14px;border-radius:2px;background:var(--nx-primary,var(--app-accent,#0ea5e9))}
.nux-agreement-section p{font-size:13px;color:var(--nx-text-body,#334155);line-height:1.8;margin:0;white-space:pre-line}
.nux-agreement-section+.nux-agreement-section{margin-top:20px}
.nux-agreement-footer{padding:16px 24px;border-top:1px solid var(--nx-border,rgba(0,0,0,.08))}
.nux-agreement-check{display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;margin-bottom:14px}
.nux-agreement-check input{width:16px;height:16px;accent-color:var(--nx-primary,var(--app-accent,#0ea5e9));cursor:pointer;flex-shrink:0}
.nux-agreement-check span{font-size:13px;color:var(--nx-text-body,#334155)}
.nux-agreement-actions{display:flex;gap:12px}
.nux-agreement-btn{flex:1;height:44px;border-radius:10px;font-size:15px;font-weight:500;border:none;cursor:pointer;transition:opacity .2s,transform .1s}
.nux-agreement-btn:active{transform:scale(.98)}
.nux-agreement-btn-primary{background:var(--nx-primary,var(--app-accent,#0ea5e9));color:var(--nx-text-on-accent,#fff)}
.nux-agreement-btn-primary:disabled{opacity:.45;cursor:not-allowed}
.nux-agreement-btn-ghost{background:var(--nx-bg-muted,#f1f5f9);color:var(--nx-text-secondary,#64748b)}
.nux-agreement-tip{font-size:12px;color:var(--nx-text-muted,#94a3b8);text-align:center;margin:10px 0 0}
.nux-agreement-loading{padding:48px 24px;text-align:center;font-size:14px;color:var(--nx-text-secondary,#64748b)}
@media (max-width:640px){.nux-agreement{max-height:92vh;border-radius:16px 16px 0 0;align-self:flex-end}.nux-agreement-overlay{padding:0;align-items:flex-end}}
.nux-agreement-fade-enter-active,.nux-agreement-fade-leave-active{transition:opacity .2s ease}
.nux-agreement-fade-enter-active .nux-agreement,.nux-agreement-fade-leave-active .nux-agreement{transition:transform .24s ease,opacity .2s ease}
.nux-agreement-fade-enter-from,.nux-agreement-fade-leave-to{opacity:0}
.nux-agreement-fade-enter-from .nux-agreement{transform:translateY(24px) scale(.98);opacity:0}
.nux-agreement-fade-leave-to .nux-agreement{transform:translateY(12px);opacity:0}
`;
        document.head.appendChild(style);
    }
    ensureStyle();

    const { ref, computed, onMounted } = Vue;

    const NuxAgreementModal = {
        name: 'NuxAgreementModal',
        props: {
            appName: { type: String, required: true },
            autoCheck: { type: Boolean, default: true },
            tip: { type: String, default: '同意后即可开始使用，您的数据始终归您所有' }
        },
        emits: ['accepted', 'declined'],
        setup(props, { emit }) {
            const visible = ref(false);
            const loading = ref(true);
            const agreed = ref(false);
            const submitting = ref(false);
            const meta = ref({ version: '', terms: '', privacy: '' });
            const storageKey = computed(() => 'nux_agreement_' + props.appName);
            const pendingKey = computed(() => 'nux_agreement_pending_' + props.appName);

            const readCache = () => {
                try { return JSON.parse(localStorage.getItem(storageKey.value) || 'null'); } catch (e) { return null; }
            };
            const writeCache = (version) => {
                try { localStorage.setItem(storageKey.value, JSON.stringify({ version, at: Date.now() })); } catch (e) {}
            };
            const takePending = () => {
                try {
                    if (localStorage.getItem(pendingKey.value) === '1') {
                        localStorage.removeItem(pendingKey.value);
                        return true;
                    }
                } catch (e) {}
                return false;
            };

            const acceptRemote = async (version) => {
                await window.NexusApi.post('/agreement/accept', { version });
                writeCache(version);
                emit('accepted');
            };

            const check = async () => {
                loading.value = true;
                try {
                    const res = await window.NexusApi.get('/agreement/current');
                    const data = res.data || res;
                    meta.value = data;
                    const cached = readCache();
                    if (cached && cached.version === data.version) return;
                    if (takePending()) {
                        try {
                            await acceptRemote(data.version);
                            return;
                        } catch (e) {}
                    }
                    const statusRes = await window.NexusApi.get('/agreement/status');
                    const status = statusRes.data || statusRes;
                    if (status.accepted) { writeCache(data.version); return; }
                    visible.value = true;
                } catch (e) {}
                finally { loading.value = false; }
            };

            const accept = async () => {
                if (!agreed.value || submitting.value) return;
                submitting.value = true;
                try {
                    await acceptRemote(meta.value.version);
                    visible.value = false;
                } catch (e) {}
                finally { submitting.value = false; }
            };

            const decline = () => {
                visible.value = false;
                emit('declined');
            };

            if (props.autoCheck) {
                onMounted(() => {
                    if (!window.NexusApi) return;
                    const token = localStorage.getItem('uc_access_token') || '';
                    if (!token) { loading.value = false; return; }
                    check();
                });
            }

            return { visible, loading, agreed, submitting, meta, check, accept, decline };
        },
        template: `
            <teleport to="body">
                <transition name="nux-agreement-fade">
                    <div v-if="visible" class="nux-agreement-overlay">
                        <div class="nux-agreement" role="dialog" aria-modal="true">
                            <div class="nux-agreement-header">
                                <h3 class="nux-agreement-title">服务协议与隐私保护</h3>
                                <p class="nux-agreement-subtitle">请阅读并同意以下内容后继续使用</p>
                            </div>
                            <div class="nux-agreement-body">
                                <div v-if="loading" class="nux-agreement-loading">加载中…</div>
                                <template v-else>
                                    <div class="nux-agreement-section">
                                        <h4>用户协议</h4>
                                        <p>{{ meta.terms }}</p>
                                    </div>
                                    <div class="nux-agreement-section">
                                        <h4>隐私政策</h4>
                                        <p>{{ meta.privacy }}</p>
                                    </div>
                                </template>
                            </div>
                            <div class="nux-agreement-footer">
                                <label class="nux-agreement-check">
                                    <input type="checkbox" v-model="agreed">
                                    <span>我已阅读并同意用户协议和隐私政策</span>
                                </label>
                                <div class="nux-agreement-actions">
                                    <button class="nux-agreement-btn nux-agreement-btn-ghost" @click="decline">暂不同意</button>
                                    <button class="nux-agreement-btn nux-agreement-btn-primary" :disabled="!agreed || submitting" @click="accept">{{ submitting ? '提交中…' : '同意并继续' }}</button>
                                </div>
                                <p class="nux-agreement-tip">{{ tip }}</p>
                            </div>
                        </div>
                    </div>
                </transition>
            </teleport>
        `
    };

    window.NuxAgreementModal = NuxAgreementModal;
})();
