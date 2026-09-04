
/* ===== nexus-utils.js ===== */
(function() {
    const CN_TZ = 'Asia/Shanghai';
    const utils = {
        parseDate(value) {
            if (!value) return null;
            if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
            if (typeof value === 'number') return new Date(value);
            const s = String(value).trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
                const d = new Date(s + 'T00:00:00');
                return isNaN(d.getTime()) ? null : d;
            }
            let str = s.replace(' ', 'T');
            if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(str)) str += 'Z';
            const d = new Date(str);
            return isNaN(d.getTime()) ? null : d;
        },

        formatDate(dateString, options = {}) {
            const date = this.parseDate(dateString);
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
            return this.formatDate(dateString, { hour: undefined, minute: undefined });
        },

        formatCurrency(amount) {
            if (amount === undefined || amount === null || isNaN(amount)) return '¥0';
            return '¥' + Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        },

        formatNumber(num, decimals = 2) {
            if (num === undefined || num === null || isNaN(num)) return '0';
            return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        },

        truncateText(text, maxLength = 100) {
            if (!text) return '';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        },

        getGreeting() {
            const hour = new Date().getHours();
            if (hour < 6) return '夜深了';
            if (hour < 9) return '早上好';
            if (hour < 12) return '上午好';
            if (hour < 14) return '中午好';
            if (hour < 18) return '下午好';
            return '晚上好';
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

        formatRelativeTime(dateString) {
            const date = this.parseDate(dateString);
            if (!date) return '';
            const now = Date.now();
            const diff = now - date.getTime();
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            if (seconds < 60) return '刚刚';
            if (minutes < 60) return `${minutes}分钟前`;
            if (hours < 24) return `${hours}小时前`;
            if (days < 30) return `${days}天前`;
            return this.formatDateShort(dateString);
        },

        formatDateTime(dateString, options = {}) {
            const date = this.parseDate(dateString);
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
            return this.isDarkTheme() ? darkColor : lightColor;
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
            return this.formatRelativeTime(dateString);
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
                return navigator.clipboard.writeText(text).then(() => true).catch(() => this._copyFallback(text));
            }
            return Promise.resolve(this._copyFallback(text));
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
            return this.copyToClipboard(text).then((ok) => {
                if (ok) {
                    if (opts.success) this.showToast(opts.success, opts.type || 'success');
                } else if (opts.fail) {
                    this.showToast(opts.fail, 'error');
                }
                return ok;
            });
        },

        showToast(message, type = 'info', options = {}) {
            if (!window.ElementPlus || !ElementPlus.ElMessage) return;
            ElementPlus.ElMessage({ message, type, duration: options.duration || 3000, ...options });
        },

        confirm(message, title = '操作确认', options = {}) {
            if (!window.ElementPlus || !ElementPlus.ElMessageBox) return Promise.resolve(false);
            return ElementPlus.ElMessageBox.confirm(message, title, {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
                ...options
            }).then(() => true).catch(() => false);
        }
    };

    utils.setViewportHeight();
    utils._resizeHandler = utils.debounce(utils.setViewportHeight, 100);
    window.addEventListener('resize', utils._resizeHandler);

    window.NexusUtils = utils;
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
            this.isNetwork = false;
        }
    }

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

    window.NexusApiError = NexusApiError;
    window.isNetworkError = isNetworkError;
    window.mapHttpError = mapHttpError;
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
        if (v === null || v === undefined) return '';
        if (typeof v === 'string') return v;
        if (Array.isArray(v)) return v.join(', ');
        if (typeof v === 'object') return JSON.stringify(v);
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
            this.storage = config.storage || localStorage;
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

        _buildHeaders(extra) {
            const token = this._getToken();
            return {
                'Content-Type': 'application/json',
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
                if (this.onRefreshSuccess) this.onRefreshSuccess(rdata);
                return newToken;
            }).catch((err) => {
                throw err.name === 'AbortError' ? new Error('refresh timeout') : err;
            }).finally(() => { clearTimeout(refreshTimeoutId); this._refreshPromise = null; });
            return this._refreshPromise;
        }

        async request(url, options = {}) {
            const controller = new AbortController();
            const requestId = this._generateRequestId(url);
            this._registerController(requestId, controller);

            const timeoutValue = options.timeout !== undefined ? options.timeout : this.timeout;
            const timeoutId = setTimeout(() => controller.abort(), timeoutValue);

            const isIdempotent = !options.method || options.method === 'GET';
            const maxAttempts = isIdempotent ? this.maxRetry : 1;
            const skipAuthRefresh = options.skipAuthRefresh === true;
            let lastError;

            try {
                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        const { response, data } = await this._doFetch(url, options, controller);

                        if (!response.ok) {
                            const errorMsg = this._extractError(data);
                            if (response.status === 401 && !skipAuthRefresh && this.refreshUrl) {
                                try {
                                    await this._tryRefresh();
                                    const retryResult = await this._doFetch(url, options, controller);
                                    if (!retryResult.response.ok) {
                                        const retryMsg = this._extractError(retryResult.data);
                                        throw new ApiError(retryMsg, retryResult.response.status, retryResult.data);
                                    }
                                    return retryResult.data;
                                } catch (refreshErr) {
                                    this._clearAuth();
                                    if (this.onUnauthorized) this.onUnauthorized();
                                    throw new ApiError('登录已过期，请重新登录', 401, null);
                                }
                            }
                            if (response.status === 401) {
                                this._clearAuth();
                                if (this.onUnauthorized) this.onUnauthorized();
                                const msg401 = skipAuthRefresh ? (errorMsg || '认证失败') : '登录已过期，请重新登录';
                                throw new ApiError(msg401, 401, data);
                            }
                            if (this.onError) this.onError(response.status, errorMsg);
                            throw new ApiError(errorMsg, response.status, data);
                        }

                        return data;
                    } catch (error) {
                        lastError = error;
                        if (error.name === 'AbortError') throw new ApiError('请求超时，请稍后重试', 408, null);
                        if (_isNetworkErr(error)) {
                            const e = new ApiError('网络连接失败，请检查网络后重试', null, null);
                            e.isNetwork = true; throw e;
                        }
                        if (error.name === 'NexusApiError' || (error.message && error.message.includes('登录已过期'))) throw error;
                        if (attempt < maxAttempts) {
                            const delay = Math.min(MAX_DELAY, BASE_DELAY * 2 ** (attempt - 1)) * (0.5 + Math.random() * 0.5);
                            await new Promise(r => setTimeout(r, delay));
                        }
                    }
                }
                throw lastError;
            } finally {
                clearTimeout(timeoutId);
                this.abortControllers.delete(requestId);
            }
        }

        get(url, params = {}, options = {}) {
            const filtered = {};
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') filtered[k] = v;
            });
            const qs = new URLSearchParams(filtered).toString();
            return this.request(qs ? `${url}?${qs}` : url, { method: 'GET', ...options });
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
            const headers = { ...(token && { 'Authorization': `Bearer ${token}` }), ...options.headers };
            return fetch(`${this.baseUrl}${url}`, { method: 'POST', body: formData, headers, ...options })
            .then(async (res) => {
                let data; const ct = res.headers.get('content-type') || '';
                if (ct.includes('application/json')) data = await res.json();
                else { const t = await res.text(); try { data = JSON.parse(t); } catch { data = { detail: t }; } }
                if (!res.ok) throw new ApiError(this._extractError(data), res.status, data);
                return data;
            }).catch((err) => {
                if (err.name === 'NexusApiError') throw err;
                throw _isNetworkErr(err) ? new ApiError('网络连接失败，请检查网络后重试', null, null) : new ApiError(err.message || '上传失败', null, null);
            });
        }

        async streamPost(url, data = {}, { onEvent, onError, timeout = 60000, headers = {} } = {}) {
            const controller = new AbortController();
            const requestId = this._generateRequestId(url);
            this._registerController(requestId, controller);
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(`${this.baseUrl}${url}`, {
                    method: 'POST',
                    headers: this._buildHeaders(headers),
                    body: JSON.stringify(data),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    let errData;
                    try { errData = await response.json(); } catch { errData = {}; }
                    const errorMsg = this._extractError(errData);
                    if (response.status === 401) {
                        this._clearAuth();
                        if (this.onUnauthorized) this.onUnauthorized();
                        if (onError) onError('登录已过期，请重新登录');
                        return;
                    }
                    if (this.onError) this.onError(response.status, errorMsg);
                    if (onError) onError(errorMsg);
                    return;
                }
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let currentEvent = null;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    let newlineIdx;
                    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
                        const line = buffer.slice(0, newlineIdx);
                        buffer = buffer.slice(newlineIdx + 1);
                        if (line.startsWith('event:')) {
                            currentEvent = line.slice(6).trim();
                        } else if (line.startsWith('data:')) {
                            const payload = line.slice(5).trim();
                            if (payload && onEvent) {
                                try { onEvent(currentEvent, JSON.parse(payload)); }
                                catch (e) { /* ignore parse error */ }
                            }
                        } else if (line === '') {
                            currentEvent = null;
                        }
                    }
                }
                if (buffer && buffer.length) {
                    const line = buffer.trim();
                    if (line.startsWith('data:')) {
                        const payload = line.slice(5).trim();
                        if (payload && onEvent) {
                            try { onEvent(currentEvent, JSON.parse(payload)); }
                            catch (e) { /* ignore parse error */ }
                        }
                    }
                    buffer = '';
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    if (onError) onError('连接超时，请检查网络后重试');
                } else if (_isNetworkErr(error)) {
                    if (onError) onError('网络连接失败，请检查网络后重试');
                } else if (onError) {
                    onError(error.message || '网络错误');
                }
            } finally {
                clearTimeout(timeoutId);
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

        async download(url, params = {}) {
            const qs = new URLSearchParams(params).toString();
            const fullUrl = qs ? `${url}?${qs}` : url;
            const token = this._getToken();
            let response;
            try {
                response = await fetch(`${this.baseUrl}${fullUrl}`, { headers: { ...(token && { 'Authorization': `Bearer ${token}` }) } });
            } catch (err) {
                throw _isNetworkErr(err) ? new ApiError('网络连接失败，请检查网络后重试', null, null) : new ApiError(err.message || '下载失败', null, null);
            }
            if (!response.ok) {
                const errorMsg = `下载失败 (${response.status})`;
                if (this.onError) this.onError(response.status, errorMsg);
                throw new ApiError(errorMsg, response.status, null);
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
            if (this.onUnauthorized) this.onUnauthorized();
        }
    }

    window.NexusApi = NexusApi;
})();

