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
            'goldenstock': '/golden/', 'beememory': '/beememory/', 'drawio': '/drawio/'
        };
        const APP_LABELS = {
            'resumeai': '跃职', 'challengeplanet': '星轨挑战', 'onenote': '拾光',
            'wisepath': '智途志愿', 'gezhi': '格致', 'travelmate': '拾途旅行', 'miaobi': '秒笔',
            'aipet': '宠康管家', 'lifecompass': '司南', 'truemirror': '照妖镜',
            'geniusstudent': '天才学伴', 'codeblock': '编程学伴', 'suki': '璇玑',
            'lyra': '灵弦', 'nexus-agent': '灵犀', 'promptgenius': '镕裁',
            'financialkg': '知识图谱', 'goldenfish': '金鱼助手',
            'goldenstock': '金股智投', 'golden': '金股智投', 'versecraft': '墨韵创作',
            'beememory': '蜜蜂记忆', 'minideploy': '部署平台',
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
            job_subscription: 'accent', system: 'neutral'
        };
        const TYPE_ICONS = {
            message: 'fa-regular fa-comment', comment: 'fa-regular fa-comment',
            order: 'fa-solid fa-cart-shopping', trade: 'fa-solid fa-cart-shopping',
            system: 'fa-solid fa-circle-info', alert: 'fa-solid fa-triangle-exclamation',
            follow: 'fa-solid fa-user-plus', like: 'fa-solid fa-heart',
            task: 'fa-solid fa-list-check', approval: 'fa-solid fa-file-signature',
            job_subscription: 'fa-solid fa-briefcase'
        };
        const TYPE_LABELS = {
            message: '消息', comment: '评论', task: '任务', order: '订单',
            trade: '交易', alert: '告警', approval: '审批', follow: '关注',
            like: '点赞', job_subscription: '职位订阅', system: '系统'
        };
        function typeTone(type) { return TYPE_TONES[type] || 'neutral'; }
        function typeIcon(type) { return TYPE_ICONS[type] || 'fa-regular fa-bell'; }
        function typeLabel(type) { return TYPE_LABELS[type] || String(type || ''); }
        function clip(text, max) {
            const s = String(text == null ? '' : text);
            return s.length > max ? s.substring(0, max) + '...' : s;
        }
        return { resolve, normalize, appLabel, isToday, jobEntries, typeTone, typeIcon, typeLabel, clip };
    })();
})();
