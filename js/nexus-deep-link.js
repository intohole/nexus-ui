(function() {
    'use strict';

    /* NexusDeepLink —— 深链承接原语（v2.86.0）
     * 收编全工作区 10 仓手写的 URLSearchParams+replaceState 四段式：
     *   take(keys)     一次性取走深链参数并清理地址栏（消费即清参，防刷新重放）
     *   stash/popReturn 登录回跳 canonical（登录前存、成功后回跳）
     * 值统一为原始字符串，数字/布尔语义由消费方转换。
     */

    var RETURN_KEY = 'nxdl:return';

    function keyList(keys) {
        return Array.isArray(keys) ? keys : [keys];
    }

    function readValues(keys) {
        var search = new URLSearchParams(location.search);
        var values = {};
        keyList(keys).forEach(function(k) {
            if (search.has(k)) values[k] = search.get(k);
        });
        return values;
    }

    function cleanKeys(keys) {
        var search = new URLSearchParams(location.search);
        keyList(keys).forEach(function(k) { search.delete(k); });
        var qs = search.toString();
        history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
    }

    function take(keys, opts) {
        var o = opts || {};
        var values = readValues(keys);
        var hasAny = Object.keys(values).length > 0;
        if (hasAny && o.clean !== false) cleanKeys(keys);
        return { values: values, hasAny: hasAny };
    }

    function get(key) {
        return new URLSearchParams(location.search).get(key);
    }

    /* 只存相对路径（pathname+search+hash），从源头排除外链注入；回跳时再做双保险校验 */
    function stash() {
        try {
            sessionStorage.setItem(RETURN_KEY, location.pathname + location.search + location.hash);
        } catch (e) { /* 隐私模式等场景静默降级 */ }
    }

    function isSafePath(target) {
        return typeof target === 'string' && target.charAt(0) === '/' && target.charAt(1) !== '/';
    }

    function popReturn(opts) {
        var o = opts || {};
        var target = '';
        try {
            target = sessionStorage.getItem(RETURN_KEY) || '';
            sessionStorage.removeItem(RETURN_KEY);
        } catch (e) { /* ignore */ }
        if (!isSafePath(target)) return '';
        if (o.go) location.replace(target);
        return target;
    }

    window.NexusDeepLink = {
        take: take,
        get: get,
        stash: stash,
        popReturn: popReturn,
        isSafePath: isSafePath,
        RETURN_KEY: RETURN_KEY
    };
})();
