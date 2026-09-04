(function () {
    'use strict';

    const UC_PREFIX = 'uc_';
    const AUTO_PREFIX = 'user_';

    function isUcFallback(value) {
        if (typeof value !== 'string') return false;
        return value.indexOf(UC_PREFIX) === 0 || value.indexOf(AUTO_PREFIX) === 0;
    }

    function getDisplayName(user) {
        if (!user) return '';
        const candidates = ['nickname', 'full_name', 'display_name', 'name'];
        for (let i = 0; i < candidates.length; i++) {
            const v = user[candidates[i]];
            if (v && String(v).trim() && !isUcFallback(v)) return String(v).trim();
        }
        const username = user.username;
        if (username && String(username).trim() && !isUcFallback(username)) return String(username).trim();
        return '';
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