/* ===== nexus-utils.js ===== */
(function() {
    const CN_TZ = 'Asia/Shanghai';
    const SSO_COOKIE_DOMAIN = '.songguokr.com';
    const SSO_LOGOUT_COOKIE = 'uc_sso_logout';
    const SSO_LOGOUT_MAX_AGE = 30 * 24 * 3600;
    const SSO_EPOCH_KEY = 'uc_session_epoch';
    const utils = {
        scrollLock: (function() {
            let count = 0;
            let prevOverflow = '';
            let prevPaddingRight = '';
            return {
                lock() {
                    count++;
                    if (count > 1) return;
                    const body = document.body;
                    prevOverflow = body.style.overflow;
                    prevPaddingRight = body.style.paddingRight;
                    const gap = window.innerWidth - document.documentElement.clientWidth;
                    body.style.overflow = 'hidden';
                    if (gap > 0) body.style.paddingRight = gap + 'px';
                },
                unlock() {
                    if (count === 0) return;
                    count--;
                    if (count > 0) return;
                    document.body.style.overflow = prevOverflow;
                    document.body.style.paddingRight = prevPaddingRight;
                }
            };
        })(),

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

        debounce(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        },

        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        generateId() {
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return crypto.randomUUID();
            }
            return Date.now().toString(36) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        },

        deepClone(obj) {
            if (typeof structuredClone === 'function') {
                try { return structuredClone(obj); } catch (e) { }
            }
            return JSON.parse(JSON.stringify(obj));
        },

        downloadFile(content, filename, mimeType = 'text/plain') {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
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

        autoResize(el) {
            if (!el) return;
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        },

        pick(obj, keys) {
            const result = {};
            keys.forEach(key => { if (key in obj) result[key] = obj[key]; });
            return result;
        },

        omit(obj, keys) {
            const result = { ...obj };
            keys.forEach(key => delete result[key]);
            return result;
        },

        setViewportHeight() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--nx-vh', `${vh}px`);
        },

        escapeHtml(text) {
            if (text === null || text === undefined) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        hexToRgba(hex, alpha = 1) {
            if (typeof hex !== 'string') return `rgba(99, 102, 241, ${alpha})`;
            let h = hex.trim().replace('#', '');
            if (h.length === 3) h = h.split('').map(c => c + c).join('');
            if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(99, 102, 241, ${alpha})`;
            const r = parseInt(h.slice(0, 2), 16);
            const g = parseInt(h.slice(2, 4), 16);
            const b = parseInt(h.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        },

        isDarkColor(hex) {
            if (typeof hex !== 'string' || hex.length < 7) return false;
            const h = hex.trim().replace('#', '');
            if (!/^[0-9a-fA-F]{6}$/.test(h)) return false;
            const r = parseInt(h.slice(0, 2), 16);
            const g = parseInt(h.slice(2, 4), 16);
            const b = parseInt(h.slice(4, 6), 16);
            return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
        },

        compressImage(file, opts = {}) {
            const maxDim = opts.maxDim || 1600;
            const quality = opts.quality || 0.85;
            const output = opts.output || 'file';
            return new Promise((resolve) => {
                if (!file || !/^image\//.test(file.type || '')) { resolve(file); return; }
                const url = URL.createObjectURL(file);
                const img = new Image();
                img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
                img.onload = () => {
                    URL.revokeObjectURL(url);
                    const longest = Math.max(img.width || 1, img.height || 1);
                    const mime = opts.mime || (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
                    if (longest <= maxDim && mime === file.type && output === 'file') { resolve(file); return; }
                    const scale = Math.min(1, maxDim / longest);
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round((img.width || 1) * scale));
                    canvas.height = Math.max(1, Math.round((img.height || 1) * scale));
                    const ctx = canvas.getContext('2d');
                    if (mime === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    if (output === 'dataurl') { resolve(canvas.toDataURL(mime, quality)); return; }
                    canvas.toBlob((blob) => {
                        if (!blob) { resolve(file); return; }
                        if (output === 'blob') { resolve(blob); return; }
                        const base = (file.name || 'image').replace(/\.[^.\/]+$/, '');
                        const ext = mime === 'image/png' ? '.png' : '.jpg';
                        resolve(new File([blob], base + ext, { type: mime }));
                    }, mime, quality);
                };
                img.src = url;
            });
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
                const sameYear = date.getFullYear() === new Date().getFullYear();
                const p = (n) => String(n).padStart(2, '0');
                return sameYear
                    ? `${p(date.getMonth() + 1)}-${p(date.getDate())}`
                    : `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
            }
            return utils.formatDateShort(dateString);
        },

        pad2(n) {
            return String(n == null ? 0 : n).padStart(2, '0');
        },

        formatDateKey(value) {
            const d = value instanceof Date ? value : utils.parseDate(value);
            if (!d || isNaN(d.getTime())) return '';
            return d.getFullYear() + '-' + utils.pad2(d.getMonth() + 1) + '-' + utils.pad2(d.getDate());
        },

        formatDateTimeHyphen(value, withSeconds = false) {
            const d = value instanceof Date ? value : utils.parseDate(value);
            if (!d || isNaN(d.getTime())) return '';
            const base = utils.formatDateKey(d) + ' ' + utils.pad2(d.getHours()) + ':' + utils.pad2(d.getMinutes());
            return withSeconds ? base + ':' + utils.pad2(d.getSeconds()) : base;
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

        isDarkTheme() {
            return document.documentElement.getAttribute('data-theme') === 'dark';
        },

        chartText(darkColor = '#a0a0a0', lightColor = '#333') {
            return utils.isDarkTheme() ? darkColor : lightColor;
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

        getPathPrefix() {
            if (window.PATH_PREFIX) return window.PATH_PREFIX;
            const scripts = document.querySelectorAll('script[src]');
            for (const script of scripts) {
                const src = script.getAttribute('src');
                if (src && src.startsWith('/') && !src.startsWith('//')) {
                    const match = src.match(/^\/([^/]+)\//);
                    if (match && match[1] !== 'static' && match[1] !== 'api') {
                        window.PATH_PREFIX = '/' + match[1];
                        return window.PATH_PREFIX;
                    }
                }
            }
            window.PATH_PREFIX = '';
            return '';
        },

        copyToClipboard(text) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(text).then(() => true).catch(() => utils._copyFallback(text));
            }
            return Promise.resolve(utils._copyFallback(text));
        },

        _copyFallback(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            textarea.remove();
            return ok;
        },

        copyText(text, opts = {}) {
            return utils.copyToClipboard(text).then((ok) => {
                if (ok) {
                    if (opts.success) utils.showToast(opts.success, opts.type || 'success');
                } else if (opts.fail) {
                    utils.showToast(opts.fail, 'error');
                }
                return ok;
            });
        },

        showToast(message, type = 'info', options = {}) {
            if (typeof window.showToast !== 'function') return;
            const opts = options || {};
            if (opts.center) {
                window.showToast(message, type, { duration: opts.duration || 3000, center: true });
            } else {
                window.showToast(message, type, opts.duration || 3000);
            }
        },

        confirm(message, title = '操作确认', options = {}) {
            if (typeof window.nuxConfirm !== 'function') return Promise.resolve(false);
            return window.nuxConfirm(message, title, options);
        },

        prefersReducedMotion() {
            try {
                return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
            } catch (e) { return false; }
        },

        injectStyle(id, css) {
            if (!id || document.getElementById(id)) return;
            const style = document.createElement('style');
            style.id = id;
            style.textContent = Array.isArray(css) ? css.join('\n') : css;
            (document.head || document.documentElement).appendChild(style);
        },

        motionDuration(ms) {
            return utils.prefersReducedMotion() ? 0 : ms;
        },

        ssoCookieDomain() {
            try {
                const host = window.location.hostname || '';
                if (host === 'localhost' || host === '127.0.0.1') return null;
                return (host === 'songguokr.com' || host.endsWith('.songguokr.com')) ? SSO_COOKIE_DOMAIN : null;
            } catch (e) { return null; }
        },

        markSsoLogout() {
            try { window.localStorage.removeItem(SSO_EPOCH_KEY); } catch (e) {}
            if (!utils.ssoCookieDomain()) return;
            try {
                document.cookie = SSO_LOGOUT_COOKIE + '=' + Date.now() +
                    ';Domain=' + SSO_COOKIE_DOMAIN + ';Path=/;Max-Age=' + SSO_LOGOUT_MAX_AGE + ';SameSite=Lax';
            } catch (e) {}
        },

        ssoLogoutPending() {
            if (!utils.ssoCookieDomain()) return false;
            try {
                const epoch = window.localStorage.getItem(SSO_EPOCH_KEY);
                if (!epoch) return false;
                const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + SSO_LOGOUT_COOKIE + '=(\\d+)'));
                if (!m) return false;
                return parseInt(m[1], 10) > parseInt(epoch, 10);
            } catch (e) { return false; }
        },

        ssoSessionGuard() {
            if (!utils.ssoLogoutPending()) return false;
            utils.clearAuthState();
            return true;
        },

        createDualStorage(tokenKey = 'uc_access_token') {
            const read = (s, k) => { try { return s.getItem(k); } catch (e) { return null; } };
            const write = (s, k, v) => { try { s.setItem(k, v); } catch (e) {} };
            const clear = (s, k) => { try { s.removeItem(k); } catch (e) {} };
            const preferSession = () => read(window.sessionStorage, tokenKey) !== null;
            const SSO_COOKIE = 'uc_sso_token';
            const BRIDGE_KEYS = ['uc_access_token', 'uc_refresh_token', 'uc_token_expires_at'];
            const ssoDomain = () => utils.ssoCookieDomain();
            const readStorage = (key) => {
                const v = read(window.sessionStorage, key);
                if (v !== null) return v;
                return read(window.localStorage, key);
            };
            const readBridge = () => {
                const domain = ssoDomain();
                if (!domain) return null;
                try {
                    const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + SSO_COOKIE + '=([^;]+)'));
                    if (!m) return null;
                    const data = JSON.parse(decodeURIComponent(m[1]));
                    return data && data.a ? data : null;
                } catch (e) { return null; }
            };
            const bridgeValue = (key) => {
                const data = readBridge();
                if (!data) return null;
                if (key === 'uc_access_token') return data.a;
                if (key === 'uc_refresh_token') return data.r;
                if (key === 'uc_token_expires_at') return data.e !== undefined && data.e !== null ? String(data.e) : null;
                return null;
            };
            const writeBridge = () => {
                const domain = ssoDomain();
                if (!domain) return;
                const access = readStorage('uc_access_token');
                if (!access) return;
                const refresh = readStorage('uc_refresh_token');
                const expires = readStorage('uc_token_expires_at');
                const payload = encodeURIComponent(JSON.stringify({ a: access, r: refresh, e: expires ? parseInt(expires) : null }));
                const maxAge = preferSession() ? '' : ';Max-Age=' + (30 * 24 * 3600);
                try {
                    document.cookie = SSO_COOKIE + '=' + payload + ';Domain=' + domain + ';Path=/;SameSite=Lax' + maxAge;
                } catch (e) {}
            };
            const clearBridge = () => {
                const domain = ssoDomain();
                if (!domain) return;
                try {
                    document.cookie = SSO_COOKIE + '=;Domain=' + domain + ';Path=/;Max-Age=0';
                } catch (e) {}
            };
            return {
                getItem(key) {
                    const v = readStorage(key);
                    if (v !== null) return v;
                    return BRIDGE_KEYS.indexOf(key) !== -1 ? bridgeValue(key) : null;
                },
                setItem(key, value) {
                    const useSession = preferSession();
                    write(useSession ? window.sessionStorage : window.localStorage, key, value);
                    clear(useSession ? window.localStorage : window.sessionStorage, key);
                    if (key === tokenKey && value) {
                        try { window.localStorage.setItem(SSO_EPOCH_KEY, String(Date.now())); } catch (e) {}
                    }
                    if (BRIDGE_KEYS.indexOf(key) !== -1) writeBridge();
                },
                removeItem(key) {
                    clear(window.sessionStorage, key);
                    clear(window.localStorage, key);
                    if (BRIDGE_KEYS.indexOf(key) !== -1) clearBridge();
                }
            };
        },

        authToken() {
            return utils.createDualStorage('uc_access_token').getItem() || '';
        },

        clearAuthState() {
            try {
                const ds = utils.createDualStorage('uc_access_token');
                ['uc_access_token', 'uc_refresh_token', 'uc_token_expires_at'].forEach((k) => ds.removeItem(k));
            } catch (e) {}
            try { window.localStorage.removeItem(SSO_EPOCH_KEY); } catch (e) {}
            try { window.dispatchEvent(new CustomEvent('uc:authchange', { detail: { authenticated: false } })); } catch (e) {}
        },

        consumeReturnUrl() {
            try {
                const v = window.sessionStorage.getItem('nux_return_url');
                if (v) window.sessionStorage.removeItem('nux_return_url');
                return v;
            } catch (e) { return null; }
        },

        handleUnauthorized(opts = {}) {
            utils.clearAuthState();
            const msg = opts.message || '登录已过期，请重新登录';
            utils.showToast(msg, 'error');
            const redirect = opts.redirect || utils.consumeReturnUrl() || window.location.pathname + window.location.search;
            setTimeout(() => {
                const target = '/login.html?redirect=' + encodeURIComponent('/' + String(redirect).replace(/^\/+/, ''));
                window.location.href = target;
            }, opts.delay || 1200);
        }
    };

    utils.setViewportHeight();
    utils._resizeHandler = utils.debounce(utils.setViewportHeight, 100);
    window.addEventListener('resize', utils._resizeHandler);

    utils.errorDetailText = function (v) {
        if (v === null || v === undefined) return '';
        if (typeof v === 'string') return v.trim();
        if (Array.isArray(v)) {
            return v.map(function (item) {
                if (item === null || item === undefined) return '';
                if (typeof item === 'string') return item;
                if (typeof item === 'object') {
                    return String(item.msg || item.message || item.detail || '').replace(/^Value error,\s*/, '');
                }
                return String(item);
            }).filter(Boolean).join('；');
        }
        if (typeof v === 'object') {
            var inner = v.message || v.detail || v.msg || v.error;
            if (inner === undefined || inner === v) return '';
            return utils.errorDetailText(inner);
        }
        return String(v);
    };

    utils.FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    utils.focusables = function (root) {
        if (!root) return [];
        return Array.prototype.slice.call(root.querySelectorAll(utils.FOCUSABLE_SELECTOR)).filter(function (el) {
            return el.offsetParent !== null;
        });
    };

    utils.overlayStack = function () {
        const stack = [];
        return {
            push(uid) { stack.push(uid); },
            remove(uid) { const i = stack.indexOf(uid); if (i > -1) stack.splice(i, 1); },
            isTop(uid) { return stack[stack.length - 1] === uid; }
        };
    };

    utils.overlayBehavior = function (options) {
        const opts = options || {};
        const canInteract = opts.canInteract || (() => true);
        const escEnabled = opts.escEnabled || (() => true);
        let restoreEl = null;
        let active = false;

        function trapTab(e) {
            const panel = opts.panel ? opts.panel() : null;
            if (!panel) return;
            const list = utils.focusables(panel);
            if (!list.length) return;
            const first = list[0];
            const last = list[list.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }

        function onKeydown(e) {
            if (!canInteract()) return;
            if (e.key === 'Escape') {
                if (escEnabled()) opts.requestClose();
                return;
            }
            if (e.key === 'Tab' && opts.trap !== false) trapTab(e);
        }

        function focusPanel() {
            let el = opts.focusEl ? opts.focusEl() : null;
            if (!el && opts.panel) {
                const list = utils.focusables(opts.panel());
                el = list.length ? list[0] : null;
            }
            if (el && el.focus) {
                try { el.focus(); } catch (e) { }
            }
        }

        function acquire() {
            if (active) return;
            active = true;
            if (opts.stack) opts.stack.push(opts.uid);
            if (utils.scrollLock) utils.scrollLock.lock();
            if (document.activeElement && document.activeElement !== document.body) {
                restoreEl = document.activeElement;
            }
            document.addEventListener('keydown', onKeydown);
            const schedule = (window.Vue && Vue.nextTick) ? Vue.nextTick
                : (window.requestAnimationFrame ? window.requestAnimationFrame : function (fn) { fn(); });
            schedule(focusPanel);
        }

        function release() {
            if (!active) return;
            active = false;
            document.removeEventListener('keydown', onKeydown);
            if (opts.stack) opts.stack.remove(opts.uid);
            if (utils.scrollLock) utils.scrollLock.unlock();
            if (restoreEl && restoreEl.focus) {
                try { restoreEl.focus(); } catch (e) { }
            }
            restoreEl = null;
        }

        return { acquire, release };
    };

    window.NexusUtils = utils;
})();

