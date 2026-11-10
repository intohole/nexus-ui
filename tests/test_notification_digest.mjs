import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };
const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));

global.Vue = { ref: (v) => ({ value: v }), watch: () => {}, onBeforeUnmount: () => {}, nextTick: (fn) => fn() };
global.NexusUtils = {
    escapeHtml: (v) => String(v == null ? '' : v),
    formatRelativeTime: () => '刚刚',
    notify: {
        appLabel: (a) => a,
        clip: (c) => String(c || ''),
        resolve: (n) => n.link || ''
    }
};

load('components/nux-notification-digest.js');
const D = window.NuxNotificationDigest;
const Panel = window.NuxNotificationDigestPanel;
check('digest: 全局原语在场', !!D && !!Panel);
check('digest: 四原语齐', !!(D.fetch && D.reportClick && D.sync && D.attach));
check('digest: Vue 子组件模板含流卡', /nux-notify-stream-head/.test(Panel.template) && /nux-notify-digest-label/.test(Panel.template));
check('digest: 子组件展开态与 aria-expanded', /openStream/.test(Panel.template) && /aria-expanded/.test(Panel.template));

{
    let called = '';
    const p = D.fetch('/notifycenter/api/notify', (url) => { called = url; return Promise.reject(new Error('x')); }).then((d) => {
        check('digest: fetch fail-open 返回 null', d === null);
        check('digest: fetch 拼代理前缀无双前缀', called === '/notifycenter/api/notify/notifications/inbox-digest');
        return D.fetch('/api', () => Promise.resolve({ counts: { unread_total: 0 } }));
    }).then((d) => {
        check('digest: 空收件箱不渲染（null）', d === null);
        return D.fetch('/api', () => Promise.resolve({ counts: { unread_total: 5 }, action_items: [1], streams: [2] }));
    }).then((d) => {
        check('digest: 有未读返回 digest', d && d.counts.unread_total === 5);
    });
    await p;
}

{
    let clicked = '';
    D.reportClick('/notifycenter/api/notify', (url, opts) => {
        clicked = (opts && opts.method) + ' ' + url;
        return Promise.resolve({});
    }, 42);
    await new Promise((r) => setTimeout(r, 0));
    check('digest: reportClick POST 幂等端点', clicked === 'POST /notifycenter/api/notify/notifications/42/click');
    D.reportClick('/api', () => Promise.resolve({}), 0);
}

{
    const list = {
        innerHTML: '',
        wrapCount: 0,
        insertAdjacentHTML(pos, html) { if (html.includes('nux-notif-digest-seg-wrap')) this.wrapCount++; this.innerHTML = html + this.innerHTML; },
        querySelector(sel) {
            return (sel.includes('digest-seg-wrap') && this.wrapCount > 0 && !this._removed)
                ? { remove: () => { this.wrapCount--; list._removed = false; } } : null;
        }
    };
    const container = { querySelector(sel) { return sel.includes('panel-list') ? list : null; } };
    const itemHtml = '<div class="nux-notif-panel-item">行动</div>';
    const panel = {
        _container: container,
        _digest: {
            action_items: [{ id: 1, title: '行动', app_id: 'userFeedback', type: 'feedback', content: '', link: '', created_at: '' }],
            streams: [{ app_id: 'mountain', notif_type: 'report', count: 3, latest_id: 9, latest_title: '晚报 C', latest_created_at: '' }],
            counts: { unread_total: 4, action_unread: 1, stream_unread: 3, folded_unread: 0, action_hidden: 0 }
        },
        _box: 'inbox', _filter: 'all',
        _item: () => itemHtml
    };
    D.attach(panel);
    check('digest: attach 注入两段', list.innerHTML.includes('待你处理') && list.innerHTML.includes('今日简报'));
    check('digest: 流卡带 stream 定位键', list.innerHTML.includes('data-stream-app="mountain"') && list.innerHTML.includes('3 条'));
    panel._digest.counts.folded_unread = 2;
    D.attach(panel);
    check('digest: 折叠余量诚实行', list.innerHTML.includes('另有 2 条未读'));
    panel._box = 'archive';
    D.attach(panel);
    check('digest: 非收件箱视图清除已有段', list.wrapCount === 0);
}

load('components/nux-notification-bell.js');
const Bell = window.NuxNotificationBell;
check('bell: digest 子组件注册（加载序 nexus-all 在前）', !!(Bell.components && Bell.components['nux-notification-digest-panel']));
check('bell: 模板含 digest 段', /nux-notification-digest-panel/.test(Bell.template));
check('bell: loadList 拉 digest', /NuxNotificationDigest.fetch/.test(String(Bell.methods.loadList)));
check('bell: activate 统一 reportClick', /NuxNotificationDigest.reportClick/.test(String(Bell.methods.activate)));

load('components/nux-notification-panel.js');
const PanelProto = window.NuxNotificationPanel.prototype;
check('panel: _fetchSummary 接 digest sync', /NuxNotificationDigest.sync/.test(String(PanelProto._fetchSummary)));
check('panel: _activateItem 接 reportClick', /NuxNotificationDigest.reportClick/.test(String(PanelProto._activateItem)));

let failed = 0;
for (const [name, ok] of results) {
    if (!ok) failed++;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
}
console.log(failed === 0 ? 'ALL ' + results.length + ' PASS' : failed + ' FAILED');
process.exit(failed === 0 ? 0 : 1);
