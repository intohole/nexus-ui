(function() {
    const NuxPortalFooter = {
        name: 'NuxPortalFooter',
        props: {
            name: { type: String, default: '' },
            slogan: { type: String, default: '' },
            year: { type: [String, Number], default: function() { return new Date().getFullYear(); } },
            company: { type: String, default: '杭州子晨科技有限公司' },
            showFeedback: { type: Boolean, default: true }
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
                    <a v-if="showFeedback" href="./feedback.html?h=6ef495a3e7" class="nux-portal-footer-link"><i class="fa fa-envelope"></i> 反馈建议</a>
                </div>
            </footer>
        `
    };
    window.NuxPortalFooter = NuxPortalFooter;
})();