(function() {
    if (window.NuxAppSwitcher) return;
    if (!window.Vue) return;

    var CSS = [
        '.nux-app-switcher,.nxs-root{all:initial;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;color:#f1f5f9}',
        '.nxs-trigger{position:fixed;left:18px;bottom:18px;z-index:2147483001;display:flex;align-items:center;gap:9px;height:46px;padding:0 18px;border-radius:999px;background:rgba(15,23,42,.92);backdrop-filter:blur(14px);border:1px solid rgba(56,189,248,.28);box-shadow:0 10px 28px rgba(15,23,42,.35),inset 0 1px 0 rgba(255,255,255,.06);color:#f1f5f9;cursor:pointer;transition:transform .25s cubic-bezier(.4,0,.2,1),border-color .25s,box-shadow .25s;-webkit-tap-highlight-color:transparent}',
        '.nxs-trigger:hover{transform:translateY(-2px);border-color:rgba(56,189,248,.55);box-shadow:0 14px 34px rgba(15,23,42,.4),0 0 22px rgba(56,189,248,.22)}',
        '.nxs-trigger:active{transform:translateY(0)}',
        '.nxs-trigger-glyph{width:20px;height:20px;flex:none}',
        '.nxs-trigger-label{font-size:14px;font-weight:600;letter-spacing:.5px;white-space:nowrap}',
        '.nxs-trigger-dot{width:6px;height:6px;border-radius:50%;background:#38bdf8;box-shadow:0 0 8px #38bdf8}',
        '.nxs-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(2,6,23,.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;animation:nxsFade .2s ease}',
        '.nxs-panel{position:relative;width:min(920px,calc(100vw - 28px));max-height:84vh;display:flex;flex-direction:column;border-radius:22px;overflow:hidden;background:linear-gradient(180deg,rgba(30,41,59,.97),rgba(15,23,42,.99));backdrop-filter:blur(22px);border:1px solid rgba(148,163,184,.16);box-shadow:0 30px 80px rgba(2,6,23,.55);animation:nxsPop .22s cubic-bezier(.34,1.3,.5,1)}',
        '.nxs-panel:before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(620px 220px at 18% -8%,rgba(56,189,248,.16),transparent 62%)}',
        '.nxs-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 12px}',
        '.nxs-brand{display:flex;align-items:center;gap:11px;cursor:pointer}',
        '.nxs-brand-logo{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0ea5e9,#6366f1);font-size:16px;font-weight:800;color:#fff;box-shadow:0 6px 14px rgba(56,189,248,.3)}',
        '.nxs-brand-t{display:flex;flex-direction:column;line-height:1.15}',
        '.nxs-brand-name{font-size:16px;font-weight:700;color:#f8fafc;letter-spacing:.3px}',
        '.nxs-brand-sub{font-size:12px;color:#94a3b8}',
        '.nxs-close{width:34px;height:34px;border-radius:10px;border:1px solid transparent;background:transparent;color:#cbd5e1;font-size:19px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s,color .2s}',
        '.nxs-close:hover{background:rgba(255,255,255,.08);color:#fff}',
        '.nxs-search{margin:2px 20px 12px;display:flex;align-items:center;gap:10px;height:42px;padding:0 14px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}',
        '.nxs-search:focus-within{border-color:rgba(56,189,248,.6);box-shadow:0 0 0 3px rgba(56,189,248,.15)}',
        '.nxs-search-svg{width:17px;height:17px;flex:none;opacity:.7}',
        '.nxs-search input{flex:1;min-width:0;background:transparent;border:none;outline:none;color:#f1f5f9;font-size:14px}',
        '.nxs-search input::placeholder{color:#94a3b8}',
        '.nxs-portal{display:flex;align-items:center;justify-content:space-between;margin:0 20px 4px;padding:11px 14px;border-radius:13px;background:rgba(56,189,248,.09);border:1px solid rgba(56,189,248,.22);color:#7dd3fc;font-size:14px;font-weight:600;text-decoration:none;transition:background .2s,border-color .2s}',
        '.nxs-portal:hover{background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.45)}',
        '.nxs-portal-arr{font-size:15px}',
        '.nxs-body{overflow-y:auto;padding:4px 20px 20px;scrollbar-width:thin;scrollbar-color:rgba(148,163,184,.3) transparent;margin:14px 0 0}',
        '.nxs-body::-webkit-scrollbar{width:8px}.nxs-body::-webkit-scrollbar-thumb{background:rgba(148,163,184,.3);border-radius:8px}',
        '.nxs-skels{display:grid;grid-template-columns:repeat(auto-fill,minmax(206px,1fr));gap:10px}',
        '.nxs-skel{height:64px;border-radius:14px;background:rgba(255,255,255,.06);animation:nxsSh 1.2s infinite}',
        '@keyframes nxsSh{0%,100%{opacity:.5}50%{opacity:1}}',
        '.nxs-group{margin-top:16px}',
        '.nxs-group-title{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:#94a3b8;letter-spacing:1px;margin-bottom:10px}',
        '.nxs-group-title i{width:5px;height:5px;border-radius:50%;background:#38bdf8}',
        '.nxs-group-count{margin-left:auto;font-weight:500;color:#64748b;font-size:12px}',
        '.nxs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:10px}',
        '.nxs-tile{display:flex;align-items:center;gap:11px;padding:12px;border-radius:14px;background:rgba(255,255,255,.045);border:1px solid transparent;text-decoration:none;transition:background .2s,border-color .2s,transform .2s}',
        '.nxs-tile:hover{background:rgba(56,189,248,.1);border-color:rgba(56,189,248,.35);transform:translateY(-2px)}',
        '.nxs-tile.cur{border-color:rgba(56,189,248,.65);background:rgba(56,189,248,.08)}',
        '.nxs-tile-icon{width:40px;height:40px;flex:none;border-radius:11px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:#fff;border:1px solid rgba(255,255,255,.08)}',
        '.nxs-tile-icon img{width:100%;height:100%;object-fit:contain}',
        '.nxs-tile-m{min-width:0;display:flex;flex-direction:column;gap:2px}',
        '.nxs-tile-name{font-size:14px;font-weight:600;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
        '.nxs-tile-desc{font-size:12px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
        '.nxs-tile-cur{color:#38bdf8;margin-left:6px;font-size:11px;font-weight:500}',
        '.nxs-empty{margin:26px 0;text-align:center;color:#94a3b8;font-size:14px}',
        '@keyframes nxsFade{from{opacity:0}to{opacity:1}}',
        '@keyframes nxsPop{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}',
        '@media(max-width:640px){',
        '.nxs-overlay{align-items:flex-end}',
        '.nxs-panel{width:100%;max-height:92vh;border-radius:22px 22px 0 0;animation:nxsUp .25s cubic-bezier(.34,1.2,.5,1)}',
        '.nxs-trigger{left:14px;bottom:calc(14px + env(safe-area-inset-bottom))}',
        '.nxs-trigger-label{display:none}',
        '.nxs-grid{grid-template-columns:repeat(2,1fr);gap:8px}',
        '@keyframes nxsUp{from{transform:translateY(40px);opacity:.6}to{transform:none;opacity:1}}',
        '}'
    ].join('');

    var PALETTE = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f472b6', '#60a5fa', '#a78bfa', '#22d3ee'];
    var RECENT_KEY = 'nxs-app-switcher-recents';

    var _cfg = readConfig();
    var _apps = [];
    var _err = '';
    var _rootApp = null;

    function readConfig() {
        var g = window.nuxAppSwitcherConfig || {};
        var s = document.currentScript;
        return {
            registryUrl: g.registryUrl || (s && s.getAttribute('data-registry-url')) || '/api/portal/apps',
            registryData: g.registryData || null,
            brandName: g.brandName || '松果氪',
            brandTagline: g.brandTagline || '你的数字工具箱',
            portalUrl: g.portalUrl || '/',
            portalAction: g.portalAction || '回到松果氪 · 全站工具箱'
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
        return !!(a && a.url && a.name && a.is_public === true && !a.is_dev);
    }

    function loadApps() {
        if (_cfg.registryData) {
            _apps = _cfg.registryData.filter(keepApp);
            return Promise.resolve();
        }
        return fetch(_cfg.registryUrl, { headers: { 'Accept': 'application/json' } })
            .then(function(r) { if (!r.ok) throw new Error('bad'); return r.json(); })
            .then(function(d) { _apps = ((d && d.apps) || []).filter(keepApp); })
            .catch(function(e) { _err = '暂时无法加载应用清单'; _apps = []; });
    }

    function groupOf(a) {
        var g = (a.app_group || '').split(',')[0].trim();
        return g || '其他应用';
    }

    function recents() {
        var raw = '';
        try { raw = localStorage.getItem(RECENT_KEY) || ''; } catch (e) {}
        if (!raw) return [];
        try { var arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch (e) { return []; }
    }

    function touch(name) {
        var list = recents().filter(function(r) { return r.name !== name; });
        list.unshift({ name: name, at: Date.now() });
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8))); } catch (e) {}
    }

    function isCurrent(a) {
        var p = a.path_prefix || '';
        return !!p && location.pathname.indexOf(p) === 0;
    }

    function colorFor(name) {
        var h = 0;
        for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
        return PALETTE[h % PALETTE.length];
    }

    var magic = '<svg class="nxs-trigger-glyph" viewBox="0 0 20 20" fill="none"><rect x="2.2" y="2.2" width="6.4" height="6.4" rx="1.8" fill="#38bdf8"/><rect x="11.4" y="2.2" width="6.4" height="6.4" rx="1.8" fill="#f1f5f9"/><rect x="2.2" y="11.4" width="6.4" height="6.4" rx="1.8" fill="#f1f5f9"/><rect x="11.4" y="11.4" width="6.4" height="6.4" rx="1.8" fill="#f1f5f9" opacity=".85"/></svg>';
    var searchSvg = '<svg class="nxs-search-svg" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="5.4" stroke="#94a3b8" stroke-width="1.7"/><path d="M12.2 12.2L16 16" stroke="#94a3b8" stroke-width="1.7" stroke-linecap="round"/></svg>';

    var Root = {
        name: 'NuxAppSwitcher',
        data: function() { return { open: false, q: '', apps: [], loading: true, err: _err }; },
        computed: {
            cfg() { return _cfg; },
            brandFirst() { return (_cfg.brandName || '松').charAt(0); },
            groups() {
                var recentsArr = recents().map(function(r) {
                    for (var i = 0; i < this.apps.length; i++) if (this.apps[i].name === r.name) return this.apps[i];
                }.bind(this)).filter(Boolean);
                var map = {};
                this.apps.forEach(function(a) {
                    var g = groupOf(a);
                    (map[g] = map[g] || []).push(a);
                });
                var out = [];
                if (recentsArr.length && recentsArr.length < this.apps.length) out.push({ name: '最近使用', apps: recentsArr });
                Object.keys(map).forEach(function(k) { out.push({ name: k, apps: map[k] }); });
                return out;
            },
            viewGroups() {
                var qv = this.q.trim().toLowerCase();
                if (!qv) return this.groups;
                var flat = this.apps.filter(function(a) {
                    return (a.display_name || '').toLowerCase().indexOf(qv) !== -1 ||
                           (a.description || '').toLowerCase().indexOf(qv) !== -1 ||
                           ((a.tags || []).join(' ')).toLowerCase().indexOf(qv) !== -1;
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
            document.addEventListener('keydown', function(e) { if (e.key === 'Escape') self.open = false; });
        },
        methods: {
            toggle() { this.open = !this.open; },
            openIt() { this.open = true; },
            closeIt() { this.open = false; },
            goPortal() { this.open = false; window.location.href = _cfg.portalUrl; },
            openApp(a) {
                touch(a.name);
                this.open = false;
                window.location.href = a.url;
            },
            col: colorFor,
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
            '<span class="nxs-tile-icon" :style="\'background:linear-gradient(135deg,\'+col(a.name)+\'cc,\'+col(a.name)+\'66)\'">',
            '<img v-if="a.icon_url && !a._icerr" :src="a.icon_url" :alt="a.display_name" @error="a._icerr=true">',
            '<span v-else>{{(a.display_name||a.name).charAt(0)}}</span></span>',
            '<span class="nxs-tile-m"><span class="nxs-tile-name">{{a.display_name}}<span v-if="isCurrent(a)" class="nxs-tile-cur">当前</span></span>',
            '<span class="nxs-tile-desc">{{a.description}}</span></span></a></div></div></template>',
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