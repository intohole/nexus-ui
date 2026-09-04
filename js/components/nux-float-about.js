(function() {
  if (window.NuxFloatAbout) return;
  function init() {
    var isMobile = window.matchMedia && window.matchMedia('(max-width:768px)').matches;
    var bottom = isMobile ? 'calc(76px + env(safe-area-inset-bottom, 0px))' : '80px';
    var accent = getComputedStyle(document.documentElement).getPropertyValue('--app-accent').trim() || '#0ea5e9';
    var btn = document.createElement('a');
    var aboutUrl = (function () {
      var src = ((document.currentScript && document.currentScript.src) || '').split('?')[0];
      var m = src.match(/^(.*)\/js\/components\/nux-float-about\.js$/);
      return (m ? m[1] : 'https://songguokr.com/nexus-ui/v2.10.64') + '/about.html';
    })();
    var prefix = (window.PATH_PREFIX || '').replace(/\/$/, '');
    btn.href = aboutUrl + '?app=' + encodeURIComponent(prefix);
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg><span style="margin-left:6px;font-size:13px;font-weight:500">关于</span>';
    btn.setAttribute('aria-label', '关于我们');
    btn.title = '关于我们';
    btn.style.cssText = 'position:fixed;right:20px;bottom:' + bottom + ';height:44px;padding:0 16px;border-radius:22px;background:' + accent + ';color:#fff;display:flex;align-items:center;justify-content:center;text-decoration:none;box-shadow:0 2px 12px rgba(0,0,0,0.15);z-index:50;opacity:.8;transition:all .2s;gap:0';
    btn.onmouseenter = function() { btn.style.opacity = '1'; btn.style.transform = 'scale(1.05)'; };
    btn.onmouseleave = function() { btn.style.opacity = '.8'; btn.style.transform = 'scale(1)'; };
    document.body.appendChild(btn);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.NuxFloatAbout = true;
})();