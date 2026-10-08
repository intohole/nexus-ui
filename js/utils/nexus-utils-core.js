/* nexus-utils core —— nexus-utils.js 聚合入口的本体模块（由 build_all.py 拼接），直引入口或随 nexus-all 加载 */
(function() {
    const utils = window.NexusUtils = window.NexusUtils || {};
    Object.assign(utils, {
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
    });
})();
