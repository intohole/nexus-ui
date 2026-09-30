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