/* ===== nexus-overlay-host.js ===== */
(function () {
    'use strict';

    const TOAST_ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const TOAST_MS = 3000;
    const UNLOCK_MS = 4000;
    const LEAVE_MS = 220;

    function pickDuration(value, fallback) {
        if (typeof value === 'number' && value > 0) return value;
        if (value && typeof value.duration === 'number' && value.duration > 0) return value.duration;
        return fallback;
    }

    function ensureHost(id, className) {
        let host = document.getElementById(id);
        if (!host) {
            host = document.createElement('div');
            host.id = id;
            host.className = className;
            document.body.appendChild(host);
        }
        return host;
    }

    function enter(el) {
        requestAnimationFrame(function () { el.classList.add('is-in'); });
    }

    function leave(el) {
        if (!el || el.dataset.nxLeaving) return;
        el.dataset.nxLeaving = '1';
        el.classList.remove('is-in');
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, LEAVE_MS);
    }

    function showToast(message, type, durationValue) {
        if (!message) return;
        const kind = TOAST_ICONS[type] ? type : 'info';
        // 第三个参数兼容两种形态：数字=时长（旧行为），对象={duration, center}
        const opts = (durationValue && typeof durationValue === 'object') ? durationValue : {};
        const centered = opts.center === true;
        const host = centered
            ? ensureHost('nux-toast-host-center', 'nux-toast-container nux-toast-container--center')
            : ensureHost('nux-toast-host', 'nux-toast-container');
        const item = document.createElement('div');
        item.className = 'nux-toast-item nux-toast-' + kind;
        item.setAttribute('role', 'status');
        item.setAttribute('aria-live', 'polite');

        const icon = document.createElement('span');
        icon.className = 'nux-toast-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = TOAST_ICONS[kind];

        const msg = document.createElement('span');
        msg.className = 'nux-toast-msg';
        msg.textContent = message;

        item.appendChild(icon);
        item.appendChild(msg);
        host.appendChild(item);
        enter(item);

        const timer = setTimeout(function () { leave(item); }, pickDuration(durationValue, TOAST_MS));
        item.addEventListener('click', function () {
            clearTimeout(timer);
            leave(item);
        });
    }

    function showUnlock(options) {
        const opts = options || {};
        const host = ensureHost('nux-unlock-host', 'nux-unlock-container');
        const card = document.createElement('div');
        card.className = 'nux-unlock-card';
        card.innerHTML = '<span class="nux-unlock-burst" aria-hidden="true"></span>' +
            '<span class="nux-unlock-icon" aria-hidden="true"></span>' +
            '<div class="nux-unlock-body"><p class="nux-unlock-label">成就解锁</p>' +
            '<p class="nux-unlock-title"></p><p class="nux-unlock-desc"></p></div>';

        card.querySelector('.nux-unlock-icon').textContent = opts.icon || '🏆';
        card.querySelector('.nux-unlock-title').textContent = opts.title || '新成就';
        const desc = card.querySelector('.nux-unlock-desc');
        if (opts.desc) desc.textContent = opts.desc;
        else desc.remove();

        host.appendChild(card);
        enter(card);

        const timer = setTimeout(function () { leave(card); }, pickDuration(opts.duration, UNLOCK_MS));
        card.addEventListener('click', function () {
            clearTimeout(timer);
            leave(card);
        });
    }

    const confirmQueue = [];
    let confirmNode = null;

    function buildConfirm() {
        const overlay = document.createElement('div');
        overlay.className = 'nx-modal-overlay nux-confirm-overlay';
        overlay.innerHTML = '<div class="nx-modal" style="max-width:400px" role="alertdialog" aria-modal="true">' +
            '<div class="nx-modal-title"></div><p class="nux-confirm-msg"></p>' +
            '<div class="nux-modal-footer">' +
            '<button class="nux-btn nux-btn--ghost" type="button" data-role="cancel"></button>' +
            '<button class="nux-btn nux-btn--primary" type="button" data-role="confirm"></button>' +
            '</div></div>';

        const dialog = overlay.firstElementChild;
        const cancelBtn = dialog.querySelector('[data-role="cancel"]');
        const confirmBtn = dialog.querySelector('[data-role="confirm"]');

        overlay.addEventListener('click', function (evt) {
            if (evt.target === overlay) settleConfirm(false);
        });
        cancelBtn.addEventListener('click', function () { settleConfirm(false); });
        confirmBtn.addEventListener('click', function () { settleConfirm(true); });

        return {
            overlay: overlay,
            title: dialog.querySelector('.nx-modal-title'),
            message: dialog.querySelector('.nux-confirm-msg'),
            confirmBtn: confirmBtn,
            cancelBtn: cancelBtn,
            resolve: null
        };
    }

    document.addEventListener('keydown', function (evt) {
        if (evt.key === 'Escape' && confirmNode) settleConfirm(false);
    });

    function settleConfirm(value) {
        if (!confirmNode) return;
        const node = confirmNode;
        if (value === true && typeof node.onConfirm === 'function' && !node.busy) {
            node.busy = true;
            node.confirmBtn.disabled = true;
            const origText = node.confirmText;
            node.confirmBtn.textContent = '…';
            Promise.resolve().then(function () { return node.onConfirm(); })
                .then(function () { finishConfirm(true); })
                .catch(function (e) {
                    if (window.showToast) window.showToast((e && e.message) || '操作失败', 'error');
                    node.busy = false;
                    node.confirmBtn.disabled = false;
                    node.confirmBtn.textContent = origText;
                    if (node.countdown > 0) startCountdown(node);
                });
            return;
        }
        finishConfirm(value);
    }

    function finishConfirm(value) {
        if (!confirmNode) return;
        const node = confirmNode;
        if (node.countdownTimer) clearInterval(node.countdownTimer);
        confirmNode = null;
        const resolve = node.resolve;
        node.resolve = null;
        leave(node.overlay);
        if (resolve) resolve(value);
        const next = confirmQueue.shift();
        if (next) showConfirm(next);
    }

    function startCountdown(node) {
        if (node.countdownTimer) clearInterval(node.countdownTimer);
        let remain = node.countdown;
        node.confirmBtn.disabled = true;
        node.confirmBtn.textContent = node.confirmText + '（' + remain + 's）';
        node.countdownTimer = setInterval(function () {
            remain -= 1;
            if (remain <= 0) {
                clearInterval(node.countdownTimer);
                node.countdownTimer = null;
                node.confirmBtn.disabled = false;
                node.confirmBtn.textContent = node.confirmText;
            } else {
                node.confirmBtn.textContent = node.confirmText + '（' + remain + 's）';
            }
        }, 1000);
    }

    function showConfirm(item) {
        const node = buildConfirm();
        node.title.textContent = item.title;
        node.title.style.display = item.title ? '' : 'none';
        node.message.textContent = item.message;
        node.confirmBtn.textContent = item.confirmText;
        node.confirmBtn.className = 'nux-btn ' + (item.confirmType === 'danger' ? 'nux-btn--danger' : 'nux-btn--primary');
        node.cancelBtn.textContent = item.cancelText;
        node.cancelBtn.style.display = item.showCancel ? '' : 'none';
        node.resolve = item.resolve;
        node.onConfirm = item.onConfirm;
        node.confirmText = item.confirmText;
        node.countdown = item.countdown;
        node.countdownTimer = null;
        node.busy = false;
        document.body.appendChild(node.overlay);
        confirmNode = node;
        enter(node.overlay);
        if (node.countdown > 0) startCountdown(node);
        else node.confirmBtn.focus();
    }

    function confirm(message, title, options) {
        const opts = options || {};
        return new Promise(function (resolve) {
            const item = {
                message: message,
                title: title || '确认操作',
                confirmText: opts.confirmText || '确定',
                cancelText: opts.cancelText || '取消',
                confirmType: opts.confirmType || 'primary',
                showCancel: opts.showCancel !== false,
                onConfirm: opts.onConfirm || null,
                countdown: opts.countdown || 0,
                resolve: resolve
            };
            if (confirmNode) confirmQueue.push(item);
            else showConfirm(item);
        });
    }

    const promptQueue = [];
    let promptNode = null;

    function settlePrompt(value) {
        if (!promptNode) return;
        const node = promptNode;
        if (value === true) {
            const text = node.input.value.trim();
            if (node.required && !text) {
                node.error.textContent = node.requiredMessage;
                node.error.style.display = 'block';
                node.input.classList.add('is-invalid');
                node.input.focus();
                return;
            }
            finishPrompt(text);
            return;
        }
        finishPrompt(null);
    }

    function finishPrompt(value) {
        if (!promptNode) return;
        const node = promptNode;
        promptNode = null;
        const resolve = node.resolve;
        node.resolve = null;
        leave(node.overlay);
        if (resolve) resolve(value);
        const next = promptQueue.shift();
        if (next) showPrompt(next);
    }

    function showPrompt(item) {
        const overlay = document.createElement('div');
        overlay.className = 'nx-modal-overlay nux-confirm-overlay';
        overlay.innerHTML = '<div class="nx-modal nux-prompt-modal" role="dialog" aria-modal="true" aria-label="' + (item.title || '输入') + '">' +
            '<div class="nx-modal-title"></div>' +
            '<p class="nux-confirm-msg nux-prompt-msg"></p>' +
            '<textarea class="nux-input nux-prompt-input" aria-describedby="nux-prompt-error"></textarea>' +
            '<p class="nux-prompt-error" id="nux-prompt-error" role="alert"></p>' +
            '<div class="nux-modal-footer">' +
            '<button class="nux-btn nux-btn--ghost" type="button" data-role="cancel"></button>' +
            '<button class="nux-btn nux-btn--primary" type="button" data-role="confirm"></button>' +
            '</div></div>';

        const dialog = overlay.firstElementChild;
        const node = {
            overlay: overlay,
            input: dialog.querySelector('.nux-prompt-input'),
            error: dialog.querySelector('.nux-prompt-error'),
            confirmBtn: dialog.querySelector('[data-role="confirm"]'),
            resolve: item.resolve,
            required: item.required,
            requiredMessage: item.requiredMessage
        };
        node.error.style.display = 'none';
        dialog.querySelector('.nx-modal-title').textContent = item.title;
        dialog.querySelector('.nx-modal-title').style.display = item.title ? '' : 'none';
        const msg = dialog.querySelector('.nux-prompt-msg');
        msg.textContent = item.message || '';
        msg.style.display = item.message ? '' : 'none';
        node.input.rows = item.rows;
        node.input.placeholder = item.placeholder || '';
        node.input.value = item.value || '';
        node.confirmBtn.textContent = item.confirmText;
        node.confirmBtn.className = 'nux-btn nux-btn--' + item.confirmType;
        dialog.querySelector('[data-role="cancel"]').textContent = item.cancelText;

        overlay.addEventListener('click', function (evt) {
            if (evt.target === overlay) settlePrompt(null);
        });
        dialog.querySelector('[data-role="cancel"]').addEventListener('click', function () { settlePrompt(null); });
        node.confirmBtn.addEventListener('click', function () { settlePrompt(true); });
        node.input.addEventListener('input', function () {
            node.error.style.display = 'none';
            node.input.classList.remove('is-invalid');
        });
        node.input.addEventListener('keydown', function (evt) {
            if (evt.key !== 'Enter') return;
            if (node.input.rows > 1 && !(evt.metaKey || evt.ctrlKey)) return;
            evt.preventDefault();
            settlePrompt(true);
        });

        document.body.appendChild(overlay);
        promptNode = node;
        enter(overlay);
        node.input.focus();
        node.input.select();
    }

    document.addEventListener('keydown', function (evt) {
        if (evt.key === 'Escape' && promptNode) settlePrompt(null);
    });

    function prompt(options) {
        const opts = options || {};
        return new Promise(function (resolve) {
            const item = {
                title: opts.title || '',
                message: opts.message || '',
                value: opts.value || '',
                placeholder: opts.placeholder || '',
                rows: opts.rows > 0 ? opts.rows : 3,
                required: opts.required === true,
                requiredMessage: opts.requiredMessage || '请输入内容',
                confirmText: opts.confirmText || '确定',
                cancelText: opts.cancelText || '取消',
                confirmType: ['danger', 'success'].indexOf(opts.confirmType) > -1 ? opts.confirmType : 'primary',
                resolve: resolve
            };
            if (promptNode) promptQueue.push(item);
            else showPrompt(item);
        });
    }

    window.showToast = showToast;
    window.showUnlock = showUnlock;
    window.nuxConfirm = confirm;
    window.nuxPrompt = prompt;
})();

/* ===== nexus-validators.js ===== */
(function() {
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const PHONE_RE = /^1[3-9]\d{9}$/;
    const URL_RE = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(:\d+)?(\/[^\s]*)?$/;
    const ID_CARD_RE = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;

    function _isEmpty(value) {
        if (value === null || value === undefined) return true;
        if (typeof value === 'string') return value.trim() === '';
        if (Array.isArray(value)) return value.length === 0;
        return false;
    }

    function _toStr(value) {
        if (value === null || value === undefined) return '';
        return String(value);
    }

    function required(message = '此字段必填') {
        return (value) => _isEmpty(value) ? message : '';
    }

    function requiredIf(predicate, message = '此字段必填') {
        return (value, allValues) => {
            if (!predicate(allValues, value)) return '';
            return _isEmpty(value) ? message : '';
        };
    }

    function minLength(n, message) {
        const min = Number(n);
        return (value) => {
            if (_isEmpty(value)) return '';
            const len = _toStr(value).length;
            return len < min ? (message || `至少需要${min}个字符`) : '';
        };
    }

    function maxLength(n, message) {
        const max = Number(n);
        return (value) => {
            if (_isEmpty(value)) return '';
            const len = _toStr(value).length;
            return len > max ? (message || `最多${max}个字符`) : '';
        };
    }

    function email(message = '请输入有效的邮箱地址') {
        return (value) => {
            if (_isEmpty(value)) return '';
            return EMAIL_RE.test(_toStr(value).trim()) ? '' : message;
        };
    }

    function phone(message = '请输入有效的手机号') {
        return (value) => {
            if (_isEmpty(value)) return '';
            return PHONE_RE.test(_toStr(value).trim()) ? '' : message;
        };
    }

    function url(message = '请输入有效的URL') {
        return (value) => {
            if (_isEmpty(value)) return '';
            const s = _toStr(value).trim();
            if (URL_RE.test(s)) return '';
            try { new URL(s); return ''; } catch (e) { return message; }
        };
    }

    function number(message = '请输入数字') {
        return (value) => {
            if (_isEmpty(value)) return '';
            return isNaN(Number(value)) ? message : '';
        };
    }

    function integer(message = '请输入整数') {
        return (value) => {
            if (_isEmpty(value)) return '';
            const s = _toStr(value).trim();
            return /^-?\d+$/.test(s) ? '' : message;
        };
    }

    function range(min, max, message) {
        const lo = Number(min);
        const hi = Number(max);
        return (value) => {
            if (_isEmpty(value)) return '';
            const n = Number(value);
            if (isNaN(n)) return message || `请输入 ${lo}-${hi} 之间的数字`;
            return (n < lo || n > hi) ? (message || `数值应在 ${lo}-${hi} 之间`) : '';
        };
    }

    function min(minVal, message) {
        const lo = Number(minVal);
        return (value) => {
            if (_isEmpty(value)) return '';
            const n = Number(value);
            if (isNaN(n)) return message || `不能小于 ${lo}`;
            return n < lo ? (message || `不能小于 ${lo}`) : '';
        };
    }

    function max(maxVal, message) {
        const hi = Number(maxVal);
        return (value) => {
            if (_isEmpty(value)) return '';
            const n = Number(value);
            if (isNaN(n)) return message || `不能大于 ${hi}`;
            return n > hi ? (message || `不能大于 ${hi}`) : '';
        };
    }

    function pattern(regex, message = '格式不正确') {
        const re = regex instanceof RegExp ? regex : new RegExp(regex);
        return (value) => {
            if (_isEmpty(value)) return '';
            return re.test(_toStr(value)) ? '' : message;
        };
    }

    function idCard(message = '请输入有效的身份证号') {
        return (value) => {
            if (_isEmpty(value)) return '';
            return ID_CARD_RE.test(_toStr(value).trim()) ? '' : message;
        };
    }

    function oneOf(list, message = '取值无效') {
        const arr = Array.isArray(list) ? list : [list];
        return (value) => {
            if (_isEmpty(value)) return '';
            return arr.includes(value) ? '' : message;
        };
    }

    function custom(fn, message = '校验失败') {
        return (value, allValues) => {
            if (_isEmpty(value)) return '';
            try {
                const ok = fn(value, allValues);
                if (ok instanceof Promise) {
                    return ok.then(real => real ? '' : message);
                }
                return ok ? '' : message;
            } catch (e) {
                return message;
            }
        };
    }

    function composeValidators(...validators) {
        const fns = validators.filter(Boolean);
        return (value, allValues) => {
            for (const v of fns) {
                const result = v(value, allValues);
                if (result) return result;
            }
            return '';
        };
    }

    function validateField(value, validators, allValues) {
        if (!validators) return '';
        const arr = Array.isArray(validators) ? validators : [validators];
        return composeValidators(...arr)(value, allValues);
    }

    function validateForm(form, rules) {
        const errors = {};
        const allValues = form || {};
        for (const [field, validators] of Object.entries(rules || {})) {
            if (!validators) continue;
            const err = validateField(allValues[field], validators, allValues);
            if (err) errors[field] = err;
        }
        return {
            valid: Object.keys(errors).length === 0,
            errors
        };
    }

    function validateFields(form, fields, rules) {
        const errors = {};
        const allValues = form || {};
        for (const field of fields) {
            const validators = rules && rules[field];
            if (!validators) continue;
            const err = validateField(allValues[field], validators, allValues);
            if (err) errors[field] = err;
        }
        return {
            valid: Object.keys(errors).length === 0,
            errors
        };
    }

    function makeFieldValidator(rules) {
        return (form) => validateForm(form, rules);
    }

    const NexusValidators = {
        isEmpty: _isEmpty,
        required, requiredIf,
        minLength, maxLength,
        email, phone, url,
        number, integer, range, min, max,
        pattern, idCard, oneOf, custom,
        composeValidators,
        validateField, validateForm, validateFields,
        makeFieldValidator
    };

    window.NexusValidators = NexusValidators;
})();

/* ===== nexus-api-error.js ===== */
(function() {
    const NETWORK_ERROR_PATTERNS = [
        'Failed to fetch',
        'NetworkError when attempting to fetch resource',
        'Network request failed',
        'Load failed',
        'ERR_NETWORK',
        'ERR_INTERNET_DISCONNECTED',
        'ERR_CONNECTION_REFUSED',
        'ERR_CONNECTION_RESET',
        'ERR_CONNECTION_CLOSED',
        'ERR_ABORTED'
    ];

    const DEFAULT_ERROR_MAP = {
        400: '请求参数有误，请检查后重试',
        401: '登录已过期，请重新登录',
        402: '积分余额不足，请充值后重试',
        403: '没有权限执行此操作',
        404: '请求的资源不存在',
        408: '请求超时，请稍后重试',
        409: '数据冲突，请刷新后重试',
        422: '提交的数据有误，请检查后重试',
        429: '操作过于频繁，请稍后再试',
        500: '服务器开小差了，请稍后重试',
        502: '网关错误，服务暂时不可用',
        503: '服务暂时不可用，请稍后重试',
        504: '网关超时，请稍后重试'
    };

    class NexusApiError extends Error {
        constructor(message, status = null, response = null, code = null) {
            super(message);
            this.name = 'NexusApiError';
            this.status = status;
            this.response = response;
            this.code = code;
            this.errorCode = code;
            this.isNetwork = false;
        }
    }

    const ERROR_CODE_TEXT_MAP = {
        'RATE_LIMIT_EXCEEDED': '操作过于频繁，请稍后再试',
        'AUTH_ERROR': '登录已失效，请重新登录',
        'INSUFFICIENT_CREDITS': '积分余额不足，请充值后重试',
        'FORBIDDEN': '没有权限执行此操作',
        'NOT_FOUND': '请求的资源不存在',
        'VALIDATION_ERROR': '提交的数据有误，请检查后重试',
        'CONFLICT': '数据冲突，请刷新后重试',
        'BAD_REQUEST': '请求参数有误，请检查后重试',
        'INTERNAL_ERROR': '服务器开小差了，请稍后重试',
        'EXTERNAL_SERVICE_ERROR': '外部服务暂时不可用，请稍后重试',
        'SERVICE_UNAVAILABLE': '服务暂时不可用，请稍后重试',
        'XIANYU_AUTH_ERROR': '闲鱼认证失效，请重新登录闲鱼',
        'XIANYU_RATE_LIMIT': '闲鱼请求过于频繁，请稍后再试',
        'RATE_LIMITED': '操作过于频繁，请稍后再试'
    };

    function isNetworkError(err) {
        if (!err) return false;
        if (err.isNetwork === true) return true;
        const msg = err.message || String(err);
        return NETWORK_ERROR_PATTERNS.some(p => msg.includes(p));
    }

    function isTimeoutError(err) {
        if (!err) return false;
        return err.name === 'AbortError' ||
               (err.message && err.message.includes('timeout')) ||
               (err.status === 408);
    }

    function mapHttpError(err, context = {}) {
        if (!err) return '未知错误';
        if (err.errorCode && ERROR_CODE_TEXT_MAP[err.errorCode]) {
            return ERROR_CODE_TEXT_MAP[err.errorCode];
        }
        if (err.name === 'NexusApiError' && err.status) {
            const custom = context[err.status];
            if (custom) return custom;
            const mapped = DEFAULT_ERROR_MAP[err.status];
            if (mapped) return mapped;
            if (err.status >= 500) return '服务器暂时不可用，请稍后重试';
            if (err.status >= 400) return err.message || '请求失败';
            return err.message || '请求失败';
        }
        if (isNetworkError(err)) {
            return '网络连接失败，请检查网络后重试';
        }
        if (isTimeoutError(err)) {
            return '请求超时，请稍后重试';
        }
        if (err.name === 'AbortError') {
            return '请求超时，请稍后重试';
        }
        const msg = err.message || String(err);
        if (NETWORK_ERROR_PATTERNS.some(p => msg.includes(p))) {
            return '网络连接失败，请检查网络后重试';
        }
        if (msg === 'Failed to fetch' || msg.includes('Failed to fetch')) {
            return '网络连接失败，请检查网络后重试';
        }
        return msg || '操作失败';
    }

    function isInsufficientCreditsError(err) {
        if (!err) return false;
        if (err.status === 402) return true;
        const code = err.errorCode || err.code || '';
        if (code === 'INSUFFICIENT_CREDITS') return true;
        const msg = err.message || String(err);
        return msg.indexOf('余额不足') !== -1;
    }

    window.NexusApiError = NexusApiError;
    window.isNetworkError = isNetworkError;
    window.isInsufficientCreditsError = isInsufficientCreditsError;
    window.mapHttpError = mapHttpError;
})();

