(function() {
  const { createApp } = Vue;
  const T = window.SiteTheme;
  const cats = window.PG_CATS;
  const seen = {};

  const app = createApp({
    data() {
      return { cats, themes: T.themes, current: T.current, open: {} };
    },
    methods: {
      setTheme(cls) {
        T.set(cls);
        this.current = T.current;
      },
      toggleCode(d) {
        this.open[d.id] = !this.open[d.id];
      },
      copyCode(d, e) {
        window.SiteCopy(d.code, e.target);
      }
    }
  });

  [
    ['nux-button', 'NuxButton'],
    ['nux-input', 'NuxInput'],
    ['nux-textarea', 'NuxTextarea'],
    ['nux-select', 'NuxSelect'],
    ['nux-switch', 'NuxSwitch'],
    ['nux-checkbox', 'NuxCheckbox'],
    ['nux-search-box', 'NuxSearchBox'],
    ['nux-segmented', 'NuxSegmented'],
    ['nux-chip-group', 'NuxChipGroup'],
    ['nux-steps', 'NuxSteps'],
    ['nux-progress', 'NuxProgress'],
    ['nux-loading', 'NuxLoading'],
    ['nux-accordion', 'NuxAccordion'],
    ['nux-tab-group', 'NuxTabGroup'],
    ['nux-toast', 'NuxToast'],
    ['nux-modal', 'NuxModal'],
    ['nux-drawer', 'NuxDrawer'],
    ['nux-confirm', 'NuxConfirm'],
    ['nux-empty', 'NuxEmpty'],
    ['nux-skeleton', 'NuxSkeleton'],
    ['nux-stat-card', 'NuxStatCard'],
    ['nux-badge', 'NuxBadge'],
    ['nux-avatar', 'NuxAvatar'],
    ['nux-data-table', 'NuxDataTable'],
    ['nux-pagination', 'NuxPagination'],
    ['nux-calendar', 'NuxCalendar'],
    ['nux-ai-chat', 'NuxAiChat']
  ].forEach(([tag, name]) => {
    if (window[name]) app.component(tag, window[name]);
    else console.error('组件缺失:', name);
  });

  cats.forEach(cat => {
    cat.demos.forEach(d => {
      if (seen[d.id]) {
        console.error('demo id 重复:', d.id);
        return;
      }
      seen[d.id] = true;
      app.component('pg-' + d.id, {
        template: d.tpl,
        data: d.data,
        methods: d.methods,
        watch: d.watch,
        mounted: d.mounted,
        beforeUnmount: d.beforeUnmount
      });
    });
  });

  app.mount('#pg');
})();
