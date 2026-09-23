(function() {
    const SCRIPT_BASE = (function() {
        const src = (document.currentScript && document.currentScript.src) || '';
        const idx = src.lastIndexOf('/');
        return idx > 0 ? src.slice(0, idx) : '';
    })();
    const H = window.NuxLoginHelpers || {};
    const NuxLoginPage = {
        name: 'NuxLoginPage',
        props: {
            appName: { type: String, default: '' },
            appIcon: { type: String, default: '' },
            appLogo: { type: String, default: '' },
            slogan: { type: String, default: '' },
            description: { type: String, default: '' },
            features: { type: Array, default: () => [] },
            stats: { type: Array, default: () => [] },
            themeColor: { type: String, default: '' },
            showRegister: { type: Boolean, default: true },
            showPhoneLogin: { type: Boolean, default: false },
            phoneLogin: { type: Boolean, default: false },
            showEmailField: { type: Boolean, default: false },
            requireEmail: { type: Boolean, default: false },
            showInviteCode: { type: Boolean, default: false },
            showSmsLogin: { type: Boolean, default: false },
            showRememberMe: { type: Boolean, default: false },
            showForgot: { type: Boolean, default: true },
            sdk: { type: Object, default: null },
            showTerms: { type: Boolean, default: true },
            termsText: { type: String, default: '我已阅读并同意《用户协议》和《隐私政策》' },
            termsUrl: { type: String, default: '' },
            privacyUrl: { type: String, default: '' },
            thirdPartyLogin: { type: Array, default: () => [] },
            authMode: { type: String, default: 'local' },
            minPasswordLength: { type: Number, default: 8 },
            loading: { type: Boolean, default: false },
            smsLoading: { type: Boolean, default: false },
            error: { type: String, default: '' },
            useCustomRegister: { type: Boolean, default: true },
            defaultMode: { type: String, default: 'login' },
            variant: { type: String, default: 'split' },
            ageGate: { type: Boolean, default: false },
            minorAge: { type: Number, default: 14 },
            captchaEnabled: { type: Boolean, default: true },
            captchaBase: { type: String, default: '' },
            autoLogin: { type: Boolean, default: false }
        },
        emits: ['login', 'register', 'registered', 'sms-login', 'send-sms', 'third-party-login', 'success'],
        setup(props, { emit }) {
            const mode = Vue.ref(props.defaultMode);
            const loginType = Vue.ref('account');
            const localError = Vue.ref('');
            const showPassword = Vue.ref(false);
            const showConfirmPassword = Vue.ref(false);
            const rememberMe = Vue.ref(false);
            const agreed = Vue.ref(true);
            const age = Vue.ref(10);
            const guardianAgreed = Vue.ref(false);

            function markAgreement() {
                H.markAgreement(props, agreed, props.appName);
            }
            const smsCode = Vue.ref('');
            const smsCountdown = Vue.ref(0);
            let smsTimer = null;
            const registering = Vue.ref(false);
            const form = Vue.reactive({
                username: '',
                password: '',
                confirmPassword: '',
                email: '',
                phone: '',
                inviteCode: '',
                captchaCode: ''
            });
            const captchaRequired = Vue.ref(false);
            const captchaId = Vue.ref('');
            const captchaImg = Vue.ref('');
            const captchaLoading = Vue.ref(false);
            const forgotOpen = Vue.ref(false);
            const forgotLoading = Vue.ref(false);
            const forgotComp = Vue.shallowRef(window.NuxForgotPassword || null);
            const combinedError = Vue.computed(() => props.error || localError.value);
            const isSmsMode = Vue.computed(() => props.showSmsLogin && loginType.value === 'sms');
            const regSms = Vue.computed(() => mode.value === 'register' && props.showSmsLogin);
            const effectiveSdk = Vue.computed(function() {
                if (props.sdk) return props.sdk;
                var g = window.ucSDK || window.__UC_SDK__ || window.ucSdk || null;
                if (g && typeof g.forgotPassword === 'function') return g;
                if (window.UserCenterSDK && typeof window.UserCenterSDK.ensureGlobalSdk === 'function') {
                    return window.UserCenterSDK.ensureGlobalSdk();
                }
                return null;
            });
            const compBase = SCRIPT_BASE;
            const docBase = compBase.replace(/\/js\/components$/, '');
            const defaultAgreementUrl = docBase + '/agreement.html';
            const defaultPrivacyUrl = docBase + '/privacy.html';
            const captchaState = { captchaRequired, captchaId, captchaImg, captchaLoading, form };
            const sdkBase = () => effectiveSdk.value && effectiveSdk.value.baseUrl;

            function captchaApiBase() {
                return H.captchaApiBase(props, sdkBase());
            }

            function loadCaptchaImage() {
                return H.loadCaptchaImage(props, captchaState, sdkBase());
            }

            function checkCaptchaRequired() {
                return H.checkCaptchaRequired(props, captchaState, sdkBase());
            }

            function captchaPayload() {
                return H.captchaPayload(captchaState);
            }
            const effectiveTermsUrl = Vue.computed(function() { return props.termsUrl || defaultAgreementUrl; });
            const effectivePrivacyUrl = Vue.computed(function() { return props.privacyUrl || defaultPrivacyUrl; });
            const eyeSvg = H.eyeSvg || '';
            const eyeSlashSvg = H.eyeSlashSvg || '';

            function applyTheme() {
                H.applyTheme(props.themeColor);
            }

            function restoreTheme() {
                H.restoreTheme(props.themeColor);
            }

            Vue.onMounted(function() {
                applyTheme();
                try {
                    var saved = localStorage.getItem(H.REMEMBER_KEY);
                    if (saved && !form.username && !props.phoneLogin) form.username = saved;
                    if (props.showTerms && localStorage.getItem(H.GLOBAL_AGREED_KEY)) {
                        agreed.value = true;
                    }
                } catch (e) {}
                checkCaptchaRequired();
            });
            Vue.onUnmounted(function() {
                restoreTheme();
                if (smsTimer) clearInterval(smsTimer);
            });

            function requireAgreed() {
                return H.requireAgreed(props, agreed, function(m) { localError.value = m; });
            }

            function onLogin() {
                localError.value = '';
                if (isSmsMode.value) {
                    if (!/^1[3-9]\d{9}$/.test(form.phone)) {
                        localError.value = '请输入正确的手机号';
                        return;
                    }
                    if (!smsCode.value) {
                        localError.value = '请输入验证码';
                        return;
                    }
                    if (!requireAgreed()) return;
                    markAgreement();
                    emit('sms-login', { phone: form.phone, code: smsCode.value });
                    return;
                }
                if (props.phoneLogin) {
                    if (!/^1[3-9]\d{9}$/.test(form.phone)) {
                        localError.value = '请输入正确的手机号';
                        return;
                    }
                    if (!form.password) {
                        localError.value = '请输入密码';
                        return;
                    }
                    if (!requireAgreed()) return;
                    markAgreement();
                    emit('login', { username: form.phone, phone: form.phone, password: form.password, rememberMe: rememberMe.value });
                    return;
                }
                if (!form.username && !form.email) {
                    localError.value = '请输入用户名或邮箱';
                    return;
                }
                if (!form.password) {
                    localError.value = '请输入密码';
                    return;
                }
                if (!requireAgreed()) return;
                try {
                    var ident = props.phoneLogin ? (form.phone || '').trim() : (form.username || '').trim();
                    if (ident && (rememberMe.value || !props.showRememberMe)) localStorage.setItem(H.REMEMBER_KEY, ident);
                    else localStorage.removeItem(H.REMEMBER_KEY);
                } catch (e) {}
                markAgreement();
                var captcha = captchaPayload();
                var loginPayload = captcha ? { username: form.username || '', email: form.email || '', password: form.password, rememberMe: rememberMe.value, captchaId: captcha.captchaId, captchaCode: captcha.captchaCode } : { username: form.username || '', email: form.email || '', password: form.password, rememberMe: rememberMe.value };
                if (props.autoLogin) { doLogin(loginPayload); return; }
                emit('login', loginPayload);
            }

            var loginBusy = Vue.ref(false);

            function friendlyLoginError(e) {
                return H.friendlyLoginError(e);
            }

            async function doLogin(payload) {
                var sdk = effectiveSdk.value;
                if (!sdk || typeof sdk.login !== 'function') { localError.value = '登录服务不可用'; return; }
                if (loginBusy.value) return;
                loginBusy.value = true;
                localError.value = '';
                try {
                    var identifier = payload.email || payload.username;
                    var captcha = payload.captchaId ? { captchaId: payload.captchaId, captchaCode: payload.captchaCode } : null;
                    var res = await sdk.login(identifier, payload.password, null, captcha, payload.rememberMe !== false);
                    if (res && res.success) {
                        emit('success', res);
                    } else {
                        localError.value = (res && res.message) || '登录失败，请重试';
                        checkCaptchaRequired();
                    }
                } catch (e) {
                    localError.value = friendlyLoginError(e);
                    checkCaptchaRequired();
                } finally {
                    loginBusy.value = false;
                }
            }

            function sendSms() {
                localError.value = '';
                if (!/^1[3-9]\d{9}$/.test(form.phone)) {
                    localError.value = '请输入正确的手机号';
                    return;
                }
                if (smsCountdown.value > 0) return;
                emit('send-sms', { phone: form.phone, mode: mode.value === 'login' ? 'login' : 'register' });
            }

            Vue.watch(function() { return props.smsLoading; }, function(v) {
                if (v) {
                    smsCountdown.value = 60;
                    if (smsTimer) clearInterval(smsTimer);
                    smsTimer = setInterval(function() {
                        smsCountdown.value -= 1;
                        if (smsCountdown.value <= 0) clearInterval(smsTimer);
                    }, 1000);
                }
            });

            Vue.watch(combinedError, function(v) {
                if (v) {
                    checkCaptchaRequired();
                }
            });

            Vue.watch(function() {
                return [form.username, form.password, form.email, form.phone, smsCode.value, form.captchaCode].join('|');
            }, function() {
                localError.value = '';
            });

            function onRegister() {
                localError.value = '';
                if (!form.username && !form.email && !form.phone) {
                    localError.value = '请填写用户名、邮箱或手机号';
                    return;
                }
                if (props.requireEmail && !form.email) {
                    localError.value = '请填写邮箱';
                    return;
                }
                if (isSmsMode.value || regSms.value) {
                    if (!/^1[3-9]\d{9}$/.test(form.phone)) {
                        localError.value = '请输入正确的手机号';
                        return;
                    }
                    if (!smsCode.value) {
                        localError.value = '请输入验证码';
                        return;
                    }
                }
                if (form.password.length < props.minPasswordLength) {
                    localError.value = '密码至少' + props.minPasswordLength + '位';
                    return;
                }
                if (!/[a-zA-Z]/.test(form.password) || !/\d/.test(form.password)) {
                    localError.value = '密码需同时包含字母和数字';
                    return;
                }
                if (form.password !== form.confirmPassword) {
                    localError.value = '两次密码不一致';
                    return;
                }
                if (props.ageGate && props.minorAge && age.value < props.minorAge && !guardianAgreed.value) {
                    localError.value = '未满' + props.minorAge + '周岁使用需获得监护人授权';
                    return;
                }
                if (props.showTerms && !agreed.value) {
                    localError.value = '请先同意用户协议和隐私政策';
                    return;
                }
                markAgreement();
                var captcha = captchaPayload();
                var payload = {
                    username: form.username || null,
                    password: form.password,
                    email: form.email || null,
                    phone: form.phone || null,
                    inviteCode: form.inviteCode || null,
                    code: smsCode.value || null,
                    captchaId: captcha ? captcha.captchaId : null,
                    captchaCode: captcha ? captcha.captchaCode : null
                };
                if (props.useCustomRegister) {
                    emit('register', payload);
                    return;
                }
                doRegister(payload);
            }

            async function doRegister(payload) {
                var sdk = effectiveSdk.value;
                if (!sdk || typeof sdk.register !== 'function') { localError.value = '注册服务不可用'; return; }
                registering.value = true;
                localError.value = '';
                try {
                    var captcha = captchaPayload();
                    var res = await sdk.register({
                        username: payload.username, password: payload.password,
                        email: payload.email, phone: payload.phone, inviteCode: payload.inviteCode,
                        captcha: captcha
                    });
                    if (!res || !res.success) { localError.value = (res && res.message) || '注册失败，请重试'; return; }
                    emit('registered', res);
                } catch (e) {
                    localError.value = (e && e.message) ? e.message : '注册失败，请重试';
                } finally {
                    registering.value = false;
                }
            }

            function switchMode(m) {
                localError.value = '';
                mode.value = m;
                loginType.value = 'account';
                form.confirmPassword = '';
                form.password = '';
                form.email = '';
                form.phone = '';
                form.smsCode = '';
                smsCode.value = '';
            }

            function switchLoginType(t) {
                localError.value = '';
                loginType.value = t;
            }

            function onThirdParty(key) {
                emit('third-party-login', { key: key });
            }

            function onForgot() {
                localError.value = '';
                H.openForgot({
                    compBase: compBase,
                    sdkRef: effectiveSdk,
                    loading: forgotLoading,
                    comp: forgotComp,
                    open: forgotOpen
                });
            }

            return {
                mode, loginType, form, smsCode, smsCountdown, agreed, age, guardianAgreed, rememberMe,
                showPassword, showConfirmPassword, combinedError, isSmsMode, regSms, effectiveSdk,
                effectiveTermsUrl, effectivePrivacyUrl,
                forgotOpen, forgotLoading, forgotComp,
                onLogin, onRegister, doRegister, sendSms, switchMode, switchLoginType, onThirdParty, onForgot, registering,
                loginBusy,
                captchaRequired, captchaImg, captchaLoading, loadCaptchaImage,
                eyeSvg, eyeSlashSvg
            };
        },
        template: window.NuxLoginPageTemplate
    };
    window.NuxLoginPage = NuxLoginPage;
})();
