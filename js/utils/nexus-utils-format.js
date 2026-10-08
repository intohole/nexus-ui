/* nexus-utils format —— nexus-utils.js 聚合入口的本体模块（由 build_all.py 拼接），直引入口或随 nexus-all 加载 */
(function() {
    const CN_TZ = 'Asia/Shanghai';
    const utils = window.NexusUtils = window.NexusUtils || {};
    Object.assign(utils, {
        parseDate(value) {
            if (!value) return null;
            if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
            if (typeof value === 'number') return new Date(value);
            const s = String(value).trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
                const d = new Date(s + 'T00:00:00+08:00');
                return isNaN(d.getTime()) ? null : d;
            }
            let str = s.replace(' ', 'T');
            if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(str)) str += '+08:00';
            const d = new Date(str);
            return isNaN(d.getTime()) ? null : d;
        },

        formatDate(dateString, options = {}) {
            const date = utils.parseDate(dateString);
            if (!date) return '';
            try {
                return date.toLocaleString('zh-CN', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                    timeZone: CN_TZ,
                    ...options
                });
            } catch (e) { return ''; }
        },

        formatDateShort(dateString) {
            return utils.formatDate(dateString, { hour: undefined, minute: undefined });
        },

        formatCurrency(amount) {
            if (amount === undefined || amount === null || isNaN(amount)) return '¥0';
            return '¥' + Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        },

        formatNumber(num, decimals = 2) {
            if (num === undefined || num === null || isNaN(num)) return '0';
            return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        },

        smartNumber(num) {
            if (num === undefined || num === null || isNaN(Number(num))) return '0';
            const n = Number(num);
            if (!isFinite(n)) return String(n);
            if (Number.isInteger(n)) return String(n);
            return String(Number(n.toFixed(2)));
        },

        formatBytes(bytes) {
            if (!bytes) return '0 B';
            const units = ['B', 'KB', 'MB', 'GB', 'TB'];
            let i = Math.floor(Math.log(bytes) / Math.log(1024));
            if (i >= units.length) i = units.length - 1;
            return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
        },

        truncateText(text, maxLength = 100) {
            if (!text) return '';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        },

        getGreeting() {
            const hour = utils.getLocalHour();
            if (hour < 6) return '夜深了';
            if (hour < 9) return '早上好';
            if (hour < 12) return '上午好';
            if (hour < 14) return '中午好';
            if (hour < 18) return '下午好';
            return '晚上好';
        },

        getLocalHour() {
            const now = new Date();
            try {
                const parts = new Intl.DateTimeFormat('zh-CN', {
                    hour: 'numeric',
                    hourCycle: 'h23',
                    timeZone: CN_TZ
                }).formatToParts(now);
                for (const p of parts) {
                    if (p.type === 'hour') {
                        const hour = parseInt(p.value, 10);
                        if (!isNaN(hour) && hour >= 0 && hour <= 23) return hour;
                    }
                }
            } catch (e) { /* fallthrough */ }
            return now.getHours();
        },

        cnTodayStr() {
            const now = new Date();
            try {
                const parts = new Intl.DateTimeFormat('zh-CN', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    timeZone: CN_TZ
                }).formatToParts(now);
                let y = '', m = '', d = '';
                for (const p of parts) {
                    if (p.type === 'year') y = p.value;
                    else if (p.type === 'month') m = p.value;
                    else if (p.type === 'day') d = p.value;
                }
                if (y && m && d) return `${y}-${m}-${d}`;
            } catch (e) { /* fallthrough */ }
            return utils.formatDateShort(now).replace(/\//g, '-');
        },

        cnDateLabel() {
            const now = new Date();
            try {
                const parts = new Intl.DateTimeFormat('zh-CN', {
                    month: 'numeric', day: 'numeric', weekday: 'short',
                    timeZone: CN_TZ
                }).formatToParts(now);
                let m = '', d = '', w = '';
                for (const p of parts) {
                    if (p.type === 'month') m = p.value;
                    else if (p.type === 'day') d = p.value;
                    else if (p.type === 'weekday') w = p.value;
                }
                if (m && d && w) return `${m}月${d}日 ${w}`;
            } catch (e) { /* fallthrough */ }
            const today = new Date();
            const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
            return `${today.getMonth() + 1}月${today.getDate()}日 ${weekdays[today.getDay()]}`;
        },

        formatPhone(phone) {
            if (!phone || phone.length < 7) return phone || '';
            return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
        },

        formatMsg(content) {
            if (!content) return '';
            let html = String(content)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            const codeBlocks = [];
            html = html.replace(/```([\s\S]*?)```/g, (m, code) => {
                codeBlocks.push(code.replace(/^\n/, ''));
                return `\x00CODEBLOCK${codeBlocks.length - 1}\x00`;
            });
            html = html.replace(/`([^`]+)`/g, (m, code) => `<code>${code}</code>`);
            html = html.replace(/\n/g, '<br>');
            codeBlocks.forEach((code, i) => {
                html = html.replace(`\x00CODEBLOCK${i}\x00`, `<pre><code>${code}</code></pre>`);
            });
            return html;
        },

        matchGrade(value, rules, mode = 'eq') {
            if (value === undefined || value === null) return null;
            const v = String(value).toLowerCase();
            for (const rule of rules) {
                const keys = Array.isArray(rule.match) ? rule.match : [rule.match];
                const hit = mode === 'has'
                    ? keys.some(k => k && v.indexOf(String(k).toLowerCase()) >= 0)
                    : keys.some(k => k !== undefined && k !== null && String(k).toLowerCase() === v);
                if (hit) return rule;
            }
            return null;
        },

        formatRelativeTime(dateString, options = {}) {
            const date = utils.parseDate(dateString);
            if (!date) return '';
            const dayLimit = options.dayLimit > 0 ? options.dayLimit : 30;
            const space = options.space === true ? ' ' : '';
            const now = Date.now();
            const diff = now - date.getTime();
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            if (seconds < 60) return '刚刚';
            if (minutes < 60) return `${minutes}${space}分钟前`;
            if (hours < 24) return `${hours}${space}小时前`;
            if (days < dayLimit) return `${days}${space}天前`;
            if (options.fallback === 'md') {
                const cn = utils.cnParts(date);
                const nowCn = utils.cnParts(new Date());
                return cn.year === nowCn.year
                    ? `${cn.month}-${cn.day}`
                    : `${cn.year}-${cn.month}-${cn.day}`;
            }
            return utils.formatDateShort(dateString);
        },

        pad2(n) {
            return String(n == null ? 0 : n).padStart(2, '0');
        },

        cnParts(value) {
            const out = { year: '', month: '', day: '', hour: '', minute: '', second: '' };
            const d = value instanceof Date ? value : utils.parseDate(value);
            if (!d || isNaN(d.getTime())) return out;
            try {
                new Intl.DateTimeFormat('zh-CN', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    hourCycle: 'h23', timeZone: CN_TZ
                }).formatToParts(d).forEach((part) => {
                    if (Object.prototype.hasOwnProperty.call(out, part.type)) out[part.type] = part.value;
                });
            } catch (e) {}
            return out;
        },

        formatDateKey(value) {
            const d = value instanceof Date ? value : utils.parseDate(value);
            if (!d || isNaN(d.getTime())) return '';
            return d.getFullYear() + '-' + utils.pad2(d.getMonth() + 1) + '-' + utils.pad2(d.getDate());
        },

        formatDateTimeHyphen(value, withSeconds = false) {
            const d = value instanceof Date ? value : utils.parseDate(value);
            if (!d || isNaN(d.getTime())) return '';
            const p = utils.cnParts(d);
            const base = p.year + '-' + p.month + '-' + p.day + ' ' + p.hour + ':' + p.minute;
            return withSeconds ? base + ':' + p.second : base;
        },

        formatDateTime(dateString, options = {}) {
            const date = utils.parseDate(dateString);
            if (!date) return '';
            try {
                return date.toLocaleString('zh-CN', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    timeZone: CN_TZ,
                    ...options
                });
            } catch (e) { return ''; }
        },

        formatPercent(value, decimals = 1) {
            if (value === undefined || value === null || isNaN(value)) return '0%';
            return (Number(value) * 100).toFixed(decimals) + '%';
        },

        formatUsd(amount, decimals = 4) {
            if (amount === undefined || amount === null || isNaN(amount)) return Number(0).toFixed(decimals);
            return Number(amount).toFixed(decimals);
        },

        formatChatTime(timeStr) {
            if (!timeStr) return '';
            const date = new Date(timeStr);
            if (isNaN(date.getTime())) return '';
            const now = new Date();
            const isToday = date.getFullYear() === now.getFullYear()
                && date.getMonth() === now.getMonth()
                && date.getDate() === now.getDate();
            const hh = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            if (isToday) return `${hh}:${mm}`;
            const M = String(date.getMonth() + 1).padStart(2, '0');
            const D = String(date.getDate()).padStart(2, '0');
            return `${M}/${D} ${hh}:${mm}`;
        },

        formatTime(dateString) {
            return utils.formatRelativeTime(dateString);
        },
    });
})();
