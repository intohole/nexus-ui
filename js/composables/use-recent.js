(function () {
    'use strict';

    var RECENT_KEY = 'nxs-app-switcher-recents';
    var FAV_KEY = 'nxs-app-switcher-favs';
    var MAX = 8;

    function readArr(key) {
        var raw = '';
        try { raw = localStorage.getItem(key) || ''; } catch (e) {}
        if (!raw) return [];
        try {
            var arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch (e) { return []; }
    }

    function writeArr(key, arr) {
        try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) {}
    }

    var NexusUseRecent = {
        recordVisit: function (name) {
            if (!name) return;
            var list = readArr(RECENT_KEY).filter(function (r) { return r.name !== name; });
            list.unshift({ name: name, at: Date.now() });
            writeArr(RECENT_KEY, list.slice(0, MAX));
        },
        recents: function (limit) {
            return readArr(RECENT_KEY).slice(0, limit || MAX).map(function (r) { return r.name; });
        },
        isRecent: function (name) {
            return readArr(RECENT_KEY).some(function (r) { return r.name === name; });
        },
        favs: function () {
            return readArr(FAV_KEY);
        },
        isFav: function (name) {
            if (!name) return false;
            return readArr(FAV_KEY).indexOf(name) >= 0;
        },
        toggleFav: function (name) {
            if (!name) return false;
            var list = readArr(FAV_KEY);
            var idx = list.indexOf(name);
            if (idx >= 0) {
                list.splice(idx, 1);
                writeArr(FAV_KEY, list);
                return false;
            }
            list.unshift(name);
            writeArr(FAV_KEY, list.slice(0, MAX));
            return true;
        },
        clear: function () {
            try { localStorage.removeItem(RECENT_KEY); } catch (e) {}
            try { localStorage.removeItem(FAV_KEY); } catch (e) {}
        },
        STORAGE_KEY: RECENT_KEY,
        FAV_STORAGE_KEY: FAV_KEY
    };

    window.NexusUseRecent = NexusUseRecent;
})();