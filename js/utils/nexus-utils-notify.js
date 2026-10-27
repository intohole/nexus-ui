/* nexus-utils notify —— nexus-utils.js 聚合入口的本体模块（由 build_all.py 拼接），直引入口或随 nexus-all 加载 */
(function() {
    const utils = window.NexusUtils = window.NexusUtils || {};
    utils.notify = (function () {
        const APP_PATHS = {
            'resumeai': '/resumeai/', 'challengeplanet': '/challengeplanet/',
            'nexus-agent': '/nexus-agent', 'travelmate': '/travelmate/',
            'onenote': '/onenote/', 'wisepath': '/wisepath/', 'gezhi': '/gezhi/',
            'goldenfish': '/goldenfish/', 'versecraft': '/versecraft/',
            'miaobi': '/miaobi/', 'geniusstudent': '/geniusstudent/',
            'aipet': '/aipet/', 'lifecompass': '/lifecompass/', 'truemirror': '/truemirror/',
            'suki': '/suki/', 'lyra': '/lyra/', 'codeblock': '/codeblock/',
            'promptgenius': '/promptgenius/', 'financialkg': '/financialkg/',
            'goldenstock': '/golden/', 'beememory': '/beememory/', 'drawio': '/drawio/',
            'moutain': '/mountain'
        };
        const APP_LABELS = {
            'resumeai': '跃职', 'challengeplanet': '星轨挑战', 'onenote': '拾光',
            'wisepath': '智途志愿', 'gezhi': '格致', 'travelmate': '拾途旅行', 'miaobi': '秒笔',
            'aipet': '宠康管家', 'lifecompass': '司南', 'truemirror': '照妖镜',
            'geniusstudent': '天才学伴', 'codeblock': '编程学伴', 'suki': '璇玑',
            'lyra': '灵弦', 'nexus-agent': '灵犀', 'promptgenius': '镕裁',
            'financialkg': '知识图谱', 'goldenfish': '金鱼助手',
            'goldenstock': '金股智投', 'golden': '金股智投', 'versecraft': '墨韵创作',
            'beememory': '蜜蜂记忆', 'minideploy': '部署平台', 'moutain': '采薇',
            'userfeedback': '意见反馈', 'usercenter': '钱包',
            'notifycenter': '通知中心', 'system': '系统'
        };
        function normalize(url) {
            if (!url || url.charAt(0) !== '/') return url;
            const seg = url.split('/')[1] || '';
            const canonical = APP_PATHS[seg.toLowerCase()];
            if (!canonical) return url;
            return canonical.replace(/\/$/, '') + url.slice(seg.length + 1);
        }
        function resolve(item) {
            if (!item) return '';
            let url = item.link || '';
            if (!url) {
                const d = item.data || {};
                if (typeof d.url === 'string' && d.url) url = d.url;
                else if (Array.isArray(d.jobs) && d.jobs.length && d.jobs[0]
                    && typeof d.jobs[0].url === 'string') url = d.jobs[0].url || '';
            }
            if (!url) url = APP_PATHS[String(item.app_id || '').toLowerCase()] || '';
            return normalize(url);
        }
        function appLabel(appId) {
            const key = String(appId || '').toLowerCase();
            return APP_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : '');
        }
        function isToday(iso) {
            if (!iso) return false;
            const d = new Date(iso);
            if (isNaN(d.getTime())) return false;
            const now = new Date();
            return d.getFullYear() === now.getFullYear()
                && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        }
        function jobEntries(item) {
            const jobs = item && item.data && item.data.jobs;
            if (!Array.isArray(jobs)) return [];
            return jobs.filter(j => j && (typeof j.job_title === 'string' || typeof j.title === 'string'))
                .slice(0, 3)
                .map(j => ({
                    title: j.job_title || j.title || '',
                    company: typeof j.company === 'string' ? j.company : '',
                    url: (typeof j.url === 'string' && j.url) ? normalize(j.url) : ''
                }));
        }
        const TYPE_TONES = {
            message: 'info', comment: 'info', task: 'success',
            order: 'warning', trade: 'warning', alert: 'danger',
            approval: 'accent', follow: 'accent', like: 'accent',
            job_subscription: 'accent', system: 'neutral',
            truemirror: 'accent', credits: 'warning', daily_quest: 'success',
            winback: 'success', w1_day1: 'success', w1_day3: 'success',
            reminder: 'info', business: 'accent', routine: 'accent',
            remind: 'info', serial: 'accent', feedback: 'success',
            alert_triggered: 'warning', roadmap_ready: 'success', info: 'neutral',
            daily_close: 'info', knowledge: 'info', report: 'info',
            weekly_report: 'info', weekly_pulse: 'info', insight: 'info',
            e2e_email_probe: 'neutral'
        };
        const TYPE_ICONS = {
            message: 'fa-regular fa-comment', comment: 'fa-regular fa-comment',
            order: 'fa-solid fa-cart-shopping', trade: 'fa-solid fa-cart-shopping',
            system: 'fa-solid fa-circle-info', alert: 'fa-solid fa-triangle-exclamation',
            follow: 'fa-solid fa-user-plus', like: 'fa-solid fa-heart',
            task: 'fa-solid fa-list-check', approval: 'fa-solid fa-file-signature',
            job_subscription: 'fa-solid fa-briefcase',
            truemirror: 'fa-solid fa-magnifying-glass-chart', credits: 'fa-solid fa-coins',
            daily_quest: 'fa-solid fa-bullseye', winback: 'fa-solid fa-hand-holding-heart',
            w1_day1: 'fa-solid fa-seedling', w1_day3: 'fa-solid fa-seedling',
            reminder: 'fa-regular fa-clock', business: 'fa-solid fa-chart-line',
            routine: 'fa-solid fa-robot', remind: 'fa-solid fa-graduation-cap',
            serial: 'fa-solid fa-book-open', feedback: 'fa-solid fa-comments',
            alert_triggered: 'fa-solid fa-shield-halved', roadmap_ready: 'fa-solid fa-route',
            info: 'fa-regular fa-bell', daily_close: 'fa-solid fa-chart-simple',
            knowledge: 'fa-regular fa-lightbulb', report: 'fa-regular fa-file-lines',
            weekly_report: 'fa-regular fa-calendar-check', weekly_pulse: 'fa-solid fa-heart-pulse',
            insight: 'fa-regular fa-compass', e2e_email_probe: 'fa-solid fa-flask'
        };
        const TYPE_LABELS = {
            message: '消息', comment: '评论', task: '任务', order: '订单',
            trade: '交易', alert: '告警', approval: '审批', follow: '关注',
            like: '点赞', job_subscription: '职位订阅', system: '系统',
            truemirror: '评测出分', credits: '积分变动', daily_quest: '每日任务',
            winback: '召回关怀', w1_day1: '成长旅程', w1_day3: '成长旅程',
            reminder: '提醒', business: '业务动态', routine: '分身简报',
            remind: '报考提醒', serial: '连载更新', feedback: '回音回复',
            alert_triggered: '防线触发', roadmap_ready: '路线图就绪', info: '通知',
            daily_close: '收盘播报', knowledge: '知识脉搏', report: '报告',
            weekly_report: '周报', weekly_pulse: '每周脉搏', insight: '洞察',
            e2e_email_probe: '测试探针'
        };
        function typeTone(type) { return TYPE_TONES[type] || 'neutral'; }
        function typeIcon(type) { return TYPE_ICONS[type] || 'fa-regular fa-bell'; }
        function typeLabel(type) { return TYPE_LABELS[type] || String(type || ''); }
        function clip(text, max) {
            const s = String(text == null ? '' : text);
            return s.length > max ? s.substring(0, max) + '...' : s;
        }
        const webpush = (function () {
            const SW_PATH = '/sw.js';
            const UNSUPPORTED = {
                no_sw: '当前浏览器不支持系统推送',
                no_push: '当前浏览器不支持系统推送',
                unsupported_browser: '当前浏览器暂不支持，请用 Safari 打开后开启',
                not_standalone_ios: '先「添加到主屏幕」，再从主屏幕打开即可开启',
                not_granted: '通知权限未开启，可在浏览器设置中重新允许',
                channel_off: '推送通道未开启',
                subscribe_failed: '订阅失败，请稍后重试'
            };
            function browserFamily() {
                const ua = navigator.userAgent || '';
                if (/iPhone|iPad|iPod/.test(ua)) return 'ios-safari';
                if (/Safari/.test(ua) && !/Chrome|Edg|Firefox/.test(ua)) return 'safari';
                if (/Edg/.test(ua)) return 'edge';
                if (/Chrome/.test(ua)) return 'chrome';
                if (/Firefox/.test(ua)) return 'firefox';
                return 'other';
            }
            function isIos() { return /iPhone|iPad|iPod/.test(navigator.userAgent || ''); }
            function isStandalone() {
                if (window.navigator && window.navigator.standalone) return true;
                return !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
            }
            function capability() {
                if (!('serviceWorker' in navigator)) return { ok: false, reason: UNSUPPORTED.no_sw };
                if (!('PushManager' in window) || !('Notification' in window)) return { ok: false, reason: UNSUPPORTED.no_push };
                const fam = browserFamily();
                if (fam !== 'safari' && fam !== 'ios-safari') return { ok: false, reason: UNSUPPORTED.unsupported_browser };
                if (isIos() && !isStandalone()) return { ok: false, reason: UNSUPPORTED.not_standalone_ios };
                return { ok: true, family: fam, reason: '' };
            }
            function permissionState() {
                if (!('Notification' in window)) return 'unsupported';
                return Notification.permission;
            }
            function b64ToUint8(b64) {
                const pad = '='.repeat((4 - (b64.length % 4)) % 4);
                const raw = window.atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
                const out = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
                return out;
            }
            function status(api, apiBase) {
                return api.get((apiBase || '/api/notify') + '/webpush/status').then(function (d) {
                    d = d || {};
                    const subs = Array.isArray(d.subscriptions) ? d.subscriptions : [];
                    return {
                        enabled: !!d.enabled,
                        subscribed: subs.some(function (s) { return s.enabled; }),
                        subscriptions: subs,
                        pushTypes: d.push_types || [],
                        dailyLimit: d.daily_limit || 0,
                        todayPushed: d.today_pushed || 0
                    };
                });
            }
            function enable(api, base) {
                const cap = capability();
                if (!cap.ok) return Promise.reject({ message: cap.reason });
                return Notification.requestPermission().then(function (p) {
                    if (p !== 'granted') throw { message: UNSUPPORTED.not_granted };
                    return api.get((base || '/api/notify') + '/webpush/vapid-key');
                }).then(function (d) {
                    d = d || {};
                    if (!d.enabled || !d.public_key) throw { message: UNSUPPORTED.channel_off };
                    return navigator.serviceWorker.register(SW_PATH, { scope: '/' }).then(function (reg) {
                        return reg.pushManager.getSubscription().then(function (existing) {
                            if (existing) return existing;
                            return reg.pushManager.subscribe({
                                userVisibleOnly: true,
                                applicationServerKey: b64ToUint8(d.public_key)
                            });
                        });
                    });
                }).then(function (sub) {
                    const keys = sub.toJSON && sub.toJSON().keys ? sub.toJSON().keys : {};
                    return api.post((base || '/api/notify') + '/webpush/subscriptions', {
                        endpoint: sub.endpoint, p256dh: keys.p256dh || '', auth: keys.auth || '',
                        browser: browserFamily()
                    }).then(function () { return sub.endpoint; });
                });
            }
            function disable(api, base) {
                return navigator.serviceWorker.getRegistration('/').then(function (reg) {
                    if (!reg) return false;
                    return reg.pushManager.getSubscription().then(function (sub) {
                        if (!sub) return false;
                        return api.post((base || '/api/notify') + '/webpush/subscriptions/unsubscribe', { endpoint: sub.endpoint })
                            .catch(function () {})
                            .then(function () { return sub.unsubscribe().then(function () { return true; }); });
                    });
                });
            }
            function sendTest(api, base) {
                return api.post((base || '/api/notify') + '/webpush/test', {}).then(function (d) {
                    if (!d || !d.ok) throw { message: '测试推送发送失败' };
                    return true;
                });
            }
            return { capability, permissionState, browserFamily, status, enable, disable, sendTest, UNSUPPORTED };
        })();
        return { resolve, normalize, appLabel, isToday, jobEntries, typeTone, typeIcon, typeLabel, clip, webpush };
    })();
})();
