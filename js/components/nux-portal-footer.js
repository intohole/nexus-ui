(function() {
    const NuxPortalFooter = {
        name: 'NuxPortalFooter',
        props: {
            name: { type: String, default: '' },
            slogan: { type: String, default: '' },
            year: { type: [String, Number], default: function() { return new Date().getFullYear(); } },
            company: { type: String, default: '杭州子晨科技有限公司' },
            feedbackUrl: { type: String, default: '' }
        },
        template: `
            <footer class="nux-portal-footer">
                <div class="nux-portal-footer-inner">
                    <div class="nux-portal-footer-brand">
                        <div class="nux-portal-footer-logo"><img src="/static/img/logo.svg" alt="松果氪"></div>
                        <span class="nux-portal-footer-name">{{ name }}</span>
                    </div>
                    <span class="nux-portal-footer-copy">&copy; {{ year }} {{ company }}<template v-if="name">&nbsp;·&nbsp;{{ name }}</template><template v-if="slogan"> · {{ slogan }}</template></span>
                    <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" class="nux-portal-footer-link">浙ICP备2024109932号</a>
                    <a href="/nexus-ui/about.html" target="_blank" rel="noopener" class="nux-portal-footer-link">关于我们</a>
                    <a href="/nexus-ui/agreement.html" target="_blank" rel="noopener" class="nux-portal-footer-link">用户协议</a>
                    <a href="/nexus-ui/privacy.html" target="_blank" rel="noopener" class="nux-portal-footer-link">隐私政策</a>
                    <a v-if="feedbackUrl" :href="feedbackUrl" class="nux-portal-footer-link"><svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" style="vertical-align:-2px"><path d="M3 5h18v14H3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 7l9 6 9-6" fill="none" stroke="currentColor" stroke-width="2"/></svg> 反馈建议</a>
                </div>
            </footer>
        `
    };
    window.NuxPortalFooter = NuxPortalFooter;
})();