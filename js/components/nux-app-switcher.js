(function() {
    if (window.NuxAppSwitcher) return;
    if (!window.Vue) return;

    var CSS = [
        '.nux-app-switcher,.nxs-root{all:initial;font-family:var(--nx-font-sans,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif);color:var(--nx-text-body,#334155)}',
        '.nxs-trigger{position:fixed;left:var(--nxs-left,18px);bottom:18px;z-index:2147483001;display:flex;align-items:center;gap:9px;height:46px;padding:0 18px;border-radius:var(--nx-radius-full,999px);background:var(--nx-bg-surface,#fff);backdrop-filter:blur(14px);border:1px solid var(--nx-border-accent,rgba(99,102,241,.3));box-shadow:var(--nx-shadow-md,0 4px 12px rgba(0,0,0,.1));color:var(--nx-text-heading,#0f172a);cursor:pointer;transition:transform .25s cubic-bezier(.4,0,.2,1),border-color .25s,box-shadow .25s;-webkit-tap-highlight-color:transparent}',
        '.nxs-trigger:hover{transform:translateY(-2px);border-color:var(--app-accent,#6366f1);box-shadow:var(--nx-shadow-lg,0 8px 24px rgba(0,0,0,.12)),var(--nx-shadow-glow,0 0 20px rgba(99,102,241,.15))}',
        '.nxs-trigger:active{transform:translateY(0)}',
        '.nxs-trigger-glyph{width:20px;height:20px;flex:none;color:var(--nx-text-muted,#94a3b8)}',
        '.nxs-trigger-glyph rect{fill:currentColor}',
        '.nxs-trigger-glyph .g-acc{fill:var(--app-accent,#6366f1)}',
        '.nxs-trigger-label{font-size:14px;font-weight:600;letter-spacing:.5px;white-space:nowrap}',
        '.nxs-trigger-dot{width:6px;height:6px;border-radius:50%;background:var(--app-accent,#6366f1);box-shadow:0 0 8px var(--app-accent,#6366f1)}',
        '.nxs-overlay{position:fixed;inset:0;z-index:2147483000;background:var(--nx-overlay-bg,rgba(0,0,0,.5));backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;animation:nxsFade .2s ease}',
        '.nxs-panel{position:relative;width:min(920px,calc(100vw - 28px));max-height:min(84dvh,84vh);display:flex;flex-direction:column;border-radius:var(--nx-radius-xl,22px);overflow:hidden;background:var(--nx-glass-bg,rgba(255,255,255,.86));backdrop-filter:blur(var(--nx-glass-blur,16px));border:1px solid var(--nx-glass-border,rgba(0,0,0,.06));box-shadow:var(--nx-shadow-lg,0 8px 24px rgba(0,0,0,.12));animation:nxsPop .22s cubic-bezier(.34,1.3,.5,1)}',
        '.nxs-panel:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(620px 220px at 18% -8%,rgba(var(--app-accent-rgb,99,102,241),.12),transparent 62%)}',
        '.nxs-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 12px}',
        '.nxs-brand{display:flex;align-items:center;gap:11px;cursor:pointer}',
        '.nxs-brand-logo{width:34px;height:34px;border-radius:var(--nx-radius-md,10px);display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--app-accent,#6366f1),var(--app-accent-hover,#818cf8));font-size:16px;font-weight:800;color:var(--nx-text-on-accent,#fff);box-shadow:var(--nx-shadow-glow,0 0 20px rgba(99,102,241,.15))}',
        '.nxs-brand-t{display:flex;flex-direction:column;line-height:1.15}',
        '.nxs-brand-name{font-size:16px;font-weight:700;color:var(--nx-text-heading,#0f172a);letter-spacing:.3px}',
        '.nxs-brand-sub{font-size:12px;color:var(--nx-text-secondary,#64748b)}',
        '.nxs-close{width:34px;height:34px;border-radius:var(--nx-radius-md,10px);border:1px solid transparent;background:transparent;color:var(--nx-text-secondary,#64748b);font-size:19px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s,color .2s}',
        '.nxs-close:hover{background:var(--nx-bg-hover,#f1f5f9);color:var(--nx-text-heading,#0f172a)}',
        '.nxs-search{margin:2px 20px 12px;display:flex;align-items:center;gap:10px;height:42px;padding:0 14px;border-radius:var(--nx-radius-md,12px);background:var(--nx-bg-muted,#f1f5f9);border:1px solid var(--nx-border,rgba(0,0,0,.08))}',
        '.nxs-search:focus-within{border-color:var(--app-accent,#6366f1);box-shadow:0 0 0 3px rgba(var(--app-accent-rgb,99,102,241),.15)}',
        '.nxs-search-svg{width:17px;height:17px;flex:none;opacity:.8;color:var(--nx-text-secondary,#64748b)}',
        '.nxs-search input{flex:1;min-width:0;background:transparent;border:none;outline:none;color:var(--nx-text-heading,#0f172a);font-size:14px}',
        '.nxs-search input::placeholder{color:var(--nx-text-muted,#94a3b8)}',
        '.nxs-portal{display:flex;align-items:center;justify-content:space-between;margin:0 20px 4px;padding:11px 14px;border-radius:var(--nx-radius-md,13px);background:rgba(var(--app-accent-rgb,99,102,241),.08);border:1px solid var(--nx-border-accent,rgba(99,102,241,.3));color:var(--app-accent,#6366f1);font-size:14px;font-weight:600;text-decoration:none;transition:background .2s,border-color .2s}',
        '.nxs-portal:hover{background:rgba(var(--app-accent-rgb,99,102,241),.14);border-color:var(--app-accent,#6366f1)}',
        '.nxs-portal-arr{font-size:15px}',
        '.nxs-body{overflow-y:auto;padding:4px 20px 20px;scrollbar-width:thin;scrollbar-color:var(--nx-border-hover,rgba(0,0,0,.15)) transparent;margin:14px 0 0}',
        '.nxs-body::-webkit-scrollbar{width:8px}.nxs-body::-webkit-scrollbar-thumb{background:var(--nx-border-hover,rgba(0,0,0,.15));border-radius:8px}',
        '.nxs-skels{display:grid;grid-template-columns:repeat(auto-fill,minmax(206px,1fr));gap:10px}',
        '.nxs-skel{height:64px;border-radius:var(--nx-radius-lg,14px);background:var(--nx-bg-muted,#f1f5f9);animation:nxsSh 1.2s infinite}',
        '@keyframes nxsSh{0%,100%{opacity:.5}50%{opacity:1}}',
        '.nxs-group{margin-top:16px}',
        '.nxs-group-title{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:var(--nx-text-secondary,#64748b);letter-spacing:.3px;margin-bottom:10px}',
        '.nxs-group-title i{width:5px;height:5px;border-radius:50%;background:var(--app-accent,#6366f1)}',
        '.nxs-group-count{margin-left:auto;font-weight:500;color:var(--nx-text-muted,#94a3b8);font-size:12px}',
        '.nxs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:10px}',
        '.nxs-tile{display:flex;align-items:center;gap:11px;min-width:0;padding:12px;border-radius:var(--nx-radius-lg,14px);background:var(--nx-bg-surface,#fff);border:1px solid var(--nx-border,rgba(0,0,0,.08));text-decoration:none;transition:background .2s,border-color .2s,transform .2s}',
        '.nxs-tile:hover{background:var(--nx-bg-hover,#f1f5f9);border-color:var(--app-accent,#6366f1);transform:translateY(-2px)}',
        '.nxs-tile.cur{border-color:var(--app-accent,#6366f1);background:rgba(var(--app-accent-rgb,99,102,241),.08)}',
        '.nxs-tile-icon{width:40px;height:40px;flex:none;border-radius:var(--nx-radius-md,11px);overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:var(--nx-text-secondary,#64748b);background:var(--nx-bg-muted,#f1f5f9);border:1px solid var(--nx-border,rgba(0,0,0,.08))}',
        '.nxs-tile.cur .nxs-tile-icon{color:var(--app-accent,#6366f1);background:rgba(var(--app-accent-rgb,99,102,241),.1);border-color:var(--nx-border-accent,rgba(99,102,241,.3))}',
        '.nxs-tile-icon img{width:100%;height:100%;object-fit:contain}',
        '.nxs-tile-m{min-width:0;display:flex;flex-direction:column;gap:2px}',
        '.nxs-tile-name{font-size:14px;font-weight:600;color:var(--nx-text-heading,#0f172a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
        '.nxs-tile-desc{max-width:100%;font-size:12px;line-height:1.35;color:var(--nx-text-secondary,#64748b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
        '.nxs-tile-cur{color:var(--app-accent,#6366f1);margin-left:6px;font-size:11px;font-weight:500}',
        '.nxs-empty{margin:26px 0;text-align:center;color:var(--nx-text-secondary,#64748b);font-size:14px}',
        '@keyframes nxsFade{from{opacity:0}to{opacity:1}}',
        '@keyframes nxsPop{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}',
        '@media(max-width:768px){body:has(.nux-layout-bottom-nav) .nxs-trigger,body:has(.nx-mobile-tabbar) .nxs-trigger{bottom:calc(74px + env(safe-area-inset-bottom))}}',
        '@media(max-width:640px){',
        '.nxs-overlay{align-items:flex-end}',
        '.nxs-panel{width:100%;max-height:92dvh;border-radius:var(--nx-radius-xl,22px) var(--nx-radius-xl,22px) 0 0;padding-bottom:env(safe-area-inset-bottom);animation:nxsUp .25s cubic-bezier(.34,1.2,.5,1)}',
        '.nxs-trigger{left:var(--nxs-left,14px);bottom:calc(14px + env(safe-area-inset-bottom))}',
        '.nxs-trigger-label{display:none}',
        '.nxs-grid{grid-template-columns:repeat(2,1fr);gap:8px}',
        '.nxs-close{width:44px;height:44px}',
        '@keyframes nxsUp{from{transform:translateY(40px);opacity:.6}to{transform:none;opacity:1}}',
        '}'
    ].join('');

    var _cfg = readConfig();
    var _apps = [];
    var _err = '';
    var _rootApp = null;

    function readConfig() {
        var g = window.nuxAppSwitcherConfig || {};
        var s = document.currentScript;
        var end = g.end || '';
        return {
            end: end,
            registryUrl: g.registryUrl || (s && s.getAttribute('data-registry-url')) || '/api/portal/apps',
            registryData: g.registryData || null,
            brandName: g.brandName || '松果氪',
            brandTagline: g.brandTagline || (end === 'biz' ? '让商业决策，有据可依' : '把想做的事，交给 AI'),
            portalUrl: g.portalUrl || '/',
            portalAction: g.portalAction || (end === 'biz' ? '回到商业工具库' : '回到松果氪 · 全部应用')
        };
    }

    function injectCss() {
        if (!document.getElementById('nux-app-switcher-css')) {
            var st = document.createElement('style');
            st.id = 'nux-app-switcher-css';
            st.textContent = CSS;
            document.head.appendChild(st);
        }
    }

    function keepApp(a) {
        if (!a || !a.url || !a.name || a.is_dev) return false;
        if (_cfg.end === 'biz') {
            return (a.app_group || '').indexOf('商业端') !== -1;
        }
        return a.is_public === true;
    }

    function effectiveRegistryUrl() {
        var u = _cfg.registryUrl;
        if (_cfg.end && u.indexOf('end=') === -1) {
            u += (u.indexOf('?') >= 0 ? '&' : '?') + 'end=' + encodeURIComponent(_cfg.end);
        }
        return u;
    }

    function loadApps() {
        if (_cfg.registryData) {
            _apps = _cfg.registryData.filter(keepApp);
            return Promise.resolve();
        }
        var url = /^https?:\/\//i.test(effectiveRegistryUrl())
            ? effectiveRegistryUrl()
            : location.origin + ( effectiveRegistryUrl().charAt(0) === '/' ? '' : '/' ) + effectiveRegistryUrl();
        return fetch(url, { headers: { 'Accept': 'application/json' } })
            .then(function(r) { if (!r.ok) throw new Error('bad'); return r.json(); })
            .then(function(d) { _apps = ((d && d.apps) || []).filter(keepApp); })
            .catch(function(e) { _err = '暂时无法加载应用清单'; _apps = []; });
    }

    function groupOf(a) {
        if (_cfg.end === 'biz') return '商业工具库';
        var s = (a.scene_name || '').trim();
        if (s) return s;
        var g = (a.app_group || '').split(',')[0].trim();
        return g || '其他应用';
    }

    function loadScenes() {
        if (_cfg.registryData) return Promise.resolve([]);
        var url = location.origin + '/api/portal/scenes';
        return fetch(url, { headers: { 'Accept': 'application/json' } })
            .then(function(r) { if (!r.ok) throw new Error('bad'); return r.json(); })
            .then(function(d) { return (d && d.scenes) || []; })
            .catch(function() { return []; });
    }

    function recentNames() {
        if (window.NexusUseRecent) return window.NexusUseRecent.recents(8);
        var raw = '';
        try { raw = localStorage.getItem('nxs-app-switcher-recents') || ''; } catch (e) {}
        if (!raw) return [];
        try { var arr = JSON.parse(raw); return Array.isArray(arr) ? arr.map(function (r) { return r.name; }) : []; } catch (e) { return []; }
    }

    function touch(name) {
        if (window.NexusUseRecent) { window.NexusUseRecent.recordVisit(name); return; }
        var list = recentRaw();
        list = list.filter(function (r) { return r.name !== name; });
        list.unshift({ name: name, at: Date.now() });
        try { localStorage.setItem('nxs-app-switcher-recents', JSON.stringify(list.slice(0, 8))); } catch (e) {}
    }

    function recentRaw() {
        var raw = '';
        try { raw = localStorage.getItem('nxs-app-switcher-recents') || ''; } catch (e) {}
        if (!raw) return [];
        try { var arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch (e) { return []; }
    }

    function isCurrent(a) {
        var p = a.path_prefix || '';
        return !!p && location.pathname.indexOf(p) === 0;
    }

    var magic = '<svg class="nxs-trigger-glyph" viewBox="0 0 20 20" fill="none"><rect class="g-acc" x="2.2" y="2.2" width="6.4" height="6.4" rx="1.8"/><rect x="11.4" y="2.2" width="6.4" height="6.4" rx="1.8"/><rect x="2.2" y="11.4" width="6.4" height="6.4" rx="1.8"/><rect x="11.4" y="11.4" width="6.4" height="6.4" rx="1.8" opacity=".85"/></svg>';
    var searchSvg = '<svg class="nxs-search-svg" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="5.4" stroke="currentColor" stroke-width="1.7"/><path d="M12.2 12.2L16 16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

    var Root = {
        name: 'NuxAppSwitcher',
        data: function() { return { open: false, q: '', apps: [], sceneOrder: [], loading: true, err: _err }; },
        computed: {
            cfg() { return _cfg; },
            brandFirst() { return (_cfg.brandName || '松').charAt(0); },
            groups() {
                var recentsArr = recentNames().map(function (name) {
                    for (var i = 0; i < this.apps.length; i++) if (this.apps[i].name === name) return this.apps[i];
                }.bind(this)).filter(Boolean);
                var map = {};
                this.apps.forEach(function(a) {
                    var g = groupOf(a);
                    (map[g] = map[g] || []).push(a);
                });
                var out = [];
                if (recentsArr.length && recentsArr.length < this.apps.length) out.push({ name: '最近使用', apps: recentsArr });
                var pushed = {};
                this.sceneOrder.forEach(function(s) {
                    if (s.id === 'all') return;
                    if (map[s.name] && map[s.name].length) {
                        out.push({ name: s.name, apps: map[s.name] });
                        pushed[s.name] = true;
                    }
                });
                Object.keys(map).forEach(function(k) { if (!pushed[k]) out.push({ name: k, apps: map[k] }); });
                return out;
            },
            viewGroups() {
                var qv = this.q.trim().toLowerCase();
                if (!qv) return this.groups;
                var flat = this.apps.filter(function(a) {
                    return (a.display_name || '').toLowerCase().indexOf(qv) !== -1 ||
                           (a.description || '').toLowerCase().indexOf(qv) !== -1 ||
                           ((a.scene_name || '') + ' ' + (a.tags || []).join(' ')).toLowerCase().indexOf(qv) !== -1;
                });
                return [{ name: '搜索结果', apps: flat }];
            }
        },
        mounted() {
            var self = this;
            _rootRef = this;
            loadApps().then(function() {
                self.apps = _apps; self.loading = false; self.err = _err;
            });
            loadScenes().then(function(list) { self.sceneOrder = list; });
            document.addEventListener('keydown', function(e) { if (e.key === 'Escape') self.open = false; });
            this.syncSideOffset();
            window.addEventListener('resize', function() { self.syncSideOffset(); });
            if (!document.querySelector('.nxsp')) {
                var mo = new MutationObserver(function() {
                    if (document.querySelector('.nxsp')) { self.syncSideOffset(); mo.disconnect(); }
                });
                mo.observe(document.documentElement, { childList: true, subtree: true });
            }
        },
        methods: {
            syncSideOffset() {
                var self = this;
                var apply = function() {
                    var panel = document.querySelector('.nxsp:not(.is-compact)');
                    var trigger = self.$el && self.$el.querySelector('.nxs-trigger');
                    if (!trigger) return;
                    var w = panel ? Math.round(panel.getBoundingClientRect().width) : 0;
                    trigger.style.left = w > 0 ? Math.min(w + 18, Math.max(0, window.innerWidth - 220)) + 'px' : '';
                };
                if (window.requestAnimationFrame) window.requestAnimationFrame(apply);
                apply();
            },
            toggle() { this.open = !this.open; },
            openIt() { this.open = true; },
            closeIt() { this.open = false; },
            goPortal() { this.open = false; window.location.href = _cfg.portalUrl; },
            openApp(a) {
                touch(a.name);
                this.open = false;
                window.location.href = a.url;
            },
            isCurrent: isCurrent
        },
        template: ['<div class="nux-app-switcher nxs-root">',
            '<button class="nxs-trigger" :aria-label="cfg.brandName+\'工具箱\'" @click="toggle">' + magic,
            '<span class="nxs-trigger-label">{{cfg.brandName}}</span><span class="nxs-trigger-dot"></span></button>',
            '<div v-if="open" class="nxs-overlay" @click.self="closeIt">',
            '<div class="nxs-panel" role="dialog" aria-label="应用切换器">',
            '<div class="nxs-head">',
            '<div class="nxs-brand" @click="goPortal"><span class="nxs-brand-logo">{{brandFirst}}</span>',
            '<span class="nxs-brand-t"><span class="nxs-brand-name">{{cfg.brandName}}</span><span class="nxs-brand-sub">{{cfg.brandTagline}}</span></span></div>',
            '<button class="nxs-close" @click="closeIt">×</button></div>',
            '<div class="nxs-search">' + searchSvg + '<input v-model="q" :placeholder="\'搜索工具：简历 / 股票 / 宠物 / 海报\'\"/></div>',
            '<a class="nxs-portal" href="#" @click.prevent="goPortal"><span>{{cfg.portalAction}}</span><span class="nxs-portal-arr">→</span></a>',
            '<div class="nxs-body">',
            '<div class="nxs-skels" v-if="loading"><div class="nxs-skel" v-for="i in 6" :key="i"></div></div>',
            '<div class="nxs-empty" v-else-if="err">{{err}}</div>',
            '<div class="nxs-empty" v-else-if="!viewGroups.length">没有匹配的工具</div>',
            '<template v-else><div v-for="g in viewGroups" :key="g.name" class="nxs-group">',
            '<div class="nxs-group-title"><i></i>{{g.name}}<span class="nxs-group-count">{{g.apps.length}}</span></div>',
            '<div class="nxs-grid"><a v-for="a in g.apps" :key="a.name" :href="a.url"',
            ':class="[\'nxs-tile\',{cur:isCurrent(a)}]" :title="a.description" @click.prevent="openApp(a)">',
            '<span class="nxs-tile-icon">',
            '<img v-if="a.icon_url && !a._icerr" :src="a.icon_url" :alt="a.display_name" @error="a._icerr=true">',
            '<span v-else>{{(a.display_name||a.name).charAt(0)}}</span></span>',
            '<span class="nxs-tile-m"><span class="nxs-tile-name">{{a.display_name}}<span v-if="isCurrent(a)" class="nxs-tile-cur">当前</span></span>',
            '<span class="nxs-tile-desc" v-if="a.description">{{a.description}}</span></span></a></div></div></template>',
            '</div></div></div></div>'
        ].join('')
    };

    function mount() {
        if (_rootApp) return;
        if (!window.Vue) return;
        injectCss();
        var root = document.createElement('div');
        root.className = 'nux-app-switcher';
        document.body.appendChild(root);
        var app = Vue.createApp({ template: '<Root/>' });
        app.component('Root', Root);
        _rootApp = app;
        app.mount(root);
    }

    var _rootRef = null;

    window.NuxAppSwitcher = {
        init: mount,
        open: function() { mount(); if (_rootRef) _rootRef.openIt(); },
        close: function() { if (_rootRef) _rootRef.closeIt(); },
        configure: function(c) { if (c) _cfg = Object.assign({}, _cfg, c); return _cfg; },
        refresh: function() { return loadApps(); }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount);
    } else {
        mount();
    }
})();