/* ===== nexus-stream.js ===== */
(function () {
    const DEFAULT_IDLE_TIMEOUT = 90000;

    class NexusStreamError extends Error {
        constructor(message, status, code) {
            super(message);
            this.name = 'NexusStreamError';
            this.status = status;
            this.code = code || null;
        }
    }

    // SSE 帧解析单一实现。priority 决定事件名判定策略：
    // - 'data-type'：data.type 优先（NexusStream 默认约定）
    // - 'sse-event'：event: 行优先，无则 null（NexusApi.streamPost 约定）
    // - 'data-type-then-sse-event'：data.type → event: 行 → defaultEvent（ChatController 约定）
    function _parseSseLine(line, opts) {
        const { defaultEvent = 'message', priority = 'data-type', state = null } = opts || {};
        if (state && line === '') {
            state.sseEvent = null;
            return null;
        }
        if (state && /^event:/.test(line)) {
            state.sseEvent = line.slice(6).trim();
            return null;
        }
        const match = /^data:\s?/.exec(line);
        if (!match) return null;
        const raw = line.slice(match[0].length).trim();
        if (!raw || raw === '[DONE]') return null;
        let data = raw;
        try { data = JSON.parse(raw); } catch (e) { }
        const hasType = data && typeof data === 'object' && !Array.isArray(data) && data.type;
        let event;
        if (priority === 'sse-event') {
            event = state ? state.sseEvent : null;
        } else if (priority === 'data-type-then-sse-event') {
            event = hasType || (state && state.sseEvent) || defaultEvent;
        } else {
            event = hasType || defaultEvent;
        }
        return { event, data, raw };
    }

    async function* post(url, options = {}) {
        const {
            body,
            headers,
            signal = null,
            idleTimeout = DEFAULT_IDLE_TIMEOUT,
            onUnauthorized = null,
            clearAuth = null,
            defaultEvent = 'message',
            priority = 'data-type',
            method = 'POST',
        } = options;

        const ctrl = new AbortController();
        let watchdog = null;
        let timedOut = false;
        const abort = () => { try { ctrl.abort(); } catch (e) { } };
        const resetWatchdog = () => {
            if (!idleTimeout) return;
            if (watchdog) clearTimeout(watchdog);
            watchdog = setTimeout(() => { timedOut = true; abort(); }, idleTimeout);
        };
        if (signal && signal.aborted) abort();
        if (signal) signal.addEventListener('abort', abort, { once: true });
        resetWatchdog();

        try {
            const resp = await fetch(url, {
                method,
                headers,
                body,
                signal: ctrl.signal,
            });
            if (!resp.ok) {
                if (resp.status === 401) {
                    if (clearAuth) clearAuth();
                    if (onUnauthorized) onUnauthorized();
                    throw new NexusStreamError('登录已过期，请重新登录', 401);
                }
                const text = await resp.text().catch(() => '');
                throw new NexusStreamError('HTTP ' + resp.status + ' ' + text.slice(0, 200), resp.status);
            }
            if (!resp.body) return;

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            const state = { sseEvent: null };
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                resetWatchdog();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    const evt = _parseSseLine(line, { defaultEvent, priority, state });
                    if (evt) yield evt;
                }
            }
            if (buffer) {
                const evt = _parseSseLine(buffer, { defaultEvent, priority, state });
                if (evt) yield evt;
            }
        } catch (e) {
            if (timedOut) throw new NexusStreamError('连接超时，请重试', null, 'timeout');
            throw e;
        } finally {
            if (watchdog) clearTimeout(watchdog);
            if (signal) signal.removeEventListener('abort', abort);
            try { ctrl.abort(); } catch (e) { }
        }
    }

    async function read(response, options = {}) {
        const { onChunk, onDone, onError } = options;
        if (!response || !response.body) {
            if (onDone) onDone();
            return;
        }
        try {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    const evt = _parseSseLine(line, { defaultEvent: 'message' });
                    if (evt && onChunk) onChunk(evt.data, evt.event);
                }
            }
            if (buffer) {
                const evt = _parseSseLine(buffer, { defaultEvent: 'message' });
                if (evt && onChunk) onChunk(evt.data, evt.event);
            }
            if (onDone) onDone();
        } catch (e) {
            if (onError) onError(e);
            else throw e;
        }
    }

    async function consume(url, options = {}) {
        const { onEvent, onDone, onError } = options;
        try {
            for await (const evt of post(url, options)) {
                if (onEvent) onEvent(evt.event, evt.data, evt.raw);
            }
            if (onDone) onDone();
        } catch (e) {
            if (onError) onError(e);
            else throw e;
        }
    }

    window.NexusStream = { post, read, consume };
})();

/* ===== nexus-api.js ===== */
(function() {
    const DEFAULT_BASE_URL = (window.PATH_PREFIX || '') + '/api';
    const MAX_RETRY = 3;
    const MAX_ABORT_CONTROLLERS = 500;
    const BASE_DELAY = 1000;
    const MAX_DELAY = 30000;
    const ApiError = window.NexusApiError || Error;
    const NET_PATTERNS = ['Failed to fetch', 'NetworkError', 'Network request failed', 'Load failed'];

    function _isNetworkErr(err) {
        if (!err) return false;
        if (err.isNetwork === true) return true;
        const msg = err.message || '';
        return NET_PATTERNS.some(p => msg.includes(p));
    }

    function _errMsg(v) {
        if (window.NexusUtils && NexusUtils.errorDetailText) return NexusUtils.errorDetailText(v);
        if (v === null || v === undefined) return '';
        if (typeof v === 'string') return v;
        if (Array.isArray(v)) return v.join('；');
        if (typeof v === 'object') return v.message || v.detail || v.msg || v.error || '';
        return String(v);
    }

    class NexusApi {
        constructor(config = {}) {
            this.baseUrl = config.baseUrl !== undefined ? config.baseUrl : DEFAULT_BASE_URL;
            this.maxRetry = config.maxRetry || MAX_RETRY;
            this.tokenKey = config.tokenKey || 'token';
            this.userKey = config.userKey || 'user';
            this.refreshTokenKey = config.refreshTokenKey || null;
            this.refreshUrl = config.refreshUrl || null;
            this.refreshMethod = config.refreshMethod || 'POST';
            this.refreshBodyBuilder = config.refreshBodyBuilder || null;
            this.onUnauthorized = config.onUnauthorized || null;
            this.onRefreshSuccess = config.onRefreshSuccess || null;
            this.onError = config.onError || null;
            this.timeout = config.timeout || 30000;
            this.responseAdapter = config.responseAdapter || null;
            this.serviceHeaders = config.serviceHeaders || null;
            this.headerBuilder = config.headers || null;
            this.cacheTtl = (config.cache && config.cache.ttl) || 0;
            this._cache = new Map();
            this._pendingGet = new Map();
            this.storage = config.dualStorage && window.NexusUtils && typeof window.NexusUtils.createDualStorage === 'function'
                ? window.NexusUtils.createDualStorage(this.tokenKey)
                : (config.storage || localStorage);
            this.abortControllers = new Map();
            this._requestCounter = 0;
            this._refreshPromise = null;
        }

        _generateRequestId(url) {
            this._requestCounter = (this._requestCounter + 1) % Number.MAX_SAFE_INTEGER;
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `${url}_${crypto.randomUUID()}`;
            return `${url}_${Date.now()}_${this._requestCounter}_${Math.random().toString(36).substring(2)}`;
        }

        _registerController(requestId, controller) {
            if (this.abortControllers.size >= MAX_ABORT_CONTROLLERS) {
                const oldestKey = this.abortControllers.keys().next().value;
                this.abortControllers.delete(oldestKey);
            }
            this.abortControllers.set(requestId, controller);
        }

        _getToken() {
            try { return this.storage.getItem(this.tokenKey) || ''; } catch (e) { return ''; }
        }

        _setToken(token) {
            try { this.storage.setItem(this.tokenKey, token); } catch (e) {}
        }

        _getRefreshToken() {
            if (!this.refreshTokenKey) return '';
            try { return this.storage.getItem(this.refreshTokenKey) || ''; } catch (e) { return ''; }
        }

        _setRefreshToken(token) {
            if (!this.refreshTokenKey) return;
            try { this.storage.setItem(this.refreshTokenKey, token); } catch (e) {}
        }

        _clearAuth() {
            try {
                this.storage.removeItem(this.tokenKey);
                this.storage.removeItem(this.userKey);
                if (this.refreshTokenKey) this.storage.removeItem(this.refreshTokenKey);
            } catch (e) {}
        }

        _handleSessionExpired() {
            this._clearAuth();
            this._rememberReturnUrl();
            this._notifySessionExpired();
            if (this.onUnauthorized) this.onUnauthorized();
        }

        _rememberReturnUrl() {
            try {
                var path = window.location.pathname || '';
                if (/\/(login|register)(\.html)?$/.test(path)) return;
                var target = path + (window.location.search || '') + (window.location.hash || '');
                window.sessionStorage.setItem('nux_return_url', target);
            } catch (e) {}
        }

        _notifySessionExpired() {
            var now = Date.now();
            if (this._sessionExpiredNotifiedAt && now - this._sessionExpiredNotifiedAt < 5000) return;
            this._sessionExpiredNotifiedAt = now;
            if (window.NexusUtils && typeof NexusUtils.showToast === 'function') {
                NexusUtils.showToast('登录已过期，请重新登录', 'error', { duration: 4000 });
            }
        }

        _buildHeaders(extra) {
            const token = this._getToken();
            const dynamic = this.headerBuilder ? (this.headerBuilder() || {}) : {};
            return {
                'Content-Type': 'application/json',
                ...(this.serviceHeaders || {}),
                ...dynamic,
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...extra
            };
        }

        async _doFetch(url, options, controller) {
            const response = await fetch(`${this.baseUrl}${url}`, {
                ...options, headers: this._buildHeaders(options.headers), signal: controller.signal
            });
            let data;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                try { data = JSON.parse(text); } catch { data = { detail: text }; }
            }
            if (this.responseAdapter) data = this.responseAdapter(data, response);
            return { response, data };
        }

        _extractError(data) {
            if (data.success === false) return _errMsg(data.message) || _errMsg(data.error) || '操作失败';
            if (data.error) return _errMsg(data.error);
            if (data.message) return _errMsg(data.message);
            if (data.detail) return _errMsg(data.detail);
            return '请求失败';
        }

        _extractErrorCode(data) {
            if (!data || typeof data !== 'object') return null;
            const code = data.error_code || data.errorCode || data.code;
            if (code == null) return null;
            return typeof code === 'string' ? code : String(code);
        }

        async _tryRefresh() {
            if (this._refreshPromise) return this._refreshPromise;
            const refreshToken = this._getRefreshToken();
            if (!this.refreshUrl || !refreshToken) return Promise.reject(new Error('no refresh config'));
            const body = this.refreshBodyBuilder ? this.refreshBodyBuilder(refreshToken) : { refresh_token: refreshToken };
            const refreshController = new AbortController();
            const refreshTimeoutId = setTimeout(() => refreshController.abort(), this.timeout || 30000);
            this._refreshPromise = fetch(`${this.baseUrl}${this.refreshUrl}`, {
                method: this.refreshMethod,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: refreshController.signal
            }).then(async (res) => {
                let rdata; try { rdata = await res.json(); } catch { rdata = {}; }
                if (!res.ok) throw new Error('refresh failed');
                const newToken = rdata.access_token || (rdata.data && rdata.data.access_token);
                const newRefresh = rdata.refresh_token || (rdata.data && rdata.data.refresh_token);
                if (!newToken) throw new Error('no token in refresh response');
                this._setToken(newToken);
                if (newRefresh) this._setRefreshToken(newRefresh);
                if (this.onRefreshSuccess) this.onRefreshSuccess(rdata, this);
                return newToken;
            }).catch((err) => {
                throw err.name === 'AbortError' ? new Error('refresh timeout') : err;
            }).finally(() => { clearTimeout(refreshTimeoutId); this._refreshPromise = null; });
            return this._refreshPromise;
        }

        ensureFreshToken(skewMs = 120000) {
            const token = this._getToken();
            if (!token || token.split('.').length < 2 || !this.refreshUrl) return Promise.resolve();
            try {
                const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                const expMs = (payload.exp || 0) * 1000;
                if (expMs && Date.now() > expMs - skewMs) return this._tryRefresh().catch(() => {});
            } catch (e) {}
            return Promise.resolve();
        }

        async request(url, options = {}) {
            const timeoutValue = options.timeout !== undefined ? options.timeout : this.timeout;

            const isIdempotent = !options.method || options.method === 'GET';
            const maxAttempts = isIdempotent ? this.maxRetry : 1;
            const skipAuthRefresh = options.skipAuthRefresh === true;
            let lastError;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                const controller = new AbortController();
                const requestId = this._generateRequestId(url);
                this._registerController(requestId, controller);
                if (options.signal) {
                    if (options.signal.aborted) controller.abort();
                    else options.signal.addEventListener('abort', () => controller.abort(), { once: true });
                }
                const timeoutId = setTimeout(() => controller.abort(), timeoutValue);
                try {
                    const { response, data } = await this._doFetch(url, options, controller);

                        if (!response.ok) {
                                const errorMsg = this._extractError(data);
                                const errorCode = this._extractErrorCode(data);
                                const skipUnauthorized = options.skipUnauthorized === true;
                                if (response.status === 401 && !skipUnauthorized && !skipAuthRefresh && this.refreshUrl) {
                                    try {
                                        await this._tryRefresh();
                                        const retryResult = await this._doFetch(url, options, controller);
                                        if (!retryResult.response.ok) {
                                            const retryMsg = this._extractError(retryResult.data);
                                            throw new ApiError(retryMsg, retryResult.response.status, retryResult.data, this._extractErrorCode(retryResult.data));
                                        }
                                        return retryResult.data;
                                    } catch (refreshErr) {
                                        if (refreshErr && refreshErr.status) throw refreshErr;
                                        this._handleSessionExpired();
                                        throw new ApiError('登录已过期，请重新登录', 401, null);
                                    }
                                }
                                if (response.status === 401) {
                                    if (!skipUnauthorized) {
                                        this._handleSessionExpired();
                                    }
                                    const msg401 = skipUnauthorized ? (errorMsg || '认证失败') : (skipAuthRefresh ? (errorMsg || '认证失败') : '登录已过期，请重新登录');
                                    throw new ApiError(msg401, 401, data, errorCode);
                                }
                                if (this.onError) this.onError(response.status, errorMsg);
                                throw new ApiError(errorMsg, response.status, data, errorCode);
                            }

                        if (!isIdempotent && this._cache.size) this._cache.clear();
                        return data;
                    } catch (error) {
                        lastError = error;
                        if (error.name === 'AbortError') {
                            if (options.signal && options.signal.aborted) throw new ApiError('请求已取消', 499, null);
                            if (attempt < maxAttempts) {
                                const delay = Math.min(MAX_DELAY, BASE_DELAY * 2 ** (attempt - 1)) * (0.5 + Math.random() * 0.5);
                                await new Promise(r => setTimeout(r, delay));
                                continue;
                            }
                            throw new ApiError('请求超时，请稍后重试', 408, null);
                        }
                        if (_isNetworkErr(error)) {
                            const e = new ApiError('网络连接失败，请检查网络后重试', null, null);
                            e.isNetwork = true; throw e;
                        }
                        if (error.name === 'NexusApiError' || (error.message && error.message.includes('登录已过期'))) throw error;
                        if (attempt < maxAttempts) {
                            const delay = Math.min(MAX_DELAY, BASE_DELAY * 2 ** (attempt - 1)) * (0.5 + Math.random() * 0.5);
                            await new Promise(r => setTimeout(r, delay));
                        }
                    } finally {
                        clearTimeout(timeoutId);
                        this.abortControllers.delete(requestId);
                    }
                }
                throw lastError;
        }

        get(url, params = {}, options = {}) {
            const filtered = {};
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') filtered[k] = v;
            });
            const qs = new URLSearchParams(filtered).toString();
            const fullUrl = qs ? `${url}?${qs}` : url;
            if (this.cacheTtl > 0 && !options.fresh && !options.skipCache) {
                return this._cached(fullUrl, () => this.request(fullUrl, { method: 'GET', ...options }));
            }
            return this.request(fullUrl, { method: 'GET', ...options });
        }

        _cached(key, loader) {
            const hit = this._cache.get(key);
            if (hit && Date.now() - hit.at < this.cacheTtl) return Promise.resolve(hit.data);
            if (this._pendingGet.has(key)) return this._pendingGet.get(key);
            const pending = loader().then((data) => {
                if (this._cache.size >= 300) this._cache.delete(this._cache.keys().next().value);
                this._cache.set(key, { data, at: Date.now() });
                this._pendingGet.delete(key);
                return data;
            }).catch((err) => {
                this._pendingGet.delete(key);
                throw err;
            });
            this._pendingGet.set(key, pending);
            return pending;
        }

        invalidateCache(prefix) {
            if (!prefix) { this._cache.clear(); return; }
            for (const key of Array.from(this._cache.keys())) {
                if (key.includes(prefix)) this._cache.delete(key);
            }
        }

        post(url, data = {}, options = {}) {
            return this.request(url, { method: 'POST', body: JSON.stringify(data), ...options });
        }

        put(url, data = {}) {
            return this.request(url, { method: 'PUT', body: JSON.stringify(data) });
        }

        patch(url, data = {}) {
            return this.request(url, { method: 'PATCH', body: JSON.stringify(data) });
        }

        delete(url) {
            return this.request(url, { method: 'DELETE' });
        }

        upload(url, formData, options = {}) {
            const token = this._getToken();
            const dynamic = this.headerBuilder ? (this.headerBuilder() || {}) : {};
            const headers = { ...dynamic, ...(token && { 'Authorization': `Bearer ${token}` }), ...options.headers };
            const { headers: _mergedHeaders, ...fetchOptions } = options;
            return fetch(`${this.baseUrl}${url}`, { method: 'POST', body: formData, headers, ...fetchOptions })
            .then(async (res) => {
                let data; const ct = res.headers.get('content-type') || '';
                if (ct.includes('application/json')) data = await res.json();
                else { const t = await res.text(); try { data = JSON.parse(t); } catch { data = { detail: t }; } }
                if (res.status === 401) {
                    this._handleSessionExpired();
                }
                if (!res.ok) throw new ApiError(this._extractError(data), res.status, data, this._extractErrorCode(data));
                if (this.responseAdapter) data = this.responseAdapter(data, res);
                if (this._cache.size) this._cache.clear();
                return data;
            }).catch((err) => {
                if (err.name === 'NexusApiError') throw err;
                throw _isNetworkErr(err) ? new ApiError('网络连接失败，请检查网络后重试', null, null) : new ApiError(err.message || '上传失败', null, null);
            });
        }

        async streamPost(url, data = {}, { onEvent, onError, timeout = 60000, idleTimeout, headers = {} } = {}) {
            const controller = new AbortController();
            const requestId = this._generateRequestId(url);
            this._registerController(requestId, controller);
            try {
                for await (const evt of NexusStream.post(`${this.baseUrl}${url}`, {
                    body: JSON.stringify(data),
                    headers: this._buildHeaders(headers),
                    signal: controller.signal,
                    idleTimeout: idleTimeout || Math.max(timeout, 90000),
                    priority: 'sse-event',
                    onUnauthorized: () => this._handleSessionExpired(),
                })) {
                    if (onEvent) {
                        try { onEvent(evt.event, evt.data); } catch (e) { }
                    }
                }
            } catch (error) {
                let msg = (error && error.message) || '网络错误';
                let code = (error && error.code) || null;
                if (error && error.status === 401) {
                    msg = '登录已过期，请重新登录';
                    code = null;
                } else if (error && error.status) {
                    const m = /^HTTP \d+ (.*)$/s.exec(error.message || '');
                    if (m) {
                        try {
                            const errData = JSON.parse(m[1]);
                            const detail = this._extractError(errData);
                            if (detail) msg = detail;
                            code = this._extractErrorCode(errData);
                        } catch (e) { }
                    }
                    if (this.onError) this.onError(error.status, msg);
                } else if (error && (error.code === 'timeout' || error.name === 'AbortError')) {
                    msg = '连接超时，请检查网络后重试';
                } else if (_isNetworkErr(error)) {
                    msg = '网络连接失败，请检查网络后重试';
                }
                if (onError) onError(msg, code);
            } finally {
                this.abortControllers.delete(requestId);
            }
        }

        cancel(url) {
            const keysToDelete = [];
            for (const [id, ctrl] of this.abortControllers) {
                if (id.includes(url)) { ctrl.abort(); keysToDelete.push(id); }
            }
            keysToDelete.forEach(id => this.abortControllers.delete(id));
        }

        async download(url, params = {}, options = {}) {
            if (params && typeof params === 'object' && !(params instanceof URLSearchParams)
                && ('method' in params || 'body' in params || 'headers' in params || 'params' in params || 'timeout' in params)) {
                options = params;
                params = options.params || {};
            }
            const method = options.method || 'GET';
            const qs = new URLSearchParams(params).toString();
            const fullUrl = qs ? `${url}?${qs}` : url;
            const token = this._getToken();
            const headers = { ...(token && { 'Authorization': `Bearer ${token}` }), ...(options.headers || {}) };
            if (options.body !== undefined && options.body !== null) headers['Content-Type'] = 'application/json';
            const controller = new AbortController();
            const timeoutId = options.timeout ? setTimeout(() => controller.abort(), options.timeout) : null;
            let response;
            try {
                response = await fetch(`${this.baseUrl}${fullUrl}`, {
                    method,
                    headers,
                    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
                    signal: options.timeout ? controller.signal : undefined
                });
            } catch (err) {
                throw _isNetworkErr(err) ? new ApiError('网络连接失败，请检查网络后重试', null, null) : new ApiError(err.message || '下载失败', null, null);
            } finally {
                if (timeoutId) clearTimeout(timeoutId);
            }
            if (!response.ok) {
                let errData;
                try { errData = await response.json(); } catch { errData = {}; }
                if (response.status === 401) {
                    this._handleSessionExpired();
                }
                const errorMsg = this._extractError(errData) || `下载失败 (${response.status})`;
                if (this.onError) this.onError(response.status, errorMsg);
                throw new ApiError(errorMsg, response.status, errData, this._extractErrorCode(errData));
            }
            return await response.blob();
        }

        createCrud(basePath) {
            return {
                create: (data) => this.post(basePath, data),
                list: (params) => this.get(basePath, params),
                get: (id) => this.get(`${basePath}/${id}`),
                update: (id, data) => this.put(`${basePath}/${id}`, data),
                delete: (id) => this.delete(`${basePath}/${id}`)
            };
        }

        crud(resource, options = {}) {
            const factory = window.createNexusCrud;
            if (typeof factory !== 'function') {
                return this.createCrud(resource);
            }
            return factory({
                api: this,
                basePath: resource,
                idField: options.idField || 'id',
                paramNames: options.paramNames,
                listAdapter: options.listAdapter,
                itemAdapter: options.itemAdapter,
                idPathParam: options.idPathParam
            });
        }

        uploadFile(url, file, options = {}) {
            const formData = new FormData();
            const fieldName = options.fieldName || 'file';
            if (file instanceof File || file instanceof Blob) {
                formData.append(fieldName, file, options.filename || file.name || 'blob');
            } else {
                throw new Error('uploadFile: file must be a File or Blob');
            }
            if (options.fields && typeof options.fields === 'object') {
                Object.entries(options.fields).forEach(([k, v]) => formData.append(k, v));
            }
            return this.upload(url, formData, { headers: options.headers || {} });
        }

        logout() {
            this._clearAuth();
            try { window.NexusUtils && window.NexusUtils.markSsoLogout && window.NexusUtils.markSsoLogout(); } catch (e) {}
            if (this.onUnauthorized) this.onUnauthorized();
        }
    }

    window.NexusApi = NexusApi;
})();

