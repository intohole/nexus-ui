(function () {
    'use strict';

    var VITALS_VERSION = '1.0.0';
    var DEFAULT_ENDPOINT = 'https://songguokr.com/api/portal/vitals';
    var MAX_BUFFER = 16;
    var MAX_VALUE_MS = 60000;
    var MAX_VALUE_SCORE = 10;
    var METRIC_NAMES = { INP: 'ms', LCP: 'ms', CLS: 'score', TTFB: 'ms' };

    var state = {
        started: false,
        app: '',
        endpoint: DEFAULT_ENDPOINT,
        sampleRate: 1,
        sampledOut: false,
        sessionId: '',
        buffer: [],
        sent: 0,
        dropped: 0,
        observers: [],
        inp: 0,
        lcp: 0,
        cls: 0,
        flushed: { INP: false, LCP: false, CLS: false }
    };

    function supported() {
        return typeof PerformanceObserver === 'function';
    }

    function genSessionId() {
        var s = '';
        var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        for (var i = 0; i < 16; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
        return s;
    }

    function makeBody() {
        return {
            app: state.app,
            session_id: state.sessionId,
            metrics: state.buffer.slice()
        };
    }

    function send(body) {
        var payload = '';
        try { payload = JSON.stringify(body); } catch (e) { return; }
        try {
            if (navigator.sendBeacon) {
                var blob = new Blob([payload], { type: 'application/json' });
                if (navigator.sendBeacon(state.endpoint, blob)) return;
            }
        } catch (e) { }
        try {
            fetch(state.endpoint, {
                method: 'POST',
                keepalive: true,
                headers: { 'Content-Type': 'application/json' },
                body: payload
            }).catch(function () { });
        } catch (e) { }
    }

    function flush() {
        if (!state.buffer.length) return 0;
        var body = makeBody();
        state.buffer = [];
        state.sent += body.metrics.length;
        send(body);
        var api = window.NexusVitals;
        if (api) api.lastBody = body;
        return body.metrics.length;
    }

    function push(name, value) {
        if (!state.started || state.sampledOut) return;
        if (!METRIC_NAMES[name]) return;
        var num = Number(value);
        if (!isFinite(num) || num < 0) { state.dropped++; return; }
        var ceiling = METRIC_NAMES[name] === 'score' ? MAX_VALUE_SCORE : MAX_VALUE_MS;
        if (num > ceiling) { state.dropped++; return; }
        state.buffer.push({ name: name, value: Math.round(num * 10) / 10 });
        if (state.buffer.length >= MAX_BUFFER) flush();
    }

    function stopObservers() {
        for (var i = 0; i < state.observers.length; i++) {
            try { state.observers[i].disconnect(); } catch (e) { }
        }
        state.observers = [];
    }

    function observe(entryType, handler, opts) {
        try {
            var po = new PerformanceObserver(function (list) {
                var entries = list.getEntries();
                for (var i = 0; i < entries.length; i++) handler(entries[i]);
            });
            po.observe(opts || { type: entryType, buffered: true });
            state.observers.push(po);
            return true;
        } catch (e) {
            return false;
        }
    }

    function collectTTFB() {
        try {
            var nav = performance.getEntriesByType('navigation');
            if (nav && nav.length && nav[0].responseStart > 0) {
                push('TTFB', nav[0].responseStart);
            }
        } catch (e) { }
    }

    function onHidden() {
        if (state.inp > 0 && !state.flushed.INP) { push('INP', state.inp); state.flushed.INP = true; }
        if (state.lcp > 0 && !state.flushed.LCP) { push('LCP', state.lcp); state.flushed.LCP = true; }
        if (state.cls > 0 && !state.flushed.CLS) { push('CLS', state.cls); state.flushed.CLS = true; }
        flush();
    }

    function bindLifecycle() {
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') onHidden();
        });
        window.addEventListener('pagehide', onHidden);
    }

    function startCollectors() {
        observe('event', function (entry) {
            if (entry.interactionId > 0 && entry.duration > state.inp) state.inp = entry.duration;
        }, { type: 'event', buffered: true, durationThreshold: 40 });

        observe('largest-contentful-paint', function (entry) {
            if (entry.startTime > state.lcp) state.lcp = entry.startTime;
        });

        observe('layout-shift', function (entry) {
            if (!entry.hadRecentInput) state.cls += entry.value;
        });

        collectTTFB();
    }

    function init(opts) {
        var o = opts || {};
        if (!o.app || typeof o.app !== 'string') return 'no-app';
        if (!supported()) return 'unsupported';
        stopObservers();
        state.app = o.app.slice(0, 40);
        state.endpoint = o.endpoint || DEFAULT_ENDPOINT;
        state.sampleRate = Math.min(Math.max(Number(o.sampleRate == null ? 1 : o.sampleRate), 0), 1);
        state.sampledOut = Math.random() >= state.sampleRate && state.sampleRate < 1;
        state.sessionId = state.sessionId || genSessionId();
        state.buffer = [];
        state.inp = 0; state.lcp = 0; state.cls = 0;
        state.flushed = { INP: false, LCP: false, CLS: false };
        state.started = true;
        if (!state.lifecycleBound) {
            state.lifecycleBound = true;
            bindLifecycle();
        }
        startCollectors();
        return 'ok';
    }

    function stats() {
        return { buffered: state.buffer.length, sent: state.sent, dropped: state.dropped };
    }

    window.NexusVitals = {
        version: VITALS_VERSION,
        lastBody: null,
        supported: supported,
        init: init,
        flush: flush,
        stats: stats,
        _push: push
    };
})();
