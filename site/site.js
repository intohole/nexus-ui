(function() {
  const THEMES = [
    { name: 'Nexus UI', cls: 'app-nexus-ui', color: '#3b82f6' },
    { name: '思悟笔记', cls: 'app-one-note', color: '#0d9488' },
    { name: 'VerseCraft', cls: 'app-verse-craft', color: '#e11d48' },
    { name: '宠康管家', cls: 'app-ai-pet', color: '#ea580c' },
    { name: '码趣星', cls: 'app-code-block', color: '#059669' },
    { name: '知路', cls: 'app-wisepath', color: '#ca8a04' },
    { name: 'GoldenStock', cls: 'app-golden', color: '#1d4ed8' },
    { name: 'Chroma', cls: 'app-chroma', color: '#c026d3' }
  ];

  const SiteTheme = {
    themes: THEMES,
    current: 'app-nexus-ui',
    set(cls) {
      document.body.classList.remove(...THEMES.map(t => t.cls));
      if (cls) document.body.classList.add(cls);
      this.current = cls || 'app-nexus-ui';
      try { localStorage.setItem('nexus-site-theme', this.current); } catch (e) {}
      document.querySelectorAll('.dial-dot').forEach(d => {
        d.classList.toggle('active', d.dataset.theme === this.current);
      });
    },
    restore() {
      let saved = '';
      try { saved = localStorage.getItem('nexus-site-theme') || ''; } catch (e) {}
      this.set(saved);
    }
  };
  window.SiteTheme = SiteTheme;

  const fallbackCopy = (txt, done) => {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
    done();
  };

  const copyText = (txt, btn) => {
    const done = () => {
      if (btn) {
        const t = btn.textContent;
        btn.textContent = '已复制';
        setTimeout(() => { btn.textContent = t; }, 1600);
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done).catch(() => fallbackCopy(txt, done));
    } else {
      fallbackCopy(txt, done);
    }
  };
  window.SiteCopy = copyText;

  const initReveal = () => {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      els.forEach(e => e.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(e => io.observe(e));
  };

  document.addEventListener('DOMContentLoaded', () => {
    SiteTheme.restore();
    initReveal();
  });
})();
