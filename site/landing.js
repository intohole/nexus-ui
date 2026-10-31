(function() {
  const { createApp } = Vue;
  const T = window.SiteTheme;
  const NX_VERSION_RE = /\/nexus-ui\/v(\d+\.\d+\.\d+)\//;

  const detectVersion = () => {
    const nodes = document.querySelectorAll('script[src],link[href]');
    for (const node of nodes) {
      const url = node.getAttribute('src') || node.getAttribute('href') || '';
      const m = url.match(NX_VERSION_RE);
      if (m) return 'v' + m[1];
    }
    return '';
  };

  const compTotal = (window.NexusComponents && NexusComponents.list().length) || 0;
  const themeTotal = 27;

  const app = createApp({
    data() {
      return {
        themes: T.themes,
        current: T.current,
        version: detectVersion(),
        compTotal,
        themeTotal,
        notify: true,
        seg: 'day',
        segs: [
          { label: '今日', value: 'day' },
          { label: '本周', value: 'week' },
          { label: '本月', value: 'month' }
        ],
        pct: 24,
        chips: ['设计系统', '移动端'],
        chipOpts: [
          { label: '设计系统', value: '设计系统' },
          { label: '移动端', value: '移动端' },
          { label: '零构建', value: '零构建' }
        ],
        busy: false,
        quickCode: [
          '<link rel="stylesheet" href="https://songguokr.com/nexus-ui/v2.78.0/css/nexus-all.css">',
          '<script src="https://songguokr.com/nexus-ui/v2.78.0/vendor/vue.global.prod.js"><\/script>',
          '<script src="https://songguokr.com/nexus-ui/v2.78.0/js/nexus-all.js"><\/script>',
          '<script src="https://songguokr.com/nexus-ui/v2.78.0/js/components/nux-button.js"><\/script>',
          '<script>NexusComponents.register(app)<\/script>'
        ],
        compCats: [
          { name: '基础控件', count: 12, items: ['nux-button', 'nux-input', 'nux-textarea', 'nux-select', 'nux-input-number', 'nux-switch', 'nux-checkbox', 'nux-search-box', 'nux-segmented', 'nux-chip-group', 'nux-form-group', 'nux-file-upload'] },
          { name: '反馈状态', count: 7, items: ['nux-modal', 'nux-drawer', 'nux-empty-state', 'nux-error-state', 'nux-skeleton', 'nux-loading', 'nux-undo-toast'] },
          { name: '数据展示', count: 12, items: ['nux-stat-card', 'nux-tag', 'nux-avatar', 'nux-progress', 'nux-calendar', 'nux-checkin', 'nux-poster', 'nux-pagination', 'nux-result-view', 'nux-conversation-list', 'nux-icon', 'nux-selection-bar'] },
          { name: '导航布局', count: 11, items: ['nux-tab-group', 'nux-accordion', 'nux-section', 'nux-backtop', 'nux-layout-sidebar', 'nux-layout-topnav', 'nux-bottom-nav', 'nux-app-switcher', 'nux-side-panel', 'nux-settings-drawer', 'nux-theme-toggle'] },
          { name: 'AI 能力', count: 9, items: ['nux-ai-chat', 'nux-ai-badge', 'nux-ai-indicator', 'nux-ai-notice', 'nux-ai-task-progress', 'nux-ai-widgets', 'nux-clarify-card', 'nux-voice-input', 'nux-camera-recognize'] },
          { name: '业务套件', count: 13, items: ['nux-login-page', 'nux-forgot-password', 'nux-about-page', 'nux-notification-bell', 'nux-notification-panel', 'nux-menu-user', 'nux-menu-about', 'nux-footer', 'nux-onboarding', 'nux-onboarding-strip', 'nux-automation', 'nux-app-card', 'nux-swipe-actions'] },
          { name: '全局能力', count: 'JS', items: ['showToast / nuxConfirm / nuxPrompt', 'NexusApi 重试/超时/401', 'NexusMarkdown 安全渲染', 'NexusChat 流式工具集', 'NexusStructured 结构化渲染', 'NexusStream SSE 流', 'NexusCrud CRUD 工厂', 'NexusValidators 校验器', 'use-mobile / use-theme / use-recent'] }
        ],
        apps: ['思悟笔记', 'VerseCraft', 'ResumeAI', '宠康管家', '码趣星', '天才学伴', '知路', 'BeeMemory', 'GoldenStock', 'FinancialKG', 'Prompt工坊', '妙笔']
      };
    },
    methods: {
      setTheme(cls) {
        T.set(cls);
        this.current = T.current;
      },
      poke() {
        this.busy = true;
        setTimeout(() => {
          this.busy = false;
          if (window.showToast) window.showToast('这就是一次真实的组件交互', 'success');
        }, 900);
      },
      copyQuick(e) {
        window.SiteCopy(this.quickCode.join('\n'), e.target);
      }
    },
    mounted() {
      const desc = document.querySelector('meta[name="description"]');
      if (desc) {
        desc.setAttribute('content', 'Nexus UI 是一套开源的 Vue 3 CDN 设计系统：' + this.compTotal + ' 个组件、' + this.themeTotal + ' 套应用主题、移动端适配内置，两行代码引入即用，零构建。');
      }
      setInterval(() => {
        this.pct = this.pct >= 96 ? 24 : this.pct + 12;
      }, 2200);
    }
  });

  [
    ['nux-button', 'NuxButton'],
    ['nux-switch', 'NuxSwitch'],
    ['nux-segmented', 'NuxSegmented'],
    ['nux-chip-group', 'NuxChipGroup'],
    ['nux-progress', 'NuxProgress'],
    ['nux-stat-card', 'NuxStatCard'],
    ['nux-app-card', 'NuxAppCard']
  ].forEach(([tag, name]) => {
    if (window[name]) app.component(tag, window[name]);
  });

  app.mount('#app');
})();
