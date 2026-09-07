(function() {
    const NuxFooter = {
        name: 'nux-footer',
        props: {
            appName: { type: String, default: '' },
            showIcp: { type: Boolean, default: true },
            icpNumber: { type: String, default: '浙ICP备2024109932号' },
            company: { type: String, default: '杭州子晨科技有限公司' },
            email: { type: String, default: 'songguokr@126.com' },
            disclaimer: { type: String, default: '部分内容由 AI 生成，仅供参考，不构成任何专业建议或承诺。' },
            showAiBadge: { type: Boolean, default: false },
            showGongan: { type: Boolean, default: false },
            gonganNumber: { type: String, default: '' },
            gonganLink: { type: String, default: '' }
        },
        template: `
            <footer class="nux-footer">
                <span v-if="appName" class="nux-footer-brand">{{ appName }}</span>
                <div v-if="disclaimer" class="nux-footer-disclaimer">{{ disclaimer }}</div>
                <div class="nux-footer-row">
                    <span class="nux-footer-copy">© {{ company }}</span>
                    <span class="nux-footer-sep">·</span>
                    <span class="nux-footer-ai" v-if="showAiBadge" role="note"><span class="nx-ai-badge nx-ai-badge-md" data-tone="accent">AI 生成</span></span>
                    <span class="nux-footer-sep">·</span>
                    <a v-if="showGongan && gonganNumber" class="nux-footer-link" :href="gonganLink || ('https://beian.mps.gov.cn/#/query/webSearch?code=' + gonganNumber)" target="_blank" rel="noopener">公网安备{{ gonganNumber }}</a>
                    <span v-if="showGongan && gonganNumber" class="nux-footer-sep">·</span>
                    <a v-if="showIcp" class="nux-footer-link" href="https://beian.miit.gov.cn" target="_blank" rel="noopener">{{ icpNumber }}</a>
                    <span class="nux-footer-sep">·</span>
                    <a class="nux-footer-link" href="/nexus-ui/agreement.html" target="_blank" rel="noopener">用户协议</a>
                    <span class="nux-footer-sep">·</span>
                    <a class="nux-footer-link" href="/nexus-ui/privacy.html" target="_blank" rel="noopener">隐私政策</a>
                    <span v-if="email" class="nux-footer-sep">·</span>
                    <a v-if="email" class="nux-footer-link" :href="'mailto:' + email">{{ email }}</a>
                </div>
            </footer>
        `
    };
    window.NuxFooter = NuxFooter;
    (function autoMount() {
        var tries = 0;
        function mount() {
            const el = document.querySelector('nux-footer-placeholder');
            if (!el) {
                return;
            }
            if (!window.Vue) {
                if (tries < 50) {
                    tries++;
                    setTimeout(mount, 200);
                }
                return;
            }
            if (el.getAttribute('data-mounted') === 'yes') {
                return;
            }
            const appName = el.getAttribute('app-name') || '';
            const disclaimer = el.getAttribute('disclaimer') || '';
            const showAiBadge = el.getAttribute('show-ai-badge') === 'true';
            const showGongan = el.getAttribute('show-gongan') === 'true';
            const gonganNumber = el.getAttribute('gongan-number') || '';
            const gonganLink = el.getAttribute('gongan-link') || '';
            el.setAttribute('data-mounted', 'yes');
            const mounted = window.Vue.createApp({
                components: { NuxFooter },
                data() { return {
                    appName: appName, disclaimer: disclaimer, showAiBadge: showAiBadge,
                    showGongan: showGongan, gonganNumber: gonganNumber, gonganLink: gonganLink
                }; },
                template: '<nux-footer :app-name="appName" :disclaimer="disclaimer" :show-ai-badge="showAiBadge" :show-gongan="showGongan" :gongan-number="gonganNumber" :gongan-link="gonganLink"></nux-footer>'
            });
            mounted.mount(el);
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', mount);
        } else {
            mount();
        }
    })();
})();