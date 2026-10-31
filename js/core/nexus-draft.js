(function () {
    'use strict';

    const PREFIX = 'nxd:';
    const DEBOUNCE_MS = 500;
    const MAX_VALUE_CHARS = 131072;
    const BANNER_STYLES = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:9990',
        'display:flex', 'align-items:center', 'gap:10px', 'flex-wrap:wrap',
        'padding:10px 16px', 'font-size:14px',
        'background:var(--nx-bg-elev, #1d2433)', 'color:var(--nx-text-1, #e8ecf3)',
        'border-bottom:1px solid rgba(255,180,84,0.45)',
        'box-shadow:0 4px 14px rgba(0,0,0,0.25)',
        'font-family:inherit', 'line-height:1.5'
    ];
    const BTN_STYLES = [
        'border:none', 'border-radius:8px', 'padding:5px 14px', 'font-size:13px',
        'cursor:pointer', 'font-family:inherit'
    ];

    const _tracked = new Map();
    let _banner = null;

    function storage() {
        try { return window.sessionStorage; } catch (e) { return null; }
    }

    function fullKey(key) { return PREFIX + key; }

    function elKey(el, opts) {
        if (opts && opts.key) return opts.key;
        const declared = el.getAttribute && el.getAttribute('data-nx-draft');
        if (declared) return declared;
        const name = el.getAttribute && (el.getAttribute('name') || el.getAttribute('id') || '');
        return window.location.pathname + '#' + (name || el.__nxDraftSeq);
    }

    function readStore(key) {
        const s = storage();
        if (!s) return null;
        try {
            const raw = s.getItem(fullKey(key));
            if (!raw) return null;
            const obj = JSON.parse(raw);
            if (!obj || typeof obj.v !== 'string') return null;
            return obj;
        } catch (e) { return null; }
    }

    function writeStore(key, value) {
        const s = storage();
        if (!s) return false;
        try {
            if (value === null || value === '') {
                s.removeItem(fullKey(key));
                return true;
            }
            if (value.length > MAX_VALUE_CHARS) return false;
            s.setItem(fullKey(key), JSON.stringify({ v: value, t: Date.now() }));
            return true;
        } catch (e) { return false; }
    }

    function ensureBanner() {
        if (_banner && _banner.parentNode) return _banner;
        if (!document.body) return null;
        const box = document.createElement('div');
        box.setAttribute('role', 'status');
        box.setAttribute('aria-live', 'polite');
        box.style.cssText = BANNER_STYLES.join(';');
        _banner = box;
        return box;
    }

    function showBanner(entry, draftValue) {
        const box = ensureBanner();
        if (!box) return;
        box.innerHTML = '';
        const label = document.createElement('span');
        label.textContent = '找到你上次未保存的输入';
        label.style.cssText = 'flex:1;min-width:120px';
        const restore = document.createElement('button');
        restore.textContent = '恢复';
        restore.style.cssText = BTN_STYLES.join(';') + ';background:#2f9e77;color:#fff';
        const discard = document.createElement('button');
        discard.textContent = '不用了';
        discard.style.cssText = BTN_STYLES.join(';') + ';background:transparent;color:inherit;border:1px solid rgba(255,255,255,0.28)';
        restore.addEventListener('click', function () {
            try {
                entry.el.value = draftValue;
                entry.el.dispatchEvent(new Event('input', { bubbles: true }));
                writeStore(entry.key, draftValue);
            } catch (e) {}
            hideBanner();
            if (entry.el.focus) { try { entry.el.focus(); } catch (e) {} }
        });
        discard.addEventListener('click', function () {
            writeStore(entry.key, null);
            hideBanner();
        });
        box.appendChild(label);
        box.appendChild(restore);
        box.appendChild(discard);
        if (!box.parentNode) document.body.appendChild(box);
        box.style.display = 'flex';
    }

    function hideBanner() {
        if (_banner && _banner.parentNode) {
            _banner.parentNode.removeChild(_banner);
        }
        _banner = null;
    }

    let _seq = 0;

    function attach(el, opts) {
        if (!el || (el.tagName !== 'TEXTAREA' && el.getAttribute && el.getAttribute('contenteditable') !== 'true' && el.tagName !== 'INPUT')) return null;
        const options = opts || {};
        if (!el.__nxDraftSeq) el.__nxDraftSeq = 'el' + (++_seq);
        const key = elKey(el, options);
        const entry = { el: el, key: key, timer: null, hadDraftShown: options.silentRestore ? true : false };
        _tracked.set(el, entry);

        const persist = function () {
            entry.timer = null;
            const v = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? String(el.value || '') : String(el.textContent || '');
            writeStore(key, v);
        };
        const onInput = function () {
            entry.cleanUntilInput = false;
            if (entry.timer) clearTimeout(entry.timer);
            entry.timer = setTimeout(persist, DEBOUNCE_MS);
        };
        el.addEventListener('input', onInput);
        entry._onInput = onInput;

        const existing = readStore(key);
        const current = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? String(el.value || '') : String(el.textContent || '');
        if (existing && existing.v && existing.v !== current && current === '') {
            if (!entry.hadDraftShown) {
                entry.hadDraftShown = true;
                entry._pendingDraft = existing.v;
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', function () { showBanner(entry, entry._pendingDraft); }, { once: true });
                } else {
                    showBanner(entry, existing.v);
                }
            }
        } else if (existing && (existing.v === current)) {
            writeStore(key, null);
        }
        return entry;
    }

    function detach(el) {
        const entry = _tracked.get(el);
        if (!entry) return;
        if (entry.timer) clearTimeout(entry.timer);
        if (entry._onInput) el.removeEventListener('input', entry._onInput);
        _tracked.delete(el);
    }

    function isDirty() {
        let dirty = false;
        _tracked.forEach(function (entry) {
            if (entry.cleanUntilInput) return;
            const el = entry.el;
            const v = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? String(el.value || '') : String(el.textContent || '');
            if (v) dirty = true;
        });
        return dirty;
    }

    const NexusDraft = {
        get version() { return '1.0.0'; },

        attach: attach,
        detach: detach,

        scan(root) {
            const scope = root || document;
            const list = scope.querySelectorAll ? scope.querySelectorAll('[data-nx-draft]') : [];
            const attached = [];
            list.forEach(function (el) {
                const e = attach(el);
                if (e) attached.push(e);
            });
            return attached;
        },

        clear(el) {
            const entry = el ? _tracked.get(el) : null;
            if (!entry) return;
            entry.cleanUntilInput = true;
            writeStore(entry.key, null);
        },

        clearByKey(key) { writeStore(key, null); },

        get(el) {
            const entry = el ? _tracked.get(el) : null;
            if (!entry) return null;
            const obj = readStore(entry.key);
            return obj ? obj.v : null;
        },

        isDirty: isDirty,

        _bindUnloadGuard() {
            if (this.__unloadBound) return;
            this.__unloadBound = true;
            window.addEventListener('beforeunload', function (evt) {
                if (!isDirty()) return;
                evt.preventDefault();
                evt.returnValue = '';
            });
        }
    };

    window.NexusDraft = NexusDraft;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            NexusDraft.scan(document);
            NexusDraft._bindUnloadGuard();
        }, { once: true });
    } else {
        NexusDraft.scan(document);
        NexusDraft._bindUnloadGuard();
    }
})();
