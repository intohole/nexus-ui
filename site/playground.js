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

  if (window.NexusComponents) {
    window.NexusComponents.register(app);
  } else {
    console.error('NexusComponents 未加载');
  }

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