/* ===== nexus-api-factory.js ===== */
(function() {
    if (!window.NexusApi) return;
    const ApiError = window.NexusApiError || Error;

    const UNWRAP_PRESETS = {
        raw: null,
        code200: function(data, response) {
            if (response && !response.ok) return data;
            if (data && typeof data === 'object' && 'code' in data) {
                if (data.code === 200) return data.data;
                throw new ApiError(data.message || data.detail || data.error || '操作失败', (response && response.status) || null, data, String(data.code));
            }
            return (data && typeof data === 'object' && 'data' in data) ? data.data : data;
        },
        dataOrRes: function(data) {
            return (data && typeof data === 'object' && 'data' in data) ? data.data : data;
        }
    };

    function buildUnauthorized(spec) {
        if (typeof spec === 'function') return spec;
        const clearKeys = spec.clearKeys || [];
        const event = spec.event || null;
        const redirect = spec.redirect || null;
        return function() {
            clearKeys.forEach((k) => {
                try { localStorage.removeItem(k); } catch (e) {}
                try { sessionStorage.removeItem(k); } catch (e) {}
            });
            if (event) { try { window.dispatchEvent(new CustomEvent(event)); } catch (e) {} }
            if (redirect) { try { window.location.href = redirect; } catch (e) {} }
        };
    }

    function applyMethods(api, methods) {
        if (!methods) return api;
        Object.keys(methods).forEach((name) => {
            const def = methods[name];
            if (typeof def === 'function') {
                api[name] = function(...args) { return def.apply(api, args); };
                return;
            }
            if (!Array.isArray(def)) return;
            const verb = String(def[0] || 'GET').toUpperCase();
            const url = def[1];
            if (verb === 'GET') api[name] = (params, options) => api.get(url, params, options);
            else if (verb === 'POST') api[name] = (data, options) => api.post(url, data, options);
            else if (verb === 'PUT') api[name] = (data) => api.put(url, data);
            else if (verb === 'PATCH') api[name] = (data) => api.patch(url, data);
            else if (verb === 'DELETE') api[name] = () => api.delete(url);
            else api[name] = (options) => api.request(url, { method: verb, ...options });
        });
        return api;
    }

    NexusApi.create = function(config = {}) {
        const opts = { ...config };
        const unwrap = opts.unwrap;
        delete opts.unwrap;
        if (typeof unwrap === 'function') {
            opts.responseAdapter = unwrap;
        } else if (unwrap !== undefined) {
            if (!(unwrap in UNWRAP_PRESETS)) throw new Error(`[NexusApi.create] Unknown unwrap preset: ${unwrap}`);
            if (UNWRAP_PRESETS[unwrap]) opts.responseAdapter = UNWRAP_PRESETS[unwrap];
        }
        if (opts.unauthorized) {
            opts.onUnauthorized = buildUnauthorized(opts.unauthorized);
            delete opts.unauthorized;
        }
        const methods = opts.methods;
        delete opts.methods;
        const api = new NexusApi(opts);
        return applyMethods(api, methods);
    };
})();

