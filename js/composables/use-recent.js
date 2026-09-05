(function () {
    'use strict';

    var RECENT_KEY = 'nxs-app-switcher-recents';
    var MAX = 8;

    function readArr() {
        var raw = '';
        try { raw = localStorage.getItem(RECENT_KEY) || ''; } catch (e) {}
        if (!raw) return [];
        try {
            var arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch (e) { return []; }
    }

    var NexusUseRecent = {
        recordVisit: function (name) {
            if (!name) return;
            var list = readArr().filter(function (r) { return r.name !== name; });
            list.unshift({ name: name, at: Date.now() });
            try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX))); } catch (e) {}
        },
        recents: function (limit) {
            return readArr().slice(0, limit || MAX).map(function (r) { return r.name; });
        },
        isRecent: function (name) {
            return readArr().some(function (r) { return r.name === name; });
        },
        clear: function () {
            try { localStorage.removeItem(RECENT_KEY); } catch (e) {}
        },
        STORAGE_KEY: RECENT_KEY
    };

    window.NexusUseRecent = NexusUseRecent;
})();