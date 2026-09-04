(function() {
  const { createApp } = Vue;
  const T = window.SiteTheme;

  const app = createApp({
    data() {
      return {
        themes: T.themes,
        current: T.current,
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
          '<link rel="stylesheet" href="https://songguokr.com/nexus-ui/v2.10.63/css/nexus-all.css">',
          '<script src="https://songguokr.com/nexus-ui/v2.10.63/vendor/vue.global.prod.js"><\/script>',
          '<script src="https://songguokr.com/nexus-ui/v2.10.63/js/nexus-all.js"><\/script>',
          '<script src="https://songguokr.com/nexus-ui/v2.10.63/js/components/nux-button.js"><\/script>'
        ],
        compCats: [
          { name: '基础控件', count: 10, items: ['nux-button', 'nux-input', 'nux-textarea', 'nux-select', 'nux-switch', 'nux-checkbox', 'nux-search-box', 'nux-segmented', 'nux-chip-group', 'nux-form-group'] },
          { name: '反馈状态', count: 9, items: ['nux-toast', 'nux-modal', 'nux-drawer', 'nux-confirm', 'nux-empty', 'nux-error-state', 'nux-skeleton', 'nux-loading', 'nux-undo-toast'] },
          { name: '数据展示', count: 11, items: ['nux-stat-card', 'nux-badge', 'nux-avatar', 'nux-data-table', 'nux-pagination', 'nux-calendar', 'nux-breadcrumb', 'nux-progress', 'nux-steps', 'nux-radar-chart', 'nux-checkin'] },
          { name: '导航布局', count: 9, items: ['nux-tab-group', 'nux-accordion', 'nux-grid', 'nux-section', 'nux-backtop', 'nux-layout-sidebar', 'nux-layout-topnav', 'nux-bottom-nav', 'nux-app-switcher'] },
          { name: 'AI 对话', count: 5, items: ['nux-ai-chat', 'nux-conversation-list', 'nux-history-list', 'nux-clarify-card', 'NexusMarkdown 渲染引擎'] },
          { name: '业务套件', count: 11, items: ['nux-login-page', 'nux-register-page', 'nux-forgot-password', 'nux-user-center', 'nux-about-page', 'nux-agreement-modal', 'nux-float-user-center', 'nux-float-about', 'nux-notification-bell', 'nux-notification-panel', 'nux-selection-bar'] },
          { name: '基础能力 JS', count: 13, items: ['nexus-api 重试/超时/401', 'nexus-api-error 中文翻译', 'nexus-markdown 安全渲染', 'nexus-chat 流式工具集', 'nexus-store 持久化状态', 'nexus-crud CRUD 工厂', 'nexus-validators 校验器', '13 个 use-* Composables'] }
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
    ['nux-stat-card', 'NuxStatCard']
  ].forEach(([tag, name]) => {
    if (window[name]) app.component(tag, window[name]);
  });

  app.mount('#app');
})();