/* ===== nexus-markdown.js ===== */
(function () {
    'use strict';

    const VERSION = '1.3.0';

    const FALLBACK_LIBS = {
        marked: 'https://registry.npmmirror.com/marked/9.1.6/files/lib/marked.umd.js',
        dompurify: 'https://songguokr.com/nexus-ui/v2.10.64/vendor/purify.min.js',
        highlight: 'https://songguokr.com/nexus-ui/v2.10.64/vendor/highlight.min.js',
        highlightCss: 'https://songguokr.com/nexus-ui/v2.10.64/vendor/styles/atom-one-dark.min.css',
        katex: 'https://registry.npmmirror.com/katex/0.18.5/files/dist/katex.min.js',
        katexCss: 'https://registry.npmmirror.com/katex/0.18.5/files/dist/katex.min.css'
    };

    const LIB_BASE = (function () {
        const scripts = document.scripts || [];
        for (let i = 0; i < scripts.length; i++) {
            const src = scripts[i].getAttribute('src') || '';
            const m = src.match(/^(.*)\/js\/nexus-(?:all|markdown)\.js(?:[?#].*)?$/);
            if (m) return m[1] + '/vendor/';
        }
        return '';
    })();

    const LIBS = LIB_BASE ? {
        marked: LIB_BASE + 'marked.umd.js',
        dompurify: LIB_BASE + 'purify.min.js',
        highlight: LIB_BASE + 'highlight.min.js',
        highlightCss: LIB_BASE + 'styles/atom-one-dark.min.css',
        katex: LIB_BASE + 'katex/katex.min.js',
        katexCss: LIB_BASE + 'katex/katex.min.css'
    } : FALLBACK_LIBS;

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

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function protectMath(text) {
        const mathBlocks = [];
        const codeBlocks = [];
        const noCode = String(text).replace(/(```[\s\S]*?```|`[^`\n]*`)/g, function (m) {
            codeBlocks.push(m);
            return '\u0003NXMDCODE' + (codeBlocks.length - 1) + '\u0004';
        });
        const noMath = noCode.replace(/\$\$\s*([\s\S]+?)\s*\$\$|\$([^\s$][^$\n]{0,98}[^\s$])\$/g, function (m) {
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
                    if (hasCJK && !looksMath) return escapeHtml(body);
                    return katex.renderToString(body, { displayMode: display, throwOnError: false, strict: false });
                } catch (e) {}
            }
            return escapeHtml(body);
        });
    }

    function render(text, options) {
        if (!text) return '';
        const opts = options || {};
        if (window.marked && window.DOMPurify) {
            try {
                const protected_ = protectMath(text);
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
        return escapeHtml(text).replace(/\n/g, '<br>');
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
        const fallback = () => { el.innerHTML = escapeHtml(text).replace(/\n/g, '<br>'); };
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
        escapeHtml,
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
            const timeoutId = setTimeout(() => this.controller.abort(), this.timeout);
            try {
                const response = await fetch(`${this.api.baseUrl}${this.url}`, {
                    method: 'POST',
                    headers: this.api._buildHeaders({ 'Accept': 'text/event-stream' }),
                    body: JSON.stringify(this.body),
                    signal: this.controller.signal
                });
                if (!response.ok) {
                    let errData;
                    try { errData = await response.json(); } catch (e) { errData = {}; }
                    this.onError(this.api._extractError(errData) || `请求失败 ${response.status}`);
                    return;
                }
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    let newlineIdx;
                    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
                        const line = buffer.slice(0, newlineIdx).replace(/\r$/, '');
                        buffer = buffer.slice(newlineIdx + 1);
                        if (line.startsWith('event:')) {
                            this._currentEvent = line.slice(6).trim();
                        } else if (line.startsWith('data:')) {
                            const payload = line.slice(5).trim();
                            if (!payload) continue;
                            try { this._handleData(JSON.parse(payload)); }
                            catch (e) {}
                        } else if (line === '') {
                            this._currentEvent = null;
                        }
                    }
                }
                this.onDone(this.receivedChunks);
            } catch (error) {
                if (error.name === 'AbortError') {
                    this.onDone(this.receivedChunks);
                } else {
                    this.onError(error.message || '网络错误');
                }
            } finally {
                clearTimeout(timeoutId);
                this.api.abortControllers.delete(requestId);
                this.controller = null;
                this._currentEvent = null;
            }
        }

        _handleData(data) {
            const event = this._currentEvent || this.eventKey;
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
                if (data[this.doneKey] === true || data.done === true || data.finished === true) {
                    this.controller && this.controller.abort();
                }
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

/* ===== nexus-store.js ===== */
(function() {
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
    function init() {
        var sidebar = document.querySelector('.sidebar, .nx-sidebar');
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

        var topbar = document.querySelector('.topbar, .nx-nav');
        if (topbar) {
            topbar.insertBefore(hamburger, topbar.firstChild);
        } else {
            sidebar.parentNode.insertBefore(hamburger, sidebar);
        }

        function toggleSidebar() {
            sidebar.classList.toggle('sidebar-open');
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
            hamburger.classList.toggle('open');
            overlay.style.display = overlay.classList.contains('active') ? 'block' : 'none';
        }

        hamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSidebar();
        });

        overlay.addEventListener('click', function() {
            toggleSidebar();
        });

        var navItems = sidebar.querySelectorAll('.nav-item, .nx-sidebar-item');
        navItems.forEach(function(item) {
            item.addEventListener('click', function() {
                if (window.innerWidth <= 768 && sidebar.classList.contains('sidebar-open')) {
                    toggleSidebar();
                }
            });
        });

        function checkMobile() {
            var isMobile = window.innerWidth <= 768;
            hamburger.style.display = isMobile ? 'inline-flex' : 'none';
            if (!isMobile) {
                sidebar.classList.remove('sidebar-open', 'open');
                overlay.classList.remove('active');
                overlay.style.display = 'none';
            }
        }

        checkMobile();
        window.addEventListener('resize', checkMobile);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
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

class UserCenterSDK {
    constructor(config) {
        this.baseUrl = (config.baseUrl || '').replace(/^https?:\/\//, '//').replace(/\/+$/, '');
        this.appKey = config.appKey;
        this.timeout = config.timeout || 30000;
        this._accessToken = null;
        this._refreshToken = null;
        this._tokenExpiresAt = null;
        this._onTokenUpdate = config.onTokenUpdate || null;
        this._onAuthError = config.onAuthError || null;
        this._loadPersistedTokens();
        if (!window.ucSDK && !config.silent) {
            window.ucSDK = this;
        }
    }

    static initFromConfig(config) {
        return new UserCenterSDK({ baseUrl: config.baseUrl, appKey: config.appKey });
    }

    _migrateLegacyTokens() {
        for (const [oldAccess, oldRefresh, oldExpires] of LEGACY_KEYS) {
            const access = localStorage.getItem(oldAccess);
            if (access && !this._accessToken) {
                this._accessToken = access;
                this._refreshToken = localStorage.getItem(oldRefresh);
                const exp = localStorage.getItem(oldExpires);
                this._tokenExpiresAt = exp ? parseInt(exp) : null;
                localStorage.removeItem(oldAccess);
                localStorage.removeItem(oldRefresh);
                localStorage.removeItem(oldExpires);
            }
        }
        if (this._accessToken) {
            this._persistTokens();
        }
    }

    _loadPersistedTokens() {
        try {
            this._accessToken = localStorage.getItem(TOKEN_KEY);
            this._refreshToken = localStorage.getItem(REFRESH_KEY);
            const expiresAt = localStorage.getItem(EXPIRES_KEY);
            this._tokenExpiresAt = expiresAt ? parseInt(expiresAt) : null;
            if (!this._accessToken) {
                this._migrateLegacyTokens();
            }
        } catch (e) {}
    }

    _persistTokens() {
        try {
            if (this._accessToken) {
                localStorage.setItem(TOKEN_KEY, this._accessToken);
            } else {
                localStorage.removeItem(TOKEN_KEY);
            }
            if (this._refreshToken) {
                localStorage.setItem(REFRESH_KEY, this._refreshToken);
            } else {
                localStorage.removeItem(REFRESH_KEY);
            }
            if (this._tokenExpiresAt) {
                localStorage.setItem(EXPIRES_KEY, String(this._tokenExpiresAt));
            } else {
                localStorage.removeItem(EXPIRES_KEY);
            }
        } catch (e) {}
    }

    _emitAuthChange() {
        try {
            window.dispatchEvent(new CustomEvent('uc:authchange', { detail: { authenticated: !!this._accessToken } }));
        } catch (e) {}
    }

    _setTokens(data) {
        this._accessToken = data.access_token;
        this._refreshToken = data.refresh_token || this._refreshToken;
        this._tokenExpiresAt = data.expires_in
            ? Date.now() + data.expires_in * 1000
            : null;
        this._persistTokens();
        this._emitAuthChange();
        if (this._onTokenUpdate) {
            this._onTokenUpdate({
                access_token: this._accessToken,
                refresh_token: this._refreshToken,
                expires_in: data.expires_in
            });
        }
    }

    setTokens(data) {
        this._setTokens(data);
    }

    syncFromStorage() {
        try {
            var t = localStorage.getItem(TOKEN_KEY);
            if (t && t !== this._accessToken) this._accessToken = t;
            var r = localStorage.getItem(REFRESH_KEY);
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
        this._persistTokens();
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
        if (data && (method === 'POST' || method === 'PUT')) {
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
                throw new Error(error.detail || `HTTP ${response.status}`);
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

    async login(username, password, inviteCode = null) {
        const data = { username, password, app_key: this.appKey };
        if (inviteCode) data.invite_code = inviteCode;
        const result = await this._request('POST', '/api/auth/login', data, false);
        if (result.success && result.data) { this._setTokens(result.data); }
        return result;
    }

    async loginWithEmail(email, password, inviteCode = null) {
        const data = { email, password, app_key: this.appKey };
        if (inviteCode) data.invite_code = inviteCode;
        const result = await this._request('POST', '/api/auth/login', data, false);
        if (result.success && result.data) { this._setTokens(result.data); }
        return result;
    }

    async loginWithPhone(phone, password, inviteCode = null) {
        const data = { phone, password, app_key: this.appKey };
        if (inviteCode) data.invite_code = inviteCode;
        const result = await this._request('POST', '/api/auth/login', data, false);
        if (result.success && result.data) { this._setTokens(result.data); }
        return result;
    }

    async register({ username, password, email = null, phone = null, inviteCode = null }) {
        const data = { password, app_key: this.appKey };
        if (username) data.username = username;
        if (email) data.email = email;
        if (phone) data.phone = phone;
        if (inviteCode) data.invite_code = inviteCode;
        const result = await this._request('POST', '/api/auth/register', data, false);
        if (result.success && result.data) { this._setTokens(result.data); }
        return result;
    }

    async refreshAccessToken() {
        if (!this._refreshToken) return false;
        try {
            const result = await this._request('POST', '/api/auth/refresh', {
                refresh_token: this._refreshToken
            }, false, true);
            if (result.success && result.data) {
                this._setTokens(result.data);
                return true;
            }
        } catch (e) {
            this.clearTokens();
        }
        return false;
    }

    async logout() {
        try {
            await this._request('POST', '/api/auth/logout', null, true, true);
        } catch (e) {}
        this.clearTokens();
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

    async thirdPartyLogin(provider, code, state = null, extra = null) {
        const data = { app_key: this.appKey, provider, code };
        if (state) data.state = state;
        if (extra) data.extra = extra;
        const result = await this._request('POST', '/api/auth/third-party', data, false);
        if (result.success && result.data) { this._setTokens(result.data); }
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
        if (existing && typeof existing.changePassword === 'function') return existing;
        const cfg = UserCenterSDK.resolveConfig();
        const sdk = new UserCenterSDK({ baseUrl: cfg.baseUrl, appKey: cfg.appKey, silent: true });
        window.ucSDK = sdk;
        return sdk;
    }
}

window.UserCenterSDK = UserCenterSDK;
})();

/* ===== user-center-api.js ===== */
(function() {
if (!window.UserCenterSDK) {
    console.error('UserCenterSDK not loaded. Load user-center-sdk.js before user-center-api.js');
    return;
}

const SDK = window.UserCenterSDK;
const P = SDK.prototype;

P.getUserPermissions = function() {
    return this._request('GET', '/api/users/permissions');
};

P.getUsers = function(skip = 0, limit = 100) {
    return this._request('GET', `/api/users?skip=${skip}&limit=${limit}`);
};

P.getUser = function(userId) {
    return this._request('GET', `/api/users/${userId}`);
};

P.updateUser = function(userId, updateData) {
    return this._request('PUT', `/api/users/${userId}`, updateData);
};

P.deleteUser = function(userId) {
    return this._request('DELETE', `/api/users/${userId}`);
};

P.getDashboardStats = function() {
    return this._request('GET', '/api/users/stats');
};

P.getApplications = function(skip = 0, limit = 100) {
    return this._request('GET', `/api/applications?skip=${skip}&limit=${limit}`);
};

P.getApplication = function(appId) {
    return this._request('GET', `/api/applications/${appId}`);
};

P.createApplication = function(appData) {
    return this._request('POST', '/api/applications', appData);
};

P.updateApplication = function(appId, appData) {
    return this._request('PUT', `/api/applications/${appId}`, appData);
};

P.deleteApplication = function(appId) {
    return this._request('DELETE', `/api/applications/${appId}`);
};

P.getRoles = function(skip = 0, limit = 100) {
    return this._request('GET', `/api/permissions/roles?skip=${skip}&limit=${limit}`);
};

P.createRole = function(name, description = null) {
    return this._request('POST', '/api/permissions/roles', { name, description });
};

P.getPermissions = function(skip = 0, limit = 100) {
    return this._request('GET', `/api/permissions?skip=${skip}&limit=${limit}`);
};

P.createPermission = function(name, code, description = null) {
    return this._request('POST', '/api/permissions', { name, code, description });
};

P.validateInviteCode = function(code, appKey = null) {
    return this._request('POST', '/api/invite-codes/validate', {
        code,
        app_key: appKey || this.appKey
    }, false);
};

P.useInviteCode = function(inviteCode) {
    return this._request('POST', '/api/invite-codes/use', { invite_code: inviteCode });
};

P.createInviteCodeBatch = function(appId, batchName, totalCount = 10, options = {}) {
    const data = { app_id: appId, batch_name: batchName, total_count: totalCount, ...options };
    return this._request('POST', '/api/invite-codes/batch', data);
};

P.getInviteCodeBatches = function(appId = null) {
    const path = appId ? `/api/invite-codes/batch?app_id=${appId}` : '/api/invite-codes/batch';
    return this._request('GET', path);
};

P.getDiscovery = function() {
    return this._request('GET', '/api/discovery');
};

P.getIntegrationGuide = function() {
    return this._request('GET', '/api/discovery/integration-guide');
};

P.getVipLevels = function() {
    return this._request('GET', `/api/vip/levels?app_key=${this.appKey}`);
};

P.upgradeVip = function(levelCode, durationDays = null) {
    const data = { level_code: levelCode };
    if (durationDays) data.duration_days = durationDays;
    return this._request('POST', '/api/vip/upgrade', data);
};

P.checkVipExpiry = function() {
    return this._request('GET', '/api/vip/check-expiry');
};

window.UserCenterAPI = { loaded: true };
})();

/* ===== nexus-structured.js ===== */
(function () {
    'use strict';

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

    window.NexusStructured = { build, format, isError };
})();

/* ===== components/nux-result-view.js ===== */
(function () {
    'use strict';

    if (!document.getElementById('nrv-css')) {
        const style = document.createElement('style');
        style.id = 'nrv-css';
        style.textContent = [
            '.nrv { margin-top: 4px; }',
            '.nrv-summary { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }',
            '.nrv-summary-item { font-size: 11px; padding: 2px 8px; background: var(--route-bg, #eef3fb); color: var(--primary-dark, #2c5aa8); border-radius: 6px; }',
            '.nrv-table-wrap { overflow-x: auto; max-height: 220px; overflow-y: auto; background: #fff; border-radius: 6px; }',
            '.nrv-table { width: 100%; border-collapse: collapse; font-size: 11px; }',
            '.nrv-table th, .nrv-table td { padding: 5px 8px; border: 1px solid var(--border, #e5e7eb); text-align: left; white-space: nowrap; max-width: 240px; overflow: hidden; text-overflow: ellipsis; }',
            '.nrv-table th { background: var(--route-bg, #eef3fb); color: var(--primary-dark, #2c5aa8); font-weight: 600; position: sticky; top: 0; }',
            '.nrv-table tr:nth-child(even) td { background: var(--bg, #f7f8fa); }',
            '.nrv-kv-item { display: flex; gap: 8px; padding: 3px 0; font-size: 11px; border-bottom: 1px dashed var(--border, #e5e7eb); }',
            '.nrv-kv-key { color: var(--text-muted, #8a93a6); flex: 0 0 96px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
            '.nrv-kv-val { color: var(--text, #29303f); word-break: break-word; }'
        ].join('\n');
        document.head.appendChild(style);
    }

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

    const UC_PREFIX = "uc_";

    function isUcFallback(value) {
        return typeof value === "string" && value.indexOf(UC_PREFIX) === 0;
    }

    function getDisplayName(user) {
        if (!user) return "";
        const candidates = ["nickname", "full_name", "display_name", "name"];
        for (let i = 0; i < candidates.length; i++) {
            const v = user[candidates[i]];
            if (v && String(v).trim() && !isUcFallback(v)) return String(v).trim();
        }
        const username = user.username;
        if (username && String(username).trim() && !isUcFallback(username)) return String(username).trim();
        return "";
    }

    function resolveName(user, fallback) {
        const name = getDisplayName(user);
        return name || fallback || "";
    }

    const NexusUser = { getDisplayName: getDisplayName, resolveName: resolveName, isUcFallback: isUcFallback };

    if (window.NexusUtils && typeof window.NexusUtils === "object") {
        window.NexusUtils.getDisplayName = getDisplayName;
    }

    window.NexusUser = NexusUser;
})();

/* ===== core/nexus-app.js ===== */
(function () {
    "use strict";

    function _status(err) {
        return err && (err.status !== undefined ? err.status : err.response && err.response.status) || null;
    }

    const _toastState = { last: 0 };
    let _authHandler = null;

    const NexusApp = {
        get authHandler() { return _authHandler; },
        setAuthHandler(fn) {
            if (typeof fn === "function") _authHandler = fn;
        },

        handleError(err, instance, info) {
            if (!err) return;
            if (err && err.name === "NexusStreamError") {
                this.handleErrorPayload(err.message, err.status || 401, err);
                return;
            }
            const status = _status(err);
            const message = (window.mapHttpError && typeof window.mapHttpError === "function")
                ? window.mapHttpError(err)
                : (err.message || "操作失败");
            this.handleErrorPayload(message, status, err);
        },

        handleErrorPayload(message, status, err) {
            if (status === 401) {
                if (NexusApp.clearStaleAuth) NexusApp.clearStaleAuth();
                if (_authHandler) { _authHandler(message); return; }
                NexusApp.notify("登录已过期，请重新登录", "error");
                return;
            }
            if (!message) return;
            const now = Date.now();
            if (now - _toastState.last < 1000) return;
            _toastState.last = now;
            NexusApp.notify(message, "error");
            if (typeof console !== "undefined" && console.error) console.error("[NexusApp]", err || message);
        },

        notify(message, type) {
            if (window.ElementPlus && ElementPlus.ElMessage) {
                try { ElementPlus.ElMessage({ message: message, type: type || "error", duration: 3000 }); return; } catch (e) {}
            }
            if (window.NexusUtils && typeof NexusUtils.showToast === "function") {
                NexusUtils.showToast(message, type || "error", { duration: 3000 });
                return;
            }
        },

        bindGlobal() {
            if (NexusApp._bound) return;
            NexusApp._bound = true;
            window.addEventListener("unhandledrejection", function (evt) {
                if (!evt || !evt.reason) return;
                if (evt.reason && evt.reason.__nxHandled) return;
                if (evt.reason && evt.reason.name === "AbortError") return;
                const status = _status(evt.reason);
                if (status === 401 || (evt.reason && evt.reason.name === "NexusStreamError")) {
                    NexusApp.handleError(evt.reason);
                    evt.reason.__nxHandled = true;
                }
            });
        },

        clearStaleAuth() {
            const keys = ["uc_access_token", "uc_refresh_token", "uc_token_expires_at", "uc_token", "access_token", "refresh_token", "user"];
            keys.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
        },

        registerCoreComponents(app) {
            if (!app || !app.component) return;
            const map = {
                "nux-ai-badge": window.NuxAiBadge,
                "nux-error-state": window.NuxErrorState,
                "nux-skeleton": window.NuxSkeleton,
                "nux-empty-state": window.NuxEmptyState
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
            if (app.config) app.config.errorHandler = NexusApp.handleError;
            NexusApp.bindGlobal();
            NexusApp.initAppLoading();
        },

        initAppLoading() {
            if (NexusApp._loadingInit) return;
            NexusApp._loadingInit = true;
            const overlay = document.getElementById("app-loading");
            if (!overlay) return;
            const hide = function () {
                if (!overlay || !overlay.parentNode || overlay.dataset.nxHidden) return;
                overlay.dataset.nxHidden = "1";
                overlay.classList.add("nx-app-loading-done");
                setTimeout(function () {
                    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                }, 320);
            };
            if (typeof MutationObserver === "function") {
                const el = document.getElementById("app");
                if (el && el.getAttribute("data-v-app") !== null) { hide(); return; }
                const root = el || document.body;
                const mo = new MutationObserver(function (mutations, obs) {
                    const cur = document.getElementById("app");
                    if (cur && cur.getAttribute("data-v-app") !== null) { obs.disconnect(); hide(); }
                });
                mo.observe(root, { attributes: true, subtree: true, childList: true });
                setTimeout(function () { mo.disconnect(); hide(); }, 6000);
            } else {
                setTimeout(hide, 6000);
            }
        }
    };

    window.NexusApp = NexusApp;

    if (typeof window !== "undefined") {
        NexusApp.bindGlobal();
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", function () { NexusApp.initAppLoading(); });
        } else {
            NexusApp.initAppLoading();
        }
    }
})();
