(function () {
    'use strict';

    var REMEMBER_KEY = 'nux_remembered_identifier';
    var GLOBAL_AGREED_KEY = 'nux_terms_agreed_v1';

    var eyeSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    var eyeSlashSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

    function markAgreement(props, agreedRef, appName) {
        if (!props.showTerms || !agreedRef.value || !appName) return;
        try {
            localStorage.setItem('nux_agreement_pending_' + appName, '1');
            localStorage.setItem(GLOBAL_AGREED_KEY, String(Date.now()));
        } catch (e) {}
    }

    function requireAgreed(props, agreedRef, setError) {
        if (props.showTerms && !agreedRef.value) {
            setError('请先同意用户协议和隐私政策');
            return false;
        }
        return true;
    }

    function applyTheme(themeColor) {
        if (themeColor) {
            document.documentElement.style.setProperty('--app-accent', themeColor);
        }
    }

    function restoreTheme(themeColor) {
        if (themeColor) {
            document.documentElement.style.removeProperty('--app-accent');
        }
    }

    function friendlyLoginError(e) {
        var msg = (e && e.message) || '';
        if (!msg) return '登录失败，请重试';
        if (/请求超时/.test(msg)) return msg;
        if (/network|failed to fetch|load failed|timed? ?out|超时|网络/i.test(msg)) return '网络异常，请检查网络后重试';
        return msg;
    }

    function captchaApiBase(props, sdkBase) {
        if (props.captchaBase) return props.captchaBase;
        if (sdkBase) return sdkBase;
        return '/uc-api';
    }

    async function loadCaptchaImage(props, st, sdkBase) {
        if (!props.captchaEnabled || st.captchaLoading.value) return;
        st.captchaLoading.value = true;
        try {
            var base = captchaApiBase(props, sdkBase);
            var resp = await fetch(base + '/api/auth/captcha/image', { cache: 'no-store', credentials: 'same-origin' });
            var cid = resp.headers.get('X-Captcha-Id');
            var blob = await resp.blob();
            if (st.captchaImg.value) URL.revokeObjectURL(st.captchaImg.value);
            st.captchaImg.value = URL.createObjectURL(blob);
            st.captchaId.value = cid || '';
            st.form.captchaCode = '';
        } catch (e) {
            st.captchaImg.value = '';
        } finally {
            st.captchaLoading.value = false;
        }
    }

    async function checkCaptchaRequired(props, st, sdkBase) {
        if (!props.captchaEnabled) return;
        try {
            var base = captchaApiBase(props, sdkBase);
            var resp = await fetch(base + '/api/auth/captcha/required', { cache: 'no-store', credentials: 'same-origin' });
            if (!resp.ok) return;
            var body = await resp.json();
            var data = body && body.data ? body.data : body;
            st.captchaRequired.value = !!(data && data.required);
            if (st.captchaRequired.value) await loadCaptchaImage(props, st, sdkBase);
        } catch (e) {}
    }

    function captchaPayload(st) {
        if (st.captchaRequired.value && st.captchaId.value && st.form.captchaCode) {
            return { captchaId: st.captchaId.value, captchaCode: st.form.captchaCode };
        }
        return null;
    }

    function openForgot(opts) {
        var compBase = opts.compBase;
        if (!compBase) return;
        opts.loading.value = true;
        var chain = Promise.resolve();
        if (!window.UserCenterSDK) {
            chain = chain.then(function() {
                return new Promise(function(resolve, reject) {
                    var s = document.createElement('script');
                    s.src = compBase + '/../user-center-sdk.js';
                    s.onload = resolve;
                    s.onerror = reject;
                    document.head.appendChild(s);
                });
            });
        }
        chain.then(function() {
            if (!opts.sdkRef.value) { opts.loading.value = false; return; }
            if (opts.comp.value) { opts.loading.value = false; opts.open.value = true; return; }
            const s = document.createElement('script');
            s.src = compBase + '/nux-forgot-password.js';
            s.onload = function() {
                opts.loading.value = false;
                opts.comp.value = window.NuxForgotPassword || null;
                if (opts.comp.value) opts.open.value = true;
            };
            s.onerror = function() { opts.loading.value = false; };
            document.head.appendChild(s);
        }).catch(function() { opts.loading.value = false; });
    }

    window.NuxLoginHelpers = {
        REMEMBER_KEY: REMEMBER_KEY,
        GLOBAL_AGREED_KEY: GLOBAL_AGREED_KEY,
        eyeSvg: eyeSvg,
        eyeSlashSvg: eyeSlashSvg,
        markAgreement: markAgreement,
        requireAgreed: requireAgreed,
        applyTheme: applyTheme,
        restoreTheme: restoreTheme,
        friendlyLoginError: friendlyLoginError,
        captchaApiBase: captchaApiBase,
        loadCaptchaImage: loadCaptchaImage,
        checkCaptchaRequired: checkCaptchaRequired,
        captchaPayload: captchaPayload,
        openForgot: openForgot
    };
})();
