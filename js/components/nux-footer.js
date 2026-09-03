(function() {
    const NuxFooter = {
        name: 'nux-footer',
        props: {
            appName: { type: String, default: '' },
            showIcp: { type: Boolean, default: true },
            icpNumber: { type: String, default: '浙ICP备2024109932号' },
            company: { type: String, default: '杭州子晨科技有限公司' },
            email: { type: String, default: 'songguokr@126.com' }
        },
        template: `
            <footer class="nux-footer">
                <span v-if="appName" class="nux-footer-brand">{{ appName }}</span>
                <div class="nux-footer-row">
                    <span class="nux-footer-copy">© {{ company }}</span>
                    <span class="nux-footer-sep">·</span>
                    <a v-if="showIcp" class="nux-footer-link" href="https://beian.miit.gov.cn" target="_blank" rel="noopener">{{ icpNumber }}</a>
                    <span class="nux-footer-sep">·</span>
                    <a class="nux-footer-link" :href="'mailto:' + email">{{ email }}</a>
                </div>
            </footer>
        `
    };
    window.NuxFooter = NuxFooter;
})();