/* ===== nexus-markdown.js ===== */
(function () {
    'use strict';

    const VERSION = '1.3.0';

    // vendor 相对路径（无版本字面量）。绝对地址在运行时按「加载 nexus-all.js / nexus-markdown.js 的
    // script 标签 src」推导同版本 vendor 目录，避免服务器清旧版本目录后固定版本回退 404。
    const VENDOR_PATHS = {
        marked: 'marked.umd.js',
        dompurify: 'purify.min.js',
        highlight: 'highlight.min.js',
        highlightCss: 'styles/atom-one-dark.min.css',
        katex: 'katex/katex.min.js',
        katexCss: 'katex/katex.min.css'
    };

    function resolveLibBase() {
        // 1) document.currentScript 在同步执行时可用（绝对 URL，相对路径引用也能正确解析）
        try {
            const cur = (document.currentScript && document.currentScript.src) || '';
            const m = cur.match(/^(.*)\/js\/nexus-(?:all|markdown)\.js(?:[?#].*)?$/);
            if (m) return m[1] + '/vendor/';
        } catch (e) { /* ignore */ }
        // 2) 兜底扫描页面 script 标签
        const scripts = document.scripts || [];
        for (let i = 0; i < scripts.length; i++) {
            const src = scripts[i].src || scripts[i].getAttribute('src') || '';
            const m = src.match(/^(.*)\/js\/nexus-(?:all|markdown)\.js(?:[?#].*)?$/);
            if (m) return m[1] + '/vendor/';
        }
        return '';
    }

    let _libBase = null;
    (function captureLibBaseEarly() {
        try {
            const cur = (document.currentScript && document.currentScript.src) || '';
            const m = cur.match(/^(.*)\/js\/nexus-(?:all|markdown)\.js(?:[?#].*)?$/);
            if (m) _libBase = m[1] + '/vendor/';
        } catch (e) { /* ignore */ }
    })();
    function libBase() {
        if (_libBase === null) _libBase = resolveLibBase();
        return _libBase;
    }

    function libs() {
        const base = libBase();
        if (!base) return null;
        const out = {};
        Object.keys(VENDOR_PATHS).forEach(function (k) { out[k] = base + VENDOR_PATHS[k]; });
        return out;
    }

    const DEFAULT_ALLOWED_TAGS = [
        'p', 'br', 'strong', 'em', 'code', 'pre', 'span',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'hr',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'a', 'img', 'div', 'del', 'sub', 'sup',
        'details', 'summary', 'figure', 'figcaption',
        'kbd', 'samp', 'var', 'mark', 'input'
    ];

    let libsLoaded = false;
    let libsLoading = null;

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`load fail: ${src}`));
            document.head.appendChild(script);
        });
    }

    function loadStylesheet(href) {
        return new Promise((resolve) => {
            if (document.querySelector(`link[href="${href}"]`)) { resolve(); return; }
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            link.onerror = resolve;
            document.head.appendChild(link);
        });
    }

    function hasGlobal(name) { return typeof window[name] !== 'undefined'; }

    function hasHighlightCss() {
        if (window.__NX_HLJS_CSS__) return true;
        return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .some(l => (l.href || '').indexOf('highlight') > -1);
    }

    function hasKaTeXCss() {
        if (window.__NX_KATEX_CSS__) return true;
        return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .some(l => (l.href || '').indexOf('katex') > -1);
    }

    async function injectLibs() {
        if (libsLoaded) return true;
        if (libsLoading) return libsLoading;
        libsLoading = (async () => {
            const LIBS = libs();
            if (!LIBS) {
                console.warn('[NexusMarkdown] 无法从 nexus-all.js / nexus-markdown.js 的加载路径推导 vendor 目录，跳过 Markdown 库注入');
                libsLoaded = true;
                return false;
            }
            await Promise.all([
                hasGlobal('marked') ? Promise.resolve() : loadScript(LIBS.marked),
                hasGlobal('DOMPurify') ? Promise.resolve() : loadScript(LIBS.dompurify),
                hasGlobal('hljs') ? Promise.resolve() : loadScript(LIBS.highlight),
                hasGlobal('katex') ? Promise.resolve() : loadScript(LIBS.katex),
                hasHighlightCss() ? Promise.resolve() : loadStylesheet(LIBS.highlightCss).then(() => { window.__NX_HLJS_CSS__ = 1; }),
                hasKaTeXCss() ? Promise.resolve() : loadStylesheet(LIBS.katexCss)
            ]).catch(err => console.warn('[NexusMarkdown] lib load fail:', err.message));
            if (window.marked) {
                marked.setOptions({ breaks: true, gfm: true });
            }
            libsLoaded = true;
            return true;
        })();
        return libsLoading;
    }

    function wrapBareLatex(text) {
        const BARE_OPS = 'times|cdot|pm|mp|le|leq|ge|geq|ne|neq|approx|equiv|infty|partial|nabla|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|phi|omega|sum|prod|int|sqrt|vec|left|right|begin|end|qquad|quad';
        const BARE_LATEX_RE = new RegExp('\\\\[a-zA-Z]+\\s*(?:\\[[^\\]]*\\]\\s*)?(?:\\{[^{}]*\\})+|\\\\(' + BARE_OPS + ')(?![a-zA-Z])', 'g');
        const parts = [];
        let last = 0;
        let i = 0;
        const len = text.length;
        while (i < len) {
            const ch = text[i];
            if (ch === '\\' && i + 1 < len && text[i + 1] === '$') { i += 2; continue; }
            if (ch === '$') {
                let close;
                if (text[i + 1] === '$') {
                    close = text.indexOf('$$', i + 2);
                    if (close === -1) break;
                } else {
                    close = text.indexOf('$', i + 1);
                    if (close === -1) break;
                }
                const end = close + (text[i + 1] === '$' ? 2 : 1);
                parts.push(text.slice(last, i));
                parts.push(text.slice(i, end));
                i = end;
                last = i;
                continue;
            }
            i++;
        }
        parts.push(text.slice(last));
        return parts.map(function (part, idx) {
            if (idx % 2 === 1) return part;
            return part.replace(BARE_LATEX_RE, function (m) { return '$' + m + '$'; });
        }).join('');
    }

    function protectMath(text) {
        const mathBlocks = [];
        const codeBlocks = [];
        const noCode = String(text).replace(/(```[\s\S]*?```|`[^`\n]*`)/g, function (m) {
            codeBlocks.push(m);
            return '\u0003NXMDCODE' + (codeBlocks.length - 1) + '\u0004';
        });
        const wrapped = wrapBareLatex(noCode);
        const noMath = wrapped.replace(/\$\$\s*([\s\S]+?)\s*\$\$|\$([^\s$][^$\n]{0,98}[^\s$])\$/g, function (m) {
            mathBlocks.push(m);
            return '\u0001NXMDMATH' + (mathBlocks.length - 1) + '\u0002';
        });
        return {
            mathBlocks: mathBlocks,
            text: noMath.replace(/\u0003NXMDCODE(\d+)\u0004/g, function (m, i) {
                return codeBlocks[Number(i)];
            })
        };
    }

    function restoreMath(html, mathBlocks) {
        if (!mathBlocks || !mathBlocks.length) return html;
        return html.replace(/\u0001NXMDMATH(\d+)\u0002/g, function (m, i) {
            const expr = mathBlocks[Number(i)];
            if (expr === undefined) return '';
            const display = expr.indexOf('$$') === 0 && expr.lastIndexOf('$$') === expr.length - 2;
            const body = (display ? expr.slice(2, -2) : expr.slice(1, -1)).trim();
            if (!body) return '';
            if (window.katex) {
                try {
                    const hasCJK = /[\u4e00-\u9fff]/.test(body);
                    const looksMath = /[\\^_{}]/.test(body);
                    if (hasCJK && !looksMath) return NexusUtils.escapeHtml(body);
                    return katex.renderToString(body, { displayMode: display, throwOnError: false, strict: false });
                } catch (e) {}
            }
            return NexusUtils.escapeHtml(body);
        });
    }

    const MATH_LATIN_BASES = [0x1D400, 0x1D434, 0x1D468, 0x1D49C, 0x1D4D0, 0x1D504, 0x1D538, 0x1D56C, 0x1D5A0, 0x1D5D4, 0x1D608, 0x1D63C, 0x1D670];
    const MATH_DIGIT_BASES = [0x1D7CE, 0x1D7D8, 0x1D7E2, 0x1D7EC, 0x1D7F6];
    const LETTERLIKE_MAP = {
        '\u210E': 'h', '\u210F': 'h', '\u2110': 'I', '\u2112': 'L', '\u2113': 'l',
        '\u2118': 'P', '\u211B': 'R', '\u211C': 'R', '\u211D': 'R', '\u2124': 'Z',
        '\u2126': 'O', '\u2128': 'Z', '\u212C': 'B', '\u212D': 'C', '\u212F': 'e',
        '\u2130': 'E', '\u2131': 'F', '\u2132': 'F', '\u2133': 'M', '\u2134': 'o'
    };
    const MATH_ALNUM_RE = /[\u{1D400}-\u{1D7FF}\u210E\u210F\u2110\u2112\u2113\u2118\u211B-\u211D\u2124\u2126\u2128\u212C\u212D\u212F-\u2134]/gu;

    function mathCharToAscii(ch) {
        const cp = ch.codePointAt(0);
        if (cp >= 0x1D400 && cp <= 0x1D7FF) {
            for (const base of MATH_LATIN_BASES) {
                if (cp >= base && cp < base + 52) {
                    const off = cp - base;
                    return String.fromCharCode(off < 26 ? 65 + off : 97 + off - 26);
                }
            }
            for (const base of MATH_DIGIT_BASES) {
                if (cp >= base && cp < base + 10) return String.fromCharCode(48 + cp - base);
            }
            return ch;
        }
        return LETTERLIKE_MAP[ch] || ch;
    }

    function normalizeMathUnicode(text) {
        if (text === null || text === undefined) return '';
        return String(text).replace(MATH_ALNUM_RE, mathCharToAscii);
    }

    function render(text, options) {
        if (!text) return '';
        const opts = options || {};
        const normalized = normalizeMathUnicode(text);
        if (window.marked && window.DOMPurify) {
            try {
                const protected_ = protectMath(normalized);
                const raw = marked.parse(protected_.text);
                const sanitized = DOMPurify.sanitize(raw, {
                    ADD_ATTR: ['target', 'rel'],
                    ALLOWED_TAGS: opts.allowTags || DEFAULT_ALLOWED_TAGS
                });
                return restoreMath(sanitized, protected_.mathBlocks);
            } catch (e) {
                console.warn('[NexusMarkdown] render fail:', e);
            }
        }
        return NexusUtils.escapeHtml(normalized).replace(/\n/g, '<br>');
    }

    async function renderAsync(text, options) {
        await injectLibs();
        return render(text, options);
    }

    function postProcess(container) {
        if (!container) return;
        if (window.hljs) {
            container.querySelectorAll('pre code').forEach(block => {
                if (block.dataset.nxHighlighted) return;
                try {
                    hljs.highlightElement(block);
                    block.dataset.nxHighlighted = '1';
                } catch (e) {}
            });
        }
        container.querySelectorAll('a').forEach(a => {
            if (!a.target) a.target = '_blank';
            if (!a.rel) a.rel = 'noopener noreferrer';
        });
        container.querySelectorAll('pre').forEach(pre => {
            if (pre.querySelector('.nx-md-copy')) return;
            const code = pre.querySelector('code');
            if (!code) return;
            const lang = (code.className.match(/language-(\w+)/) || [])[1] || '';
            if (lang) {
                const tag = document.createElement('span');
                tag.className = 'nx-md-lang';
                tag.textContent = lang;
                pre.appendChild(tag);
            }
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'nx-md-copy';
            btn.textContent = '复制';
            btn.addEventListener('click', () => {
                const text = code.textContent || '';
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(text).then(() => {
                        btn.textContent = '已复制';
                        setTimeout(() => { btn.textContent = '复制'; }, 1500);
                    }).catch(() => {});
                }
            });
            pre.appendChild(btn);
        });
    }

    function renderTo(element, text, options) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return;
        el.innerHTML = render(text, options);
        el.classList.add('nx-md');
        postProcess(el);
    }

    async function renderToAsync(element, text, options) {
        await injectLibs();
        renderTo(element, text, options);
    }

    function directive(options) {
        const opts = options || {};
        return {
            mounted(el, binding) {
                applyDirective(el, binding.value, opts);
            },
            updated(el, binding) {
                if (binding.value === binding.oldValue) return;
                applyDirective(el, binding.value, opts);
            }
        };
    }

    function applyDirective(el, value, opts) {
        const text = value === null || value === undefined ? '' : String(value);
        const fallback = () => { el.innerHTML = NexusUtils.escapeHtml(text).replace(/\n/g, '<br>'); };
        if (!window.NexusMarkdown) { fallback(); return; }
        NexusMarkdown.injectLibs().then(() => {
            el.innerHTML = NexusMarkdown.render(text, opts);
            el.classList.add('nx-md');
            NexusMarkdown.postProcess(el);
        }).catch(fallback);
    }

    function install(vueApp, options) {
        if (!vueApp || !vueApp.directive) return null;
        const d = directive(options);
        vueApp.directive('md', d);
        return d;
    }

    const NexusMarkdown = {
        version: VERSION,
        injectLibs,
        render,
        renderAsync,
        renderTo,
        renderToAsync,
        escapeHtml: NexusUtils.escapeHtml,
        postProcess,
        directive,
        install,
        DEFAULT_ALLOWED_TAGS
    };

    window.NexusMarkdown = NexusMarkdown;
})();

/* ===== nexus-chat.js ===== */
(function () {
    'use strict';

    const CHAT_VERSION = '1.1.0';

    function delegateMarkdown(text) {
        if (window.NexusMarkdown && typeof window.NexusMarkdown.render === 'function') {
            return window.NexusMarkdown.render(text);
        }
        if (window.NexusMarkdown && typeof window.NexusMarkdown.escapeHtml === 'function') {
            return window.NexusMarkdown.escapeHtml(text).replace(/\n/g, '<br>');
        }
        return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    }

    function delegateEscape(str) {
        if (window.NexusMarkdown && typeof window.NexusMarkdown.escapeHtml === 'function') {
            return window.NexusMarkdown.escapeHtml(str);
        }
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    async function delegateInject() {
        if (window.NexusMarkdown && typeof window.NexusMarkdown.injectLibs === 'function') {
            return window.NexusMarkdown.injectLibs();
        }
        return false;
    }

    class ChatController {
        constructor(options) {
            const opts = options || {};
            this.api = opts.api || (window.NexusApi ? new NexusApi() : null);
            this.url = opts.url || '';
            this.body = opts.body || {};
            this.timeout = opts.timeout || 120000;
            this.eventKey = opts.eventKey || 'delta';
            this.contentKey = opts.contentKey || 'content';
            this.doneKey = opts.doneKey || 'done';
            this.onChunk = opts.onChunk || (function () {});
            this.onDone = opts.onDone || (function () {});
            this.onError = opts.onError || (function () {});
            this.onEvent = opts.onEvent || null;
            this.controller = null;
            this.receivedChunks = '';
            this._currentEvent = null;
        }

        get isStreaming() { return this.controller !== null; }

        async start() {
            if (!this.api || !this.url) { this.onError('未配置API或URL'); return; }
            this.receivedChunks = '';
            this.controller = new AbortController();
            const requestId = `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            this.api._registerController(requestId, this.controller);
            try {
                for await (const evt of NexusStream.post(`${this.api.baseUrl}${this.url}`, {
                    body: JSON.stringify(this.body),
                    headers: this.api._buildHeaders({ 'Accept': 'text/event-stream' }),
                    signal: this.controller.signal,
                    idleTimeout: this.timeout,
                    priority: 'data-type-then-sse-event',
                    defaultEvent: this.eventKey,
                })) {
                    this._handleData(evt.data, evt.event);
                }
                this.onDone(this.receivedChunks);
            } catch (error) {
                if (error && error.name === 'AbortError') {
                    this.onDone(this.receivedChunks);
                } else if (error && error.code === 'timeout') {
                    this.onError(this.receivedChunks
                        ? '响应超时，已保留前面生成的内容，请重试或缩短问题'
                        : '响应超时，请重试或更换问题');
                } else if (error && error.status === 401) {
                    this.onError('登录已过期，请重新登录');
                } else if (error && error.status) {
                    const m = /^HTTP \d+ (.*)$/s.exec(error.message || '');
                    let msg = null;
                    if (m) {
                        try { msg = this.api._extractError(JSON.parse(m[1])); } catch (e) { }
                    }
                    this.onError(msg || `请求失败 ${error.status}`);
                } else {
                    this.onError((error && error.message) || '网络错误');
                }
            } finally {
                this.api.abortControllers.delete(requestId);
                this.controller = null;
                this._currentEvent = null;
            }
        }

        _handleData(data, event) {
            if (this.onEvent) this.onEvent(event, data);
            if (event === 'error') {
                this.onError(data.message || data.error || 'AI处理出错');
                return;
            }
            if (event === this.eventKey || event === 'delta' || event === 'content' || event === 'message') {
                const content = data[this.contentKey] || data.content || data.delta || data.text || data.message;
                if (content) {
                    this.receivedChunks += content;
                    this.onChunk(content, this.receivedChunks);
                }
            }
            if (data[this.doneKey] === true || data.done === true || data.finished === true) {
                this.controller && this.controller.abort();
            }
        }

        stop() {
            if (this.controller) {
                try { this.controller.abort(); } catch (e) {}
            }
        }
    }

    function createStreamingButton(opts) {
        const options = opts || {};
        const button = options.button;
        const onSend = options.onSend;
        const onStop = options.onStop;
        const streamingClass = options.streamingClass || 'nx-chat-streaming';
        if (!button) return null;
        const sendIcon = button.innerHTML;
        let streaming = false;
        function setStreaming(state) {
            streaming = state;
            button.classList.toggle(streamingClass, state);
            button.innerHTML = state
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>'
                : sendIcon;
            button.disabled = false;
            button.setAttribute('aria-label', state ? '停止生成' : '发送');
        }
        button.addEventListener('click', function () {
            if (streaming) { onStop && onStop(); }
            else { onSend && onSend(); }
        });
        return { setStreaming: setStreaming, getStreaming: function () { return streaming; } };
    }

    function renderError(message, onRetry, retryLabel) {
        const label = retryLabel || '重试';
        const errId = `nx-chat-err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const retryBtn = onRetry
            ? `<button type="button" class="nx-chat-retry" data-err-id="${errId}">${delegateEscape(label)}</button>`
            : '';
        return `<div class="nx-chat-error" id="${errId}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>${delegateEscape(message)}</span>
            ${retryBtn}
        </div>`;
    }

    function bindRetry(container, onRetry) {
        if (!container) return;
        const btn = container.querySelector('.nx-chat-retry');
        if (btn) btn.addEventListener('click', onRetry);
    }

    function typingCursor() {
        return '<span class="nx-chat-typing-cursor" aria-hidden="true"></span>';
    }

    const NexusChat = {
        version: CHAT_VERSION,
        injectLibs: delegateInject,
        renderMarkdown: delegateMarkdown,
        escapeHtml: delegateEscape,
        ChatController: ChatController,
        createStreamingButton: createStreamingButton,
        renderError: renderError,
        bindRetry: bindRetry,
        typingCursor: typingCursor
    };

    window.NexusChat = NexusChat;
})();

/* ===== nexus-structured.js ===== */
(function () {
    'use strict';

    const STRUCTURED_VERSION = '1.1.0';

    function extractBody(result) {
        if (result && typeof result === 'object' && !Array.isArray(result)
            && 'data' in result && result.data !== undefined && result.data !== null) {
            return result.data;
        }
        return result;
    }

    function stringifyVal(v) {
        if (v === null || v === undefined) return '';
        if (typeof v === 'object') {
            try { return JSON.stringify(v); } catch (e) { return String(v); }
        }
        return String(v);
    }

    function isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }

    function format(result) {
        if (result === null || result === undefined) return '无';
        if (typeof result === 'string') return result;
        try {
            return JSON.stringify(result, null, 2);
        } catch (e) {
            return String(result);
        }
    }

    function isError(result) {
        return result !== null && typeof result === 'object'
            && !Array.isArray(result) && 'error' in result;
    }

    function buildTable(rows) {
        if (!Array.isArray(rows) || rows.length === 0 || typeof rows[0] !== 'object') {
            return { kind: 'raw', text: format(rows) };
        }
        const columns = Object.keys(rows[0]);
        const data = rows.map(function (r) {
            const row = {};
            columns.forEach(function (c) {
                row[c] = stringifyVal(r[c]);
            });
            return row;
        });
        return { kind: 'table', columns, rows: data, summary: null };
    }

    function build(result) {
        if (result === null || result === undefined) {
            return { kind: 'raw', text: '空' };
        }
        const body = extractBody(result);
        if (Array.isArray(body)) {
            return buildTable(body);
        }
        if (typeof body === 'object' && body !== null) {
            const arrKey = Object.keys(body).find(function (k) {
                return Array.isArray(body[k]) && body[k].length > 0;
            });
            if (arrKey) {
                const summary = {};
                Object.keys(body).forEach(function (k) {
                    if (k !== arrKey) summary[k] = body[k];
                });
                const table = buildTable(body[arrKey]);
                table.summary = isEmpty(summary) ? null : summary;
                return table;
            }
            const pairs = Object.keys(body).map(function (k) {
                return { k, v: stringifyVal(body[k]) };
            });
            return { kind: 'kv', pairs };
        }
        return { kind: 'raw', text: stringifyVal(body) };
    }

    async function injectLibs() {
        if (window.NexusMarkdown && typeof window.NexusMarkdown.injectLibs === 'function') {
            return window.NexusMarkdown.injectLibs();
        }
        return false;
    }

    class StructuredController {
        constructor(options) {
            const opts = options || {};
            this.url = opts.url || '';
            this.body = opts.body || {};
            this.headers = opts.headers || {};
            this.timeout = opts.timeout || 120000;
            this.onText = opts.onText || (function () {});
            this.onAction = opts.onAction || (function () {});
            this.onDone = opts.onDone || (function () {});
            this.onError = opts.onError || (function () {});
            this.itemCount = 0;
            this.controller = null;
        }

        get isStreaming() { return this.controller !== null; }

        async start() {
            if (!this.url) { this.onError('未配置请求URL'); return; }
            this.itemCount = 0;
            this.controller = new AbortController();
            let timedOut = false;
            let idleTimer = null;
            const resetIdle = () => {
                if (idleTimer) clearTimeout(idleTimer);
                idleTimer = setTimeout(() => {
                    timedOut = true;
                    try { this.controller.abort(); } catch (e) {}
                }, this.timeout);
            };
            resetIdle();
            try {
                const response = await fetch(this.url, {
                    method: 'POST',
                    headers: Object.assign({ 'Accept': 'text/event-stream', 'Content-Type': 'application/json' }, this.headers),
                    body: JSON.stringify(this.body),
                    signal: this.controller.signal
                });
                if (!response.ok) {
                    let errData;
                    try { errData = await response.json(); } catch (e) { errData = {}; }
                    this.onError((errData && errData.message) ? errData.message : ('请求失败 ' + response.status));
                    return;
                }
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    resetIdle();
                    buffer += decoder.decode(value, { stream: true });
                    let idx;
                    while ((idx = buffer.indexOf('\n')) !== -1) {
                        const line = buffer.slice(0, idx).replace(/\r$/, '');
                        buffer = buffer.slice(idx + 1);
                        if (line.startsWith('data:')) {
                            const payload = line.slice(5).trim();
                            if (payload) {
                                try { this._handleData(JSON.parse(payload)); }
                                catch (e) {}
                            }
                        }
                    }
                }
                this.onDone(this.itemCount);
            } catch (error) {
                if (error.name === 'AbortError') {
                    if (timedOut) { this.onError('响应超时，请重试'); }
                    else { this.onDone(this.itemCount); }
                } else {
                    this.onError(error.message || '网络错误');
                }
            } finally {
                if (idleTimer) clearTimeout(idleTimer);
                this.controller = null;
            }
        }

        _handleData(data) {
            const type = data.type;
            if (type === 'structured_text' || type === 'text') {
                const content = data.content || '';
                if (content) this.onText(content, data);
            } else if (type === 'structured_item' || type === 'item') {
                this.itemCount = (typeof data.item_count === 'number') ? data.item_count : (this.itemCount + 1);
                const item = data.item || {};
                if (item.type === 'action' || (item.name && item.params !== undefined)) {
                    this.onAction(item, data);
                } else if (item.type === 'text') {
                    const content = item.content || '';
                    if (content) this.onText(content, data);
                }
                if (data.last === true) {
                    this.onDone(this.itemCount, data);
                }
            } else if (type === 'structured_done' || type === 'done') {
                this.itemCount = (typeof data.item_count === 'number') ? data.item_count : this.itemCount;
                this.onDone(this.itemCount, data);
            } else if (type === 'error') {
                this.onError(data.message || 'AI处理出错');
            }
        }

        stop() {
            if (this.controller) {
                try { this.controller.abort(); } catch (e) {}
            }
        }
    }

    async function consume(url, options = {}) {
        const controller = new StructuredController(Object.assign({ url }, options));
        await controller.start();
        return controller;
    }

    const NexusStructured = {
        version: STRUCTURED_VERSION,
        build: build,
        format: format,
        isError: isError,
        escapeHtml: NexusUtils.escapeHtml,
        injectLibs: injectLibs,
        StructuredController: StructuredController,
        consume: consume
    };

    window.NexusStructured = NexusStructured;
})();

/* ===== nexus-store.js ===== */
(function() {
    if (typeof Vue === 'undefined') {
        console.error('[nexus-ui] 依赖 Vue 未加载：请先引入 vue.global.prod.js 再加载 nexus-ui 脚本，参考 nexus-ui/demo 的引用顺序。');
        return;
    }
    const { reactive, computed, watch } = Vue;

    class NexusStore {
        constructor(initialState = {}, options = {}) {
            this._state = reactive({
                user: null,
                token: null,
                loading: false,
                ...initialState
            });
            this._persistKeys = options.persistKeys || ['token', 'user'];
            this._tokenKey = options.tokenKey || 'token';
            this._userKey = options.userKey || 'user';
            this._unwatchFns = [];
            this._isAuthenticated = computed(() => !!this._state.token && !!this._state.user);
            this._initPersistence();
        }

        get state() { return this._state; }

        get(key) { return this._state[key]; }
        set(key, value) { this._state[key] = value; }

        get isAuthenticated() { return this._isAuthenticated.value; }

        destroy() {
            if (this._unwatchFns) {
                this._unwatchFns.forEach(fn => { try { fn(); } catch (e) {} });
                this._unwatchFns = [];
            }
        }

        logout() {
            this._state.user = null;
            this._state.token = null;
            this._persistKeys.forEach(key => localStorage.removeItem(key));
        }

        _initPersistence() {
            this._persistKeys.forEach(key => {
                const saved = localStorage.getItem(key);
                if (saved) {
                    try { this._state[key] = key === 'user' ? JSON.parse(saved) : saved; }
                    catch (e) { console.error(`解析${key}失败:`, e); }
                }
                const unwatch = watch(() => this._state[key], (newVal) => {
                    if (newVal) {
                        localStorage.setItem(key, typeof newVal === 'object' ? JSON.stringify(newVal) : newVal);
                    } else {
                        localStorage.removeItem(key);
                    }
                }, { deep: true });
                this._unwatchFns.push(unwatch);
            });
        }
    }

    window.NexusStore = NexusStore;
})();

/* ===== nexus-crud.js ===== */
(function() {
    const DEFAULT_PARAM_NAMES = {
        page: 'page',
        pageSize: 'page_size',
        search: 'q',
        sort: 'sort_by',
        sortOrder: 'sort_order'
    };

    function _isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

    function _buildParams(options, paramNames) {
        const params = {};
        if (options.page !== undefined && options.page !== null) params[paramNames.page] = options.page;
        if (options.pageSize !== undefined && options.pageSize !== null) params[paramNames.pageSize] = options.pageSize;
        if (options.search) params[paramNames.search] = options.search;
        if (options.sortField) {
            params[paramNames.sort] = options.sortField;
            if (options.sortOrder) params[paramNames.sortOrder] = options.sortOrder;
        }
        if (_isObj(options.filters)) Object.assign(params, options.filters);
        if (_isObj(options.extra)) Object.assign(params, options.extra);
        return params;
    }

    function _defaultListAdapter(resp) {
        if (Array.isArray(resp)) return { items: resp, total: resp.length };
        if (Array.isArray(resp.items)) return { items: resp.items, total: resp.total !== undefined ? resp.total : resp.items.length };
        if (Array.isArray(resp.data)) return { items: resp.data, total: resp.total !== undefined ? resp.total : resp.data.length };
        if (resp.data && Array.isArray(resp.data.items)) return { items: resp.data.items, total: resp.data.total !== undefined ? resp.data.total : resp.data.items.length };
        if (resp.list && Array.isArray(resp.list)) return { items: resp.list, total: resp.total !== undefined ? resp.total : resp.list.length };
        if (resp.results && Array.isArray(resp.results)) return { items: resp.results, total: resp.count !== undefined ? resp.count : resp.results.length };
        return { items: [], total: 0 };
    }

    function _defaultItemAdapter(resp) {
        if (resp && resp.data && !_isObj(resp.data)) return resp.data;
        return resp;
    }

    function createNexusCrud(config) {
        if (!config || !config.api) throw new Error('createNexusCrud: config.api is required');
        if (!config.basePath) throw new Error('createNexusCrud: config.basePath is required');
        const api = config.api;
        const basePath = config.basePath.replace(/\/$/, '');
        const idField = config.idField || 'id';
        const paramNames = Object.assign({}, DEFAULT_PARAM_NAMES, config.paramNames || {});
        const listAdapter = config.listAdapter || _defaultListAdapter;
        const itemAdapter = config.itemAdapter || _defaultItemAdapter;
        const idPathParam = config.idPathParam || ':id';

        function _idUrl(id) {
            return `${basePath}/${encodeURIComponent(String(id))}`;
        }

        function list(options = {}) {
            const params = _buildParams(options, paramNames);
            return api.get(basePath, params).then(listAdapter);
        }

        function listRaw(options = {}) {
            const params = _buildParams(options, paramNames);
            return api.get(basePath, params);
        }

        function get(id, options = {}) {
            const url = _idUrl(id);
            if (options.params && Object.keys(options.params).length) {
                return api.get(url, options.params).then(itemAdapter);
            }
            return api.get(url).then(itemAdapter);
        }

        function create(data, options = {}) {
            if (options.query && Object.keys(options.query).length) {
                const qs = new URLSearchParams(options.query).toString();
                return api.post(`${basePath}${qs ? '?' + qs : ''}`, data).then(itemAdapter);
            }
            return api.post(basePath, data).then(itemAdapter);
        }

        function update(id, data, options = {}) {
            const url = _idUrl(id);
            if (options.method === 'PATCH' && typeof api.patch === 'function') {
                return api.patch(url, data).then(itemAdapter);
            }
            return api.put(url, data).then(itemAdapter);
        }

        function remove(id, options = {}) {
            const url = _idUrl(id);
            if (options.query && Object.keys(options.query).length) {
                const qs = new URLSearchParams(options.query).toString();
                return api.delete(`${url}${qs ? '?' + qs : ''}`);
            }
            return api.delete(url);
        }

        function batchRemove(ids) {
            if (!Array.isArray(ids)) ids = [ids];
            return Promise.all(ids.map(id => api.delete(_idUrl(id))));
        }

        function listPaged(page, pageSize, extra = {}) {
            return list({ page, pageSize, ...extra });
        }

        function search(keyword, extra = {}) {
            return list({ search: keyword, ...extra });
        }

        function sortBy(field, order = 'desc', extra = {}) {
            return list({ sortField: field, sortOrder: order, ...extra });
        }

        function sub(resource, id) {
            const subPath = id !== undefined ? `${_idUrl(id)}/${resource}` : `${basePath}/${resource}`;
            return createNexusCrud({
                api,
                basePath: subPath,
                idField,
                paramNames,
                listAdapter,
                itemAdapter,
                idPathParam
            });
        }

        function action(name, options = {}) {
            const method = (options.method || 'POST').toUpperCase();
            const url = options.onCollection ? `${basePath}/${name}` : `${basePath}/${idPathParam}/${name}`;
            const finalUrl = url.replace(idPathParam, options.id !== undefined ? encodeURIComponent(String(options.id)) : '');
            const data = options.data || {};
            if (method === 'GET') return api.get(finalUrl, options.params || {});
            if (method === 'DELETE') return api.delete(finalUrl);
            if (method === 'PUT') return api.put(finalUrl, data);
            return api.post(finalUrl, data);
        }

        return {
            list, listRaw, get, create, update, remove, batchRemove,
            listPaged, search, sortBy, sub, action,
            basePath, idField, paramNames
        };
    }

    window.createNexusCrud = createNexusCrud;
})();

/* ===== nexus-mobile.js ===== */
(function() {
    var SIDEBAR_SEL = '.sidebar, .nx-sidebar';
    var MOBILE_BREAKPOINT = 768;
    var VIEWPORT_DEFAULTS = {
        'width': 'device-width',
        'initial-scale': '1.0',
        'maximum-scale': '5.0',
        'viewport-fit': 'cover',
        'interactive-widget': 'resizes-content'
    };

    function isMobile() {
        return window.innerWidth <= MOBILE_BREAKPOINT;
    }

    function ensureViewport() {
        var meta = document.querySelector('meta[name="viewport"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'viewport');
            var parts = [];
            Object.keys(VIEWPORT_DEFAULTS).forEach(function(k) { parts.push(k + '=' + VIEWPORT_DEFAULTS[k]); });
            meta.setAttribute('content', parts.join(', '));
            document.head.appendChild(meta);
            return;
        }
        var existing = (meta.getAttribute('content') || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);
        var have = {};
        existing.forEach(function(p) {
            var i = p.indexOf('=');
            if (i > 0) have[p.slice(0, i).trim().toLowerCase()] = p.slice(i + 1).trim();
        });
        Object.keys(VIEWPORT_DEFAULTS).forEach(function(k) {
            if (!(k in have)) existing.push(k + '=' + VIEWPORT_DEFAULTS[k]);
        });
        meta.setAttribute('content', existing.join(', '));
    }

    function init() {
        var sidebar = document.querySelector(SIDEBAR_SEL);
        if (!sidebar) return;

        if (document.querySelector('.nx-hamburger')) return;

        if (sidebar.dataset.nxMobileInit === '1') return;
        sidebar.dataset.nxMobileInit = '1';

        var overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay nx-drawer-overlay';
        overlay.style.display = 'none';
        document.body.appendChild(overlay);

        var hamburger = document.createElement('button');
        hamburger.className = 'mobile-menu-btn nx-hamburger';
        hamburger.style.display = 'none';
        hamburger.innerHTML = '<span class="nx-hamburger-inner"><span class="nx-hamburger-line"></span><span class="nx-hamburger-line"></span><span class="nx-hamburger-line"></span></span>';
        hamburger.setAttribute('aria-label', '菜单');
        hamburger.setAttribute('aria-expanded', 'false');

        var topbar = document.querySelector('.topbar, .nx-nav');
        if (topbar) {
            topbar.insertBefore(hamburger, topbar.firstChild);
        } else {
            sidebar.parentNode.insertBefore(hamburger, sidebar);
        }

        function isOpen() {
            return sidebar.classList.contains('sidebar-open') || sidebar.classList.contains('open');
        }

        function setOpen(open) {
            sidebar.classList.toggle('sidebar-open', open);
            sidebar.classList.toggle('open', open);
            overlay.classList.toggle('active', open);
            hamburger.classList.toggle('open', open);
            hamburger.setAttribute('aria-expanded', String(open));
            overlay.style.display = open ? 'block' : 'none';
            sidebar.style.transform = '';
        }

        function toggleSidebar() {
            setOpen(!isOpen());
        }

        hamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSidebar();
        });

        overlay.addEventListener('click', function() {
            setOpen(false);
        });

        var navItems = sidebar.querySelectorAll('.nav-item, .nx-sidebar-item');
        navItems.forEach(function(item) {
            item.addEventListener('click', function() {
                if (isMobile() && isOpen()) setOpen(false);
            });
        });

        initSwipe(sidebar, setOpen, isMobile, isOpen);

        function checkMobile() {
            var mobile = isMobile();
            hamburger.style.display = mobile ? 'inline-flex' : 'none';
            if (!mobile) setOpen(false);
        }

        checkMobile();
        window.addEventListener('resize', checkMobile);
    }

    function initSwipe(sidebar, setOpen, isMobileFn, isOpenFn) {
        var touch = null;

        function onStart(e) {
            if (!isMobileFn() || !isOpenFn() || e.touches.length !== 1) return;
            if (e.touches[0].clientX > 24) return;
            touch = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
            sidebar.style.transition = 'none';
        }

        function onMove(e) {
            if (!touch) return;
            var dx = e.touches[0].clientX - touch.startX;
            var dy = e.touches[0].clientY - touch.startY;
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            if (Math.abs(dy) > Math.abs(dx)) { touch = null; return; }
            if (dx > 0) { touch = null; return; }
            e.preventDefault();
            sidebar.style.transform = 'translateX(' + dx + 'px)';
            sidebar.style.transition = 'none';
        }

        function onEnd(e) {
            if (!touch) return;
            var dx = e.changedTouches[0].clientX - touch.startX;
            sidebar.style.transition = '';
            if (dx < -40) {
                setOpen(false);
            } else {
                sidebar.style.transform = '';
            }
            touch = null;
        }

        sidebar.addEventListener('touchstart', onStart, { passive: true });
        sidebar.addEventListener('touchmove', onMove, { passive: false });
        sidebar.addEventListener('touchend', onEnd, { passive: true });
        sidebar.addEventListener('touchcancel', function() { touch = null; sidebar.style.transition = ''; sidebar.style.transform = ''; }, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.NexusMobile = { ensureViewport: ensureViewport, isMobile: isMobile, MOBILE_BREAKPOINT: MOBILE_BREAKPOINT };
    ensureViewport();
})();

/* ===== nexus-components.js ===== */
(function () {
    'use strict';

    var COMPONENTS = {
        'nux-about-page': 'NuxAboutPage',
        'nux-accordion': 'NuxAccordion',
        'nux-ai-badge': 'NuxAiBadge',
        'nux-ai-chat': 'NuxAiChat',
        'nux-ai-indicator': 'NuxAiIndicator',
        'nux-ai-notice': 'NuxAiNotice',
        'nux-ai-task-progress': 'NuxAiTaskProgress',
        'nux-ai-widgets': 'NuxAiWidgets',
        'nux-app-card': 'NuxAppCard',
        'nux-app-switcher': 'NuxAppSwitcher',
        'nux-automation': 'NuxAutomation',
        'nux-avatar': 'NuxAvatar',
        'nux-backtop': 'NuxBacktop',
        'nux-badge': 'NuxBadge',
        'nux-bottom-nav': 'NuxBottomNav',
        'nux-breadcrumb': 'NuxBreadcrumb',
        'nux-button': 'NuxButton',
        'nux-camera-recognize': 'NuxCameraRecognize',
        'nux-calendar': 'NuxCalendar',
        'nux-checkbox': 'NuxCheckbox',
        'nux-radio-group': 'NuxRadioGroup',
        'nux-checkin': 'NuxCheckin',
        'nux-chip-group': 'NuxChipGroup',
        'nux-clarify-card': 'NuxClarifyCard',
        'nux-conversation-list': 'NuxConversationList',
        'nux-date-picker': 'NuxDatePicker',
        'nux-drawer': 'NuxDrawer',
        'nux-empty-state': 'NuxEmptyState',
        'nux-error-state': 'NuxErrorState',
        'nux-file-upload': 'NuxFileUpload',
        'nux-footer': 'NuxFooter',
        'nux-forgot-password': 'NuxForgotPassword',
        'nux-form-group': 'NuxFormGroup',
        'nux-icon': 'NuxIcon',
        'nux-infinite-scroll': 'NuxInfiniteScroll',
        'nux-input': 'NuxInput',
        'nux-layout-sidebar': 'NuxLayoutSidebar',
        'nux-layout-topnav': 'NuxLayoutTopNav',
        'nux-loading': 'NuxLoading',
        'nux-login-page': 'NuxLoginPage',
        'nux-menu-about': 'NuxMenuAbout',
        'nux-menu-user': 'NuxMenuUser',
        'nux-modal': 'NuxModal',
        'nux-notification-bell': 'NuxNotificationBell',
        'nux-onboarding': 'NuxOnboarding',
        'nux-onboarding-strip': 'NuxOnboardingStrip',
        'nux-pagination': 'NuxPagination',
        'nux-portal-footer': 'NuxPortalFooter',
        'nux-poster': 'NuxPoster',
        'nux-progress': 'NuxProgress',
        'nux-qrcode': 'NuxQrcode',
        'nux-radar-chart': 'NuxRadarChart',
        'nux-result-view': 'NuxResultView',
        'nux-search-box': 'NuxSearchBox',
        'nux-section': 'NuxSection',
        'nux-segmented': 'NuxSegmented',
        'nux-input-number': 'NuxInputNumber',
        'nux-select': 'NuxSelect',
        'nux-selection-bar': 'NuxSelectionBar',
        'nux-settings-drawer': 'NuxSettingsDrawer',
        'nux-side-panel': 'NuxSidePanel',
        'nux-skeleton': 'NuxSkeleton',
        'nux-slider': 'NuxSlider',
        'nux-sortable': 'NuxSortable',
        'nux-stat-card': 'NuxStatCard',
        'nux-swipe-actions': 'NuxSwipeActions',
        'nux-switch': 'NuxSwitch',
        'nux-tab-group': 'NuxTabGroup',
        'nux-tag': 'NuxTag',
        'nux-textarea': 'NuxTextarea',
        'nux-theme-toggle': 'NuxThemeToggle',
        'nux-undo-toast': 'NuxUndoToast',
        'nux-user-center': 'NuxUserCenter',
        'nux-voice-input': 'NuxVoiceInput'
    };

    var HELPERS = {
        'NuxAiChatHelpers': 'AI 对话工具集（features/input/roles、键盘高度、富事件路由）',
        'NuxAiChatTemplate': 'AI 对话组件模板字符串',
        'NuxAiWidgetsRegistry': 'AI 消息内组件渲染器注册表（register(type, def, icon)，供 nux-ai-widgets-rich 等扩展）',
        'nux-ai-widgets-rich.js': 'AI 消息内增强组件（form/chart/confirm），仅向 NuxAiWidgetsRegistry 注册类型并注入样式，无独立全局导出',
        'NuxLoginHelpers': '登录页工具集（验证码/SMS 状态机、协议勾选、忘记密码动态加载）',
        'NuxLoginPageTemplate': '登录页模板字符串',
        'NuxRadarDraw': '雷达图 Canvas 绘制引擎（静态方法）',
        'PosterRender': '海报渲染引擎（px/elementStyle/buildInner/capture/download）'
    };

    var isComponent = function (def) {
        return !!def && typeof def === 'object' && !!(def.template || def.render || def.setup);
    };

    var register = function (app, options) {
        var opts = options || {};
        var registered = [];
        var missing = [];
        if (!app || typeof app.component !== 'function') {
            if (!opts.silent && window.console) window.console.warn('[NexusComponents] 需要传入 Vue app 实例');
            return registered;
        }
        Object.keys(COMPONENTS).forEach(function (tag) {
            var def = window[COMPONENTS[tag]];
            if (isComponent(def)) {
                app.component(tag, def);
                registered.push(tag);
            } else {
                missing.push(tag);
            }
        });
        if (opts.warnMissing && missing.length && window.console) {
            window.console.warn('[NexusComponents] 以下组件脚本未加载，已跳过: ' + missing.join(', '));
        }
        return registered;
    };

    window.NexusComponents = {
        register: register,
        components: COMPONENTS,
        helpers: HELPERS,
        list: function () { return Object.keys(COMPONENTS); }
    };
})();

/* ===== user-center-sdk.js ===== */
(function() {
const TOKEN_KEY = 'uc_access_token';
const REFRESH_KEY = 'uc_refresh_token';
const EXPIRES_KEY = 'uc_token_expires_at';
const LEGACY_KEYS = [
    ['siwu_uc_access_token', 'siwu_uc_refresh_token', 'siwu_uc_token_expires_at'],
    ['uc_token', 'uc_refresh_token', 'uc_token_expires_at'],
    ['ucToken', 'ucRefreshToken', 'ucTokenExpiresAt']
];

function storageOf(rememberMe) {
    try {
        return rememberMe ? window.localStorage : window.sessionStorage;
    } catch (e) {
        return window.localStorage;
    }
}

function getStored(key) {
    try {
        const s = window.sessionStorage ? window.sessionStorage.getItem(key) : null;
        if (s) return s;
    } catch (e) {}
    try {
        return window.localStorage ? window.localStorage.getItem(key) : null;
    } catch (e) {
        return null;
    }
}

function setStored(key, value, rememberMe) {
    const s = storageOf(rememberMe);
    try { s.setItem(key, value); } catch (e) {}
    try {
        const other = rememberMe ? window.sessionStorage : window.localStorage;
        if (other) other.removeItem(key);
    } catch (e) {}
}

function removeStored(key) {
    try { window.localStorage && window.localStorage.removeItem(key); } catch (e) {}
    try { window.sessionStorage && window.sessionStorage.removeItem(key); } catch (e) {}
}

function persistedIn() {
    try {
        if (window.sessionStorage && window.sessionStorage.getItem(TOKEN_KEY)) return 'session';
    } catch (e) {}
    try {
        if (window.localStorage && window.localStorage.getItem(TOKEN_KEY)) return 'local';
    } catch (e) {}
    return null;
}

const SSO_COOKIE = 'uc_sso_token';
const SSO_ROOT = 'songguokr.com';

// SDK 自有错误（error.detail）未覆盖状态码时的文案兜底：优先走 nexus-api-error.js 的
// mapHttpError 统一映射，缺失或未命中时保持原样（`HTTP xxx`），不改变既有行为。
function friendlyHttpText(status) {
    const fallback = `HTTP ${status}`;
    try {
        if (typeof window.mapHttpError === 'function') {
            const Ctor = typeof window.NexusApiError === 'function' ? window.NexusApiError : null;
            const err = Ctor ? new Ctor(fallback, status) : { name: 'NexusApiError', status: status, message: fallback };
            const text = window.mapHttpError(err);
            if (text && text !== fallback) return text;
        }
    } catch (e) { /* ignore */ }
    return fallback;
}

function ssoCookieDomain() {
    try {
        const host = window.location.hostname || '';
        if (host === 'localhost' || host === '127.0.0.1') return null;
        return host === SSO_ROOT || host.endsWith('.' + SSO_ROOT) ? '.' + SSO_ROOT : null;
    } catch (e) {
        return null;
    }
}

function readCookieBridge() {
    const domain = ssoCookieDomain();
    if (!domain) return null;
    try {
        const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + SSO_COOKIE + '=([^;]+)'));
        if (!m) return null;
        const data = JSON.parse(decodeURIComponent(m[1]));
        return data && data.a ? data : null;
    } catch (e) {
        return null;
    }
}

function writeCookieBridge(tokens, rememberMe) {
    const domain = ssoCookieDomain();
    if (!domain || !tokens || !tokens.a) return;
    const payload = encodeURIComponent(JSON.stringify({ a: tokens.a, r: tokens.r, e: tokens.e }));
    const maxAge = rememberMe !== false ? ';Max-Age=' + (30 * 24 * 3600) : '';
    try {
        document.cookie = SSO_COOKIE + '=' + payload + ';Domain=' + domain + ';Path=/;SameSite=Lax' + maxAge;
    } catch (e) {}
}

function clearCookieBridge() {
    const domain = ssoCookieDomain();
    if (!domain) return;
    try {
        document.cookie = SSO_COOKIE + '=;Domain=' + domain + ';Path=/;Max-Age=0';
    } catch (e) {}
}

class UserCenterSDK {
    constructor(config) {
        this.baseUrl = (config.baseUrl || '').replace(/^https?:\/\//, '//').replace(/\/+$/, '');
        this.appKey = config.appKey;
        this.timeout = config.timeout || 30000;
        this._accessToken = null;
        this._refreshToken = null;
        this._tokenExpiresAt = null;
        this._refreshPromise = null;
        this._onTokenUpdate = config.onTokenUpdate || null;
        this._onAuthError = config.onAuthError || null;
        this._loadPersistedTokens();
        if (!window.ucSDK && !config.silent && this.baseUrl) {
            window.ucSDK = this;
        }
    }

    get isConfigured() { return !!this.baseUrl; }

    static initFromConfig(config) {
        return new UserCenterSDK({ baseUrl: config.baseUrl, appKey: config.appKey });
    }

    _migrateLegacyTokens() {
        for (const [oldAccess, oldRefresh, oldExpires] of LEGACY_KEYS) {
            const access = getStored(oldAccess);
            if (access && !this._accessToken) {
                this._accessToken = access;
                this._refreshToken = getStored(oldRefresh);
                const exp = getStored(oldExpires);
                this._tokenExpiresAt = exp ? parseInt(exp) : null;
                removeStored(oldAccess);
                removeStored(oldRefresh);
                removeStored(oldExpires);
            }
        }
        if (this._accessToken) {
            this._persistTokens(true);
        }
    }

    _loadPersistedTokens() {
        try {
            this._accessToken = getStored(TOKEN_KEY);
            this._refreshToken = getStored(REFRESH_KEY);
            const expiresAt = getStored(EXPIRES_KEY);
            this._tokenExpiresAt = expiresAt ? parseInt(expiresAt) : null;
            if (!this._accessToken) {
                this._migrateLegacyTokens();
            }
            if (!this._accessToken) {
                const bridge = readCookieBridge();
                if (bridge && bridge.a) {
                    this._accessToken = bridge.a;
                    this._refreshToken = bridge.r || null;
                    this._tokenExpiresAt = bridge.e ? parseInt(bridge.e) : null;
                    this._persistTokens(true);
                }
            }
        } catch (e) {}
    }

    _persistTokens(rememberMe) {
        try {
            const keep = rememberMe !== false;
            if (this._accessToken) {
                setStored(TOKEN_KEY, this._accessToken, keep);
            } else {
                removeStored(TOKEN_KEY);
            }
            if (this._refreshToken) {
                setStored(REFRESH_KEY, this._refreshToken, keep);
            } else {
                removeStored(REFRESH_KEY);
            }
            if (this._tokenExpiresAt) {
                setStored(EXPIRES_KEY, String(this._tokenExpiresAt), keep);
            } else {
                removeStored(EXPIRES_KEY);
            }
            if (this._accessToken) {
                writeCookieBridge({ a: this._accessToken, r: this._refreshToken, e: this._tokenExpiresAt }, keep);
                try { window.localStorage.setItem('uc_session_epoch', String(Date.now())); } catch (e) {}
            } else {
                clearCookieBridge();
            }
        } catch (e) {}
    }

    _emitAuthChange() {
        try {
            window.dispatchEvent(new CustomEvent('uc:authchange', { detail: { authenticated: !!this._accessToken } }));
        } catch (e) {}
    }

    _setTokens(data, rememberMe) {
        this._accessToken = data.access_token;
        this._refreshToken = data.refresh_token || this._refreshToken;
        this._tokenExpiresAt = data.expires_in
            ? Date.now() + data.expires_in * 1000
            : null;
        this._persistTokens(rememberMe);
        this._emitAuthChange();
        if (this._onTokenUpdate) {
            this._onTokenUpdate({
                access_token: this._accessToken,
                refresh_token: this._refreshToken,
                expires_in: data.expires_in
            });
        }
    }

    setTokens(data, rememberMe) {
        this._setTokens(data, rememberMe);
    }

    syncFromStorage() {
        try {
            var t = getStored(TOKEN_KEY);
            if (t && t !== this._accessToken) this._accessToken = t;
            var r = getStored(REFRESH_KEY);
            if (r) this._refreshToken = r;
        } catch (e) {}
    }

    getToken() { this.syncFromStorage(); return this._accessToken; }
    getRefreshToken() { this.syncFromStorage(); return this._refreshToken; }
    isAuthenticated() { this.syncFromStorage(); return !!this._accessToken; }

    isTokenExpiringSoon(bufferSeconds = 60) {
        if (!this._tokenExpiresAt) return false;
        return Date.now() > (this._tokenExpiresAt - bufferSeconds * 1000);
    }

    clearTokens() {
        this._accessToken = null;
        this._refreshToken = null;
        this._tokenExpiresAt = null;
        this._persistTokens(true);
        this._emitAuthChange();
    }

    async _request(method, path, data = null, requireAuth = true, skipRefresh = false) {
        if (requireAuth && this.isTokenExpiringSoon() && !skipRefresh) {
            await this.refreshAccessToken();
        }
        const url = `${this.baseUrl}${path}`;
        const headers = { 'Content-Type': 'application/json' };
        if (requireAuth && this._accessToken) {
            headers['Authorization'] = `Bearer ${this._accessToken}`;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        const options = { method, headers, signal: controller.signal };
        if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
            options.body = JSON.stringify(data);
        }
        try {
            const response = await fetch(url, options);
            if (response.status === 401 && requireAuth && this._refreshToken && !skipRefresh) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    return this._request(method, path, data, requireAuth, true);
                }
            }
            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: response.statusText }));
                if (response.status === 401 && this._onAuthError) {
                    this._onAuthError(error);
                }
                const detailText = (window.NexusUtils && NexusUtils.errorDetailText)
                    ? (NexusUtils.errorDetailText(error.detail) || NexusUtils.errorDetailText(error.message))
                    : '';
                throw new Error(detailText || friendlyHttpText(response.status));
            }
            return response.json();
        } catch (e) {
            if (e.name === 'AbortError') {
                throw new Error('请求超时，请稍后重试');
            }
            throw e;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async login(username, password, inviteCode = null, captcha = null, rememberMe = true) {
        const data = { username, password, app_key: this.appKey };
        if (inviteCode) data.invite_code = inviteCode;
        if (captcha) { data.captcha_id = captcha.captchaId; data.captcha_code = captcha.captchaCode; }
        const result = await this._request('POST', '/api/auth/login', data, false);
        if (result.success && result.data) { this._setTokens(result.data, rememberMe); }
        return result;
    }

    async loginWithEmail(email, password, inviteCode = null, captcha = null, rememberMe = true) {
        const data = { email, password, app_key: this.appKey };
        if (inviteCode) data.invite_code = inviteCode;
        if (captcha) { data.captcha_id = captcha.captchaId; data.captcha_code = captcha.captchaCode; }
        const result = await this._request('POST', '/api/auth/login', data, false);
        if (result.success && result.data) { this._setTokens(result.data, rememberMe); }
        return result;
    }

    async loginWithPhone(phone, password, inviteCode = null, captcha = null, rememberMe = true) {
        const data = { phone, password, app_key: this.appKey };
        if (inviteCode) data.invite_code = inviteCode;
        if (captcha) { data.captcha_id = captcha.captchaId; data.captcha_code = captcha.captchaCode; }
        const result = await this._request('POST', '/api/auth/login', data, false);
        if (result.success && result.data) { this._setTokens(result.data, rememberMe); }
        return result;
    }

    async register({ username, password, email = null, phone = null, inviteCode = null, captcha = null }) {
        const data = { password, app_key: this.appKey };
        if (username) data.username = username;
        if (email) data.email = email;
        if (phone) data.phone = phone;
        if (inviteCode) data.invite_code = inviteCode;
        if (captcha) { data.captcha_id = captcha.captchaId; data.captcha_code = captcha.captchaCode; }
        const result = await this._request('POST', '/api/auth/register', data, false);
        if (result.success && result.data) { this._setTokens(result.data); }
        return result;
    }

    async refreshAccessToken() {
        if (!this._refreshToken) return false;
        if (this._refreshPromise) return this._refreshPromise;
        this._refreshPromise = (async () => {
            try {
                const result = await this._request('POST', '/api/auth/refresh', {
                    refresh_token: this._refreshToken
                }, false, true);
                if (result.success && result.data) {
                    this._setTokens(result.data, persistedIn() !== 'session');
                    return true;
                }
            } catch (e) {
                this.clearTokens();
            }
            return false;
        })();
        try {
            return await this._refreshPromise;
        } finally {
            this._refreshPromise = null;
        }
    }

    async logout() {
        try {
            await this._request('POST', '/api/auth/logout', null, true, true);
        } catch (e) {}
        this.clearTokens();
        try { window.NexusUtils && window.NexusUtils.markSsoLogout && window.NexusUtils.markSsoLogout(); } catch (e) {}
        try { localStorage.removeItem('nux_remembered_identifier'); } catch (e) {}
    }

    async clientCredentials() {
        const result = await this._request('POST', '/api/auth/token', {
            grant_type: 'client_credentials',
            app_key: this.appKey,
        }, false);
        if (result.success && result.data) {
            this._accessToken = result.data.access_token;
            this._tokenExpiresAt = result.data.expires_in
                ? Date.now() + result.data.expires_in * 1000 : null;
            this._persistTokens();
        }
        return result;
    }

    async verifyToken(token, permission = null) {
        const data = { token: token || this._accessToken };
        if (permission) data.permission = permission;
        return this._request('POST', '/api/auth/token/validate', data, false);
    }

    async checkPermission(token, permission) {
        return this._request('POST', '/api/auth/check-permission', { token, permission }, false);
    }

    async getLoginPageConfig(appKey = null) {
        const key = appKey || this.appKey;
        return this._request('GET', `/api/auth/login-page-config?app_key=${key}`, null, false);
    }

    async getCurrentUser() { return this._request('GET', '/api/users/me'); }
    async getUserinfo() { return this._request('GET', '/api/auth/userinfo'); }
    async updateCurrentUser(updateData) { return this._request('PUT', '/api/users/me', updateData); }

    async getFavorites(itemType = 'app') { return this._request('GET', `/api/users/me/favorites?item_type=${itemType}`); }
    async addFavorite(itemKey, itemType = 'app') {
        return this._request('POST', '/api/users/me/favorites', { item_type: itemType, item_key: itemKey });
    }
    async removeFavorite(itemKey, itemType = 'app') {
        return this._request('DELETE', `/api/users/me/favorites/${encodeURIComponent(itemKey)}?item_type=${itemType}`);
    }

    async changePassword({ oldPassword, newPassword, revokeOthers = true }) {
        return this._request('POST', '/api/auth/change-password', {
            old_password: oldPassword,
            new_password: newPassword,
            revoke_others: revokeOthers
        });
    }

    async forgotPassword({ email = null, phone = null }) {
        const data = {};
        if (email) data.email = email;
        if (phone) data.phone = phone;
        return this._request('POST', '/api/auth/forgot-password', data, false);
    }

    async resetPassword({ code, newPassword, email = null, phone = null }) {
        const data = { code, new_password: newPassword };
        if (email) data.email = email;
        if (phone) data.phone = phone;
        return this._request('POST', '/api/auth/reset-password', data, false);
    }

    async getSessions() { return this._request('GET', '/api/auth/sessions'); }
    async revokeSession(sessionId) { return this._request('DELETE', `/api/auth/sessions/${sessionId}`); }
    async revokeAllSessions() { return this._request('DELETE', '/api/auth/sessions'); }

    async getPointsSummary() { return this._request('GET', '/api/points/summary'); }
    async getPointsTransactions(direction = 'all', page = 1, pageSize = 20) {
        return this._request('GET', `/api/points/transactions?direction=${direction}&page=${page}&page_size=${pageSize}`);
    }
    async getPointsCatalog(appKey = '') {
        const q = appKey ? `?app=${encodeURIComponent(appKey)}` : '';
        return this._request('GET', `/api/billing/catalog${q}`);
    }
    async getMetersSummary() { return this._request('GET', '/api/billing/meters/summary'); }
    async getBillingSummary() { return this._request('GET', '/api/billing/summary'); }

    async getCreditPackages() { return this._request('GET', '/api/billing/packages'); }
    async createCreditOrder(packageId) {
        const appKey = (window.ucConfig && window.ucConfig.app_key) || null;
        const data = { package_id: packageId };
        if (appKey) data.app = appKey;
        return this._request('POST', '/api/billing/orders', data);
    }
    async getCreditOrders(page = 1, pageSize = 20) {
        return this._request('GET', `/api/billing/orders?page=${page}&page_size=${pageSize}`);
    }
    async cancelCreditOrder(orderNo) { return this._request('POST', `/api/billing/orders/${orderNo}/cancel`); }
    async payCreditOrder(orderNo) { return this._request('POST', `/api/billing/orders/${orderNo}/pay`); }

    async getAccountExport() { return this._request('GET', '/api/auth/account/export'); }

    async deleteAccount({ password }) {
        return this._request('DELETE', '/api/auth/account', { password }, true);
    }

    async sendBindCode({ email = null, phone = null }) {
        const data = {};
        if (email) data.email = email;
        if (phone) data.phone = phone;
        return this._request('POST', '/api/auth/send-bind-code', data);
    }

    async bindContact({ code, email = null, phone = null }) {
        const data = { code };
        if (email) data.email = email;
        if (phone) data.phone = phone;
        return this._request('PUT', '/api/auth/bind-contact', data);
    }

    async thirdPartyLogin(provider, code, state = null, extra = null, rememberMe = true) {
        const data = { app_key: this.appKey, provider, code };
        if (state) data.state = state;
        if (extra) data.extra = extra;
        const result = await this._request('POST', '/api/auth/third-party', data, false);
        if (result.success && result.data) { this._setTokens(result.data, rememberMe); }
        return result;
    }

    static initFromScriptTag() {
        const scripts = document.getElementsByTagName('script');
        for (const script of scripts) {
            if (script.src && script.src.includes('userCenterSDK')) {
                const baseUrl = script.getAttribute('data-base-url') || script.getAttribute('data-server');
                const appKey = script.getAttribute('data-app-key');
                if (baseUrl && appKey) {
                    return new UserCenterSDK({ baseUrl, appKey });
                }
            }
        }
        return null;
    }

    static resolveConfig() {
        const cfg = window.ucConfig || null;
        if (cfg && cfg.base_url) {
            return { baseUrl: cfg.base_url, appKey: cfg.app_key || '' };
        }
        const scripts = document.getElementsByTagName('script');
        for (const script of scripts) {
            if (script.src && script.src.indexOf('user-center-sdk.js') !== -1) {
                const baseUrl = script.getAttribute('data-base-url');
                if (baseUrl) {
                    return { baseUrl, appKey: script.getAttribute('data-app-key') || '' };
                }
            }
        }
        return { baseUrl: '', appKey: '' };
    }

    static ensureGlobalSdk() {
        const existing = window.ucSDK || window.__UC_SDK__ || window.ucSdk || null;
        if (existing && existing.baseUrl && typeof existing.changePassword === 'function') return existing;
        const cfg = UserCenterSDK.resolveConfig();
        if (!cfg.baseUrl) return null;
        const sdk = new UserCenterSDK({ baseUrl: cfg.baseUrl, appKey: cfg.appKey, silent: true });
        window.ucSDK = sdk;
        return sdk;
    }

    static getToken() {
        return getStored(TOKEN_KEY);
    }

    static clearTokens() {
        removeStored(TOKEN_KEY);
        removeStored(REFRESH_KEY);
        removeStored(EXPIRES_KEY);
    }
}

window.UserCenterSDK = UserCenterSDK;

try {
    window.addEventListener('storage', function (e) {
        if (!e || e.key !== TOKEN_KEY) return;
        var sdk = window.ucSDK || window.__UC_SDK__ || window.ucSdk || null;
        if (sdk && typeof sdk.syncFromStorage === 'function') sdk.syncFromStorage();
        window.dispatchEvent(new CustomEvent('uc:authchange', { detail: { authenticated: !!e.newValue } }));
    });
} catch (e) {}
})();

/* ===== components/nux-result-view.js ===== */
(function () {
    'use strict';

    window.NexusUtils && NexusUtils.injectStyle('nrv-css', [
            '.nrv { margin-top: 4px; }',
            '.nrv-summary { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }',
            '.nrv-summary-item { font-size: 11px; padding: 2px 8px; background: rgba(var(--app-accent-rgb,99,102,241),.08); color: var(--app-accent,#6366f1); border-radius: var(--nx-radius-sm,6px); }',
            '.nrv-table-wrap { overflow-x: auto; max-height: 220px; overflow-y: auto; background: var(--nx-bg-surface,#fff); border-radius: var(--nx-radius-sm,6px); }',
            '.nrv-table { width: 100%; border-collapse: collapse; font-size: 11px; }',
            '.nrv-table th, .nrv-table td { padding: 5px 8px; border: 1px solid var(--nx-border,rgba(0,0,0,.08)); text-align: left; white-space: nowrap; max-width: 240px; overflow: hidden; text-overflow: ellipsis; }',
            '.nrv-table th { background: var(--nx-bg-muted,#f1f5f9); color: var(--app-accent,#6366f1); font-weight: 600; position: sticky; top: 0; }',
            '.nrv-table tr:nth-child(even) td { background: var(--nx-bg-muted,#f1f5f9); }',
            '.nrv-kv-item { display: flex; gap: 8px; padding: 3px 0; font-size: 11px; border-bottom: 1px dashed var(--nx-border,rgba(0,0,0,.08)); }',
            '.nrv-kv-key { color: var(--nx-text-muted,#94a3b8); flex: 0 0 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
            '.nrv-kv-val { color: var(--nx-text-body,#334155); word-break: break-word; }'
        ].join(''));

    const NuxResultView = {
        name: 'NuxResultView',
        props: { struct: { type: Object, default: null } },
        template: `
            <div v-if="struct" class="nrv">
                <div v-if="struct.kind === 'table'" class="nrv-table-wrap">
                    <div v-if="struct.summary" class="nrv-summary">
                        <span v-for="(v, k) in struct.summary" :key="k" class="nrv-summary-item">{{ k }}: {{ v }}</span>
                    </div>
                    <table class="nrv-table">
                        <thead><tr><th v-for="c in struct.columns" :key="c">{{ c }}</th></tr></thead>
                        <tbody>
                            <tr v-for="(r, ri) in struct.rows" :key="ri">
                                <td v-for="c in struct.columns" :key="c">{{ r[c] }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-else-if="struct.kind === 'kv'" class="nrv-kv">
                    <div v-for="p in struct.pairs" :key="p.k" class="nrv-kv-item">
                        <span class="nrv-kv-key">{{ p.k }}</span><span class="nrv-kv-val">{{ p.v }}</span>
                    </div>
                </div>
            </div>
        `
    };

    window.NuxResultView = NuxResultView;
})();

/* ===== core/nexus-user.js ===== */
(function () {
    'use strict';

    const UC_PREFIX = 'uc_';
    const AUTO_PREFIX = 'user_';
    const GUEST_PREFIX = 'guest_';
    const DEFAULT_NAME = '星友';
    const PLACEHOLDER_TOKENS = { unknown: 1, 未知: 1, undefined: 1, null: 1, none: 1, 'n/a': 1, '未设置': 1, '未命名': 1, '匿名': 1 };
    const SYNTHETIC_EMAIL_MARK = '@users.internal';

    function isUcFallback(value) {
        if (typeof value !== 'string') return false;
        return value.indexOf(UC_PREFIX) === 0 || value.indexOf(AUTO_PREFIX) === 0 || value.indexOf(GUEST_PREFIX) === 0;
    }

    function isSyntheticEmail(email) {
        return typeof email === 'string' && email.trim().toLowerCase().indexOf(SYNTHETIC_EMAIL_MARK) > 0;
    }

    function isAutoGenerated(name, userId) {
        if (typeof name !== 'string') return true;
        const value = name.trim();
        if (!value) return true;
        if (/^\d+$/.test(value)) return true;
        if (PLACEHOLDER_TOKENS[value.toLowerCase()]) return true;
        if (userId && value === String(userId)) return true;
        if (value.indexOf('用户') === 0) return true;
        return isUcFallback(value);
    }

    function maskPhone(phone) {
        return NexusUtils.formatPhone(typeof phone === 'string' ? phone.trim() : phone);
    }

    function maskEmail(email) {
        if (typeof email !== 'string') return '';
        const e = email.trim();
        const at = e.indexOf('@');
        if (at <= 0) return e;
        const local = e.slice(0, at);
        const domain = e.slice(at + 1);
        if (local.length <= 1) return local + '***@' + domain;
        return local[0] + '***' + local[local.length - 1] + '@' + domain;
    }

    function getDisplayName(user) {
        if (!user) return '';
        const userId = user.user_id != null ? String(user.user_id) : '';
        const candidates = ['resolved_display_name', 'display_name', 'nickname', 'username', 'full_name', 'name'];
        for (let i = 0; i < candidates.length; i++) {
            const raw = user[candidates[i]];
            if (raw === undefined || raw === null) continue;
            if (!isAutoGenerated(raw, userId)) return String(raw).trim();
        }
        const email = String(user.email || '').trim();
        if (email && !isSyntheticEmail(email)) return maskEmail(email);
        const phone = String(user.phone || '').trim();
        if (phone) return maskPhone(phone);
        return DEFAULT_NAME;
    }

    function resolveName(user, fallback) {
        const name = getDisplayName(user);
        return name || fallback || '';
    }

    const NexusUser = { getDisplayName: getDisplayName, resolveName: resolveName, isUcFallback: isUcFallback };

    if (window.NexusUtils && typeof window.NexusUtils === 'object') {
        window.NexusUtils.getDisplayName = getDisplayName;
    }

    window.NexusUser = NexusUser;
})();

/* ===== core/nexus-error-text.js ===== */
(function () {
    'use strict';

    const STACK_MARKERS = ['Traceback', 'sqlalche.me', 'DetachedInstanceError', ' at 0x', 'File "', 'raise '];
    const MAX_LEN = 80;

    function looksLikeStack(text) {
        if (!text) return false;
        const t = String(text);
        const hit = STACK_MARKERS.some(function (m) { return t.indexOf(m) !== -1; });
        return hit || (t.length > 200 && /\s(at|line|File)\s/i.test(t));
    }

    function safeMessage(raw, maxLen) {
        if (raw == null) return '';
        let s = String(raw);
        if (looksLikeStack(s)) return '服务开小差了，请稍后重试';
        s = s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        const limit = maxLen || MAX_LEN;
        return s.length > limit ? s.slice(0, limit) + '…' : s;
    }

    function extractCode(e) {
        if (e && e.code) return String(e.code);
        const status = (e && e.response && e.response.status) || (e && e.status) || 0;
        if (status) return 'HTTP ' + status;
        if (e && e.name && e.name !== 'Error') return e.name;
        return '';
    }

    function extractServerMessage(e) {
        if (!e) return '';
        const normalize = (window.NexusUtils && NexusUtils.errorDetailText) || null;
        const d = (e.response && e.response.data) || e.data;
        if (d && typeof d === 'object') {
            if (normalize) return normalize(d);
            return d.detail || d.message || d.error || '';
        }
        return e.message || '';
    }

    const ERROR_CODE_TEXT = {
        RATE_LIMIT_EXCEEDED: '操作过于频繁，请稍后再试',
        RATE_LIMITED: '操作过于频繁，请稍后再试',
        AUTH_ERROR: '登录已失效，请重新登录',
        FORBIDDEN: '没有权限执行此操作',
        NOT_FOUND: '请求的资源不存在',
        CONFLICT: '数据冲突，请刷新后重试',
        BAD_REQUEST: '请求参数有误，请检查后重试',
        VALIDATION_ERROR: '提交的数据有误，请检查后重试',
        CONTENT_FILTERED: '内容触发安全限制，请调整后重试',
        EXTERNAL_SERVICE_ERROR: '外部服务暂时不可用，请稍后重试',
        SERVICE_UNAVAILABLE: '服务暂时不可用，请稍后重试',
        DATABASE_ERROR: '数据库操作失败，请稍后重试',
        XIANYU_AUTH_ERROR: '闲鱼认证失效，请重新登录闲鱼',
        XIANYU_RATE_LIMIT: '闲鱼请求过于频繁，请稍后再试'
    };

    function codeToTitle(e) {
        const c = (e && (e.errorCode || (e.response && e.response.data && e.response.data.error_code) || (e.response && e.response.data && e.response.data.code))) || '';
        return (c && ERROR_CODE_TEXT[c]) || '';
    }

    function fromError(e, fallback) {
        const code = extractCode(e);
        const status = (e && e.response && e.response.status) || (e && e.status) || 0;
        const codeTitle = codeToTitle(e);
        if (status === 401 || status === 403 || codeTitle) {
            return { title: codeTitle || '登录已失效，请重新登录', message: status === 401 ? '' : status === 403 ? '若已登录账号请刷新后重试' : '', code: code || 'HTTP ' + status };
        }
        const raw = extractServerMessage(e);
        const net = e && (e.code === 'ECONNABORTED' || e.code === 'ERR_NETWORK' || /network|timeout|socket/i.test(String(e.message || '')));
        if (net || /failed to fetch/i.test(String(raw || e.message || ''))) {
            return { title: '网络异常，请检查网络后重试', message: '', code: code || 'NETWORK' };
        }
        if (status >= 500 || looksLikeStack(raw)) {
            return { title: '服务开小差了', message: '请稍后重试，若持续出现请联系我们', code: code || 'SERVER' };
        }
        const safe = safeMessage(raw) || (fallback || '操作失败');
        return { title: fallback || '操作失败', message: safe === (fallback || '操作失败') ? '' : safe, code: code };
    }

    const NexusErrorText = { fromError: fromError, safeMessage: safeMessage, looksLikeStack: looksLikeStack };

    if (window.NexusUtils && typeof window.NexusUtils === 'object') {
        window.NexusUtils.safeErrorText = safeMessage;
    }

    window.NexusErrorText = NexusErrorText;
})();

/* ===== components/nux-ai-badge.js ===== */
(function () {
    'use strict';

    const NuxAiBadge = {
        name: 'NuxAiBadge',
        props: {
            size: { type: String, default: 'md', validator: v => ['sm', 'md'].includes(v) },
            text: { type: String, default: 'AI 生成' },
            tone: { type: String, default: 'accent' }
        },
        computed: {
            cls() {
                return ['nx-ai-badge', this.size === 'sm' ? 'nx-ai-badge-sm' : 'nx-ai-badge-md'].join(' ');
            }
        },
        template: `
            <span :class="cls" :data-tone="tone" role="note" aria-label="此内容由 AI 生成">
                <svg class="nx-ai-badge-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                    <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"/>
                    <path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8L19 15z"/>
                </svg>
                <span class="nx-ai-badge-text">{{ text }}</span>
            </span>
        `
    };

    window.NuxAiBadge = NuxAiBadge;
})();

/* ===== components/nux-skeleton.js ===== */
(function() {
    const NuxSkeleton = {
        name: 'NuxSkeleton',
        props: {
            loading: { type: Boolean, default: true },
            rows: { type: Number, default: 3 },
            avatar: { type: Boolean, default: false },
            variant: { type: String, default: 'list' },
            cards: { type: Number, default: 4 },
            ariaLabel: { type: String, default: '' },
            preset: { type: String, default: '' }
        },
        computed: {
            mode() {
                if (this.preset === 'cards') return 'cards';
                if (this.preset === 'gallery') return 'gallery';
                if (this.preset === 'report') return 'report';
                if (!this.preset && this.variant === 'grid') return 'cards';
                return 'text';
            },
            showAvatar() {
                return this.avatar || this.preset === 'list';
            },
            rowCount() {
                const n = Math.round(Number(this.rows));
                return isNaN(n) || n < 1 ? 1 : n;
            },
            cardCount() {
                const n = Math.round(Number(this.cards));
                return isNaN(n) || n < 1 ? 1 : n;
            },
            shapeClass() {
                return 'is-' + (this.preset || this.variant);
            }
        },
        template: `
            <div v-if="loading" class="nux-skeleton" :class="shapeClass" role="status" aria-busy="true" :aria-label="ariaLabel || '加载中'">
                <div v-if="mode==='cards'" class="nux-skeleton-grid" aria-hidden="true">
                    <div v-for="i in cardCount" :key="i" class="nux-skeleton-card">
                        <div class="nux-skeleton-card-cover"></div>
                        <div class="nux-skeleton-card-body">
                            <div class="nux-skeleton-card-line" style="width:100%"></div>
                            <div class="nux-skeleton-card-line" style="width:70%"></div>
                        </div>
                    </div>
                </div>
                <div v-else-if="mode==='gallery'" class="nux-skeleton-grid nux-skeleton-grid-gallery" aria-hidden="true">
                    <div v-for="i in cardCount" :key="i" class="nux-skeleton-card">
                        <div class="nux-skeleton-card-cover nux-skeleton-cover-tall"></div>
                        <div class="nux-skeleton-card-body">
                            <div class="nux-skeleton-card-line" style="width:56%"></div>
                        </div>
                    </div>
                </div>
                <div v-else-if="mode==='report'" class="nux-skeleton-report" aria-hidden="true">
                    <div class="nux-skeleton-report-title"></div>
                    <div class="nux-skeleton-report-sub"></div>
                    <div class="nux-skeleton-content">
                        <div v-for="i in rowCount" :key="i" class="nux-skeleton-row" :style="{ width: i === rowCount ? '58%' : '100%' }"></div>
                    </div>
                    <div class="nux-skeleton-report-block"></div>
                    <div class="nux-skeleton-row" style="width:78%"></div>
                </div>
                <template v-else>
                    <div v-if="showAvatar" class="nux-skeleton-avatar" aria-hidden="true"></div>
                    <div class="nux-skeleton-content" aria-hidden="true">
                        <div v-for="i in rowCount" :key="i" class="nux-skeleton-row" :style="{ width: i === rowCount ? '60%' : '100%' }"></div>
                    </div>
                </template>
            </div>
            <slot v-else></slot>
        `
    };
    window.NuxSkeleton = NuxSkeleton;
})();

/* ===== components/nux-empty-state.js ===== */
(function () {
    const NuxEmptyState = {
        name: 'NuxEmptyState',
        props: {
            icon: { type: String, default: '💡' },
            title: { type: String, default: '这里还空着' },
            description: { type: String, default: '' },
            hint: { type: String, default: '' },
            primaryText: { type: String, default: '' },
            secondaryText: { type: String, default: '' },
            primaryLoading: { type: Boolean, default: false },
        },
        emits: ['primary', 'secondary'],
        template: `
            <div class="nx-empty-state" role="status" aria-live="polite">
                <i v-if="icon" aria-hidden="true">{{ icon }}</i>
                <h3>{{ title }}</h3>
                <p v-if="description">{{ description }}</p>
                <div v-if="hint" class="nx-empty-hint">{{ hint }}</div>
                <div v-if="primaryText || secondaryText" class="nx-empty-actions">
                    <button v-if="primaryText" class="nux-btn nux-btn--primary"
                            :disabled="primaryLoading" @click="$emit('primary')">
                        <span v-if="primaryLoading" class="nx-spinner" style="width:14px;height:14px;margin-right:6px;"></span>
                        {{ primaryLoading ? '…' : primaryText }}
                    </button>
                    <button v-if="secondaryText" class="nux-btn nux-btn--ghost" @click="$emit('secondary')">
                        {{ secondaryText }}
                    </button>
                </div>
            </div>
        `
    };

    window.NuxEmptyState = NuxEmptyState;
})();

/* ===== components/nux-error-state.js ===== */
(function() {
    const NuxErrorState = {
        name: 'NuxErrorState',
        props: {
            icon: { type: String, default: '⚠️' },
            title: { type: String, default: '加载失败' },
            message: { type: String, default: '' },
            code: { type: String, default: '' },
            retryText: { type: String, default: '重试' }
        },
        emits: ['retry'],
        template: `
            <div class="nx-empty-state nux-error-state" role="alert" aria-live="assertive">
                <i v-if="icon" aria-hidden="true">{{ icon }}</i>
                <h3>{{ title }}</h3>
                <p v-if="message">{{ message }}</p>
                <div v-if="retryText" class="nx-empty-actions">
                    <button class="nux-btn nux-btn--primary" @click="$emit('retry')">{{ retryText }}</button>
                </div>
                <div v-if="code" class="nux-error-code">{{ code }}</div>
            </div>
        `
    };

    window.NuxErrorState = NuxErrorState;
})();

/* ===== components/nux-ai-indicator.js ===== */
(function() {
    if (window.NuxAiIndicator) return;
    if (!window.Vue) return;

    const NuxAiIndicator = {
        name: 'NuxAiIndicator',
        props: {
            state: { type: String, default: 'awaiting' },
            label: { type: String, default: '' }
        },
        computed: {
            text() {
                if (this.state === 'tool') return '已调度能力，正在为你处理…';
                if (this.state === 'routing') return '正在寻找最合适的能力…';
                if (this.state === 'streaming') return '正在生成回答…';
                return this.label || '正在理解你的需求…';
            },
            isTyping() {
                return !this.state || this.state === 'awaiting' || this.state === 'streaming';
            }
        },
        template: `
            <div class="nux-ai-indicator" role="status" :aria-live="'polite'">
                <span class="nux-ai-indicator-dots" aria-hidden="true">
                    <i></i><i></i><i></i>
                </span>
                <span class="nux-ai-indicator-text">{{ text }}</span>
            </div>
        `
    };

    if (window.Vue && Vue.component) {
        try { Vue.component('nux-ai-indicator', NuxAiIndicator); } catch (e) {}
    }

    window.NuxAiIndicator = NuxAiIndicator;
})();

/* ===== core/nexus-app.js ===== */
(function () {
    'use strict';

    function _status(err) {
        return err && (err.status !== undefined ? err.status : err.response && err.response.status) || null;
    }

    const _toastState = { last: 0 };
    let _authHandler = null;

    const NexusApp = {
        get authHandler() { return _authHandler; },
        setAuthHandler(fn) {
            if (typeof fn === 'function') _authHandler = fn;
        },

        handleError(err, instance, info) {
            if (!err) return;
            if (err && err.name === 'NexusStreamError') {
                NexusApp.handleErrorPayload(err.message, err.status || 401, err);
                return;
            }
            const status = _status(err);
            if (window.NexusErrorText && typeof window.NexusErrorText.fromError === 'function') {
                const mapped = window.NexusErrorText.fromError(err, err.message || '操作失败');
                NexusApp.handleErrorPayload(mapped.message || mapped.title, status, err);
                return;
            }
            const message = (window.mapHttpError && typeof window.mapHttpError === 'function')
                ? window.mapHttpError(err)
                : (err.message || '操作失败');
            NexusApp.handleErrorPayload(message, status, err);
        },

        handleErrorPayload(message, status, err) {
            if (status === 401) {
                if (NexusApp.clearStaleAuth) NexusApp.clearStaleAuth();
                if (_authHandler) { _authHandler(message); return; }
                NexusApp.notify('登录已过期，请重新登录', 'error');
                return;
            }
            if (!message) return;
            const safe = (window.NexusErrorText && typeof window.NexusErrorText.safeMessage === 'function')
                ? window.NexusErrorText.safeMessage(message)
                : message;
            if (!safe) return;
            const now = Date.now();
            if (now - _toastState.last < 1000) return;
            _toastState.last = now;
            NexusApp.notify(safe, 'error');
            if (typeof console !== 'undefined' && console.error) console.error('[NexusApp]', err || message);
        },

        notify(message, type) {
            if (!message) return;
            if (typeof window.showToast === 'function') window.showToast(message, type || 'error', 3000);
        },

        bindGlobal() {
            if (NexusApp._bound) return;
            NexusApp._bound = true;
            window.addEventListener('unhandledrejection', function (evt) {
                if (!evt || !evt.reason) return;
                if (evt.reason && evt.reason.__nxHandled) return;
                if (evt.reason && evt.reason.name === 'AbortError') return;
                if (evt.reason && evt.reason.name === 'NexusStreamError') {
                    NexusApp.handleError(evt.reason);
                    evt.reason.__nxHandled = true;
                    return;
                }
                const status = _status(evt.reason);
                if (status === 401) {
                    NexusApp.handleError(evt.reason);
                    evt.reason.__nxHandled = true;
                }
            });
            window.addEventListener('error', function (evt) {
                if (evt && evt.error && evt.error.name === 'AbortError') return;
            });
        },

        clearStaleAuth() {
            const keys = ['uc_access_token', 'uc_refresh_token', 'uc_token_expires_at', 'uc_token', 'access_token', 'refresh_token', 'user'];
            keys.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
            if (window.NexusStore) { try { NexusStore.prototype.logout && new NexusStore().logout(); } catch (e) {} }
        },

        bindSsoGuard() {
            if (NexusApp._ssoBound) return;
            NexusApp._ssoBound = true;
            const check = function () {
                if (!window.NexusUtils || typeof window.NexusUtils.ssoSessionGuard !== 'function') return;
                let forced = false;
                try { forced = window.NexusUtils.ssoSessionGuard(); } catch (e) { return; }
                if (!forced) return;
                window.location.reload();
            };
            window.addEventListener('focus', check);
            document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
            setInterval(check, 30000);
            check();
        },

        registerCoreComponents(app) {
            if (!app || !app.component) return;
            const map = {
                'nux-ai-badge': window.NuxAiBadge,
                'nux-error-state': window.NuxErrorState,
                'nux-skeleton': window.NuxSkeleton,
                'nux-empty-state': window.NuxEmptyState,
                'nux-ai-indicator': window.NuxAiIndicator
            };
            Object.keys(map).forEach(function (name) {
                const comp = map[name];
                if (comp && !app.component(name)) {
                    try { app.component(name, comp); } catch (e) {}
                }
            });
        },

        install(app) {
            if (!app) return;
            NexusApp.registerCoreComponents(app);
            if (app.config) {
                app.config.errorHandler = function (err, instance, info) { NexusApp.handleError(err, instance, info); };
                if (window.NexusUtils) app.config.globalProperties.NexusUtils = window.NexusUtils;
            }
            NexusApp.bindGlobal();
            NexusApp.initAppLoading();
        },

        bootstrap(__options) {
            const options = __options || {};
            const root = options.el || '#app';
            const imports = options.components || {};
            const mount = options.mount !== false;
            let app;
            if (options.app) {
                app = options.app;
            } else if (window.Vue && typeof window.Vue.createApp === 'function') {
                app = window.Vue.createApp(options.setup || {});
            } else {
                return null;
            }
            Object.keys(imports).forEach(function (name) {
                if (imports[name]) { try { app.component(name, imports[name]); } catch (e) {} }
            });
            NexusApp.install(app);
            if (mount) {
                const el = typeof root === 'string' ? document.querySelector(root) : root;
                if (el) { try { app.mount(el); } catch (e) {} }
            }
            return app;
        },

        initAppLoading() {
            if (NexusApp._loadingInit) return;
            NexusApp._loadingInit = true;
            const overlay = document.getElementById('app-loading');
            if (!overlay) return;
            const hide = function () {
                if (!overlay || !overlay.parentNode || overlay.dataset.nxHidden) return;
                overlay.dataset.nxHidden = '1';
                overlay.classList.add('nx-app-loading-done');
                setTimeout(function () {
                    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                }, 320);
            };
            if (typeof MutationObserver === 'function') {
                const target = document.querySelector('#app[data-v-app]') || document.getElementById('app');
                if (target && target.dataset.vApp !== undefined) { hide(); return; }
                const root = document.getElementById('app') || document.body;
                const mo = new MutationObserver(function (mutations) {
                    const el = document.getElementById('app');
                    if (el && el.getAttribute('data-v-app') !== null) { mo.disconnect(); hide(); }
                });
                mo.observe(root, { attributes: true, subtree: true, childList: true });
                setTimeout(function () { mo.disconnect(); hide(); }, 6000);
            } else {
                setTimeout(hide, 6000);
            }
        }
    };

    window.NexusApp = NexusApp;

    if (typeof window !== 'undefined') {
        NexusApp.bindGlobal();
        NexusApp.bindSsoGuard();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { NexusApp.initAppLoading(); });
        } else {
            NexusApp.initAppLoading();
        }
    }
})();
