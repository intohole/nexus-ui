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
        const host = ensureHost('nux-toast-host', 'nux-toast-container');
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
            '<button class="nx-btn nx-btn-ghost" type="button" data-role="cancel"></button>' +
            '<button class="nx-btn nx-btn-primary" type="button" data-role="confirm"></button>' +
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
        const resolve = node.resolve;
        confirmNode = null;
        node.resolve = null;
        leave(node.overlay);
        if (resolve) resolve(value);
        const next = confirmQueue.shift();
        if (next) showConfirm(next);
    }

    function showConfirm(item) {
        const node = buildConfirm();
        node.title.textContent = item.title;
        node.title.style.display = item.title ? '' : 'none';
        node.message.textContent = item.message;
        node.confirmBtn.textContent = item.confirmText;
        node.cancelBtn.textContent = item.cancelText;
        node.resolve = item.resolve;
        document.body.appendChild(node.overlay);
        confirmNode = node;
        enter(node.overlay);
        node.confirmBtn.focus();
    }

    function confirm(message, title, options) {
        const opts = options || {};
        return new Promise(function (resolve) {
            const item = {
                message: message,
                title: title || '确认操作',
                confirmText: opts.confirmText || '确定',
                cancelText: opts.cancelText || '取消',
                resolve: resolve
            };
            if (confirmNode) confirmQueue.push(item);
            else showConfirm(item);
        });
    }

    window.showToast = showToast;
    window.showUnlock = showUnlock;
    window.nuxConfirm = confirm;
})();
