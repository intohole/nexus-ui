(function() {
    const REMEMBER_KEY = 'nux_remembered_identifier';
    const NuxLoginPage = {
        name: 'NuxLoginPage',
        props: {
            appName: { type: String, default: '' },
            appIcon: { type: String, default: '' },
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
            variant: { type: String, default: 'split' }
        },
        emits: ['login', 'register', 'registered', 'sms-login', 'send-sms', 'third-party-login'],
        setup(props, { emit }) {
            const mode = Vue.ref(props.defaultMode);
            const loginType = Vue.ref('account');
            const localError = Vue.ref('');
            const showPassword = Vue.ref(false);
            const showConfirmPassword = Vue.ref(false);
            const rememberMe = Vue.ref(false);
            const agreed = Vue.ref(false);

            function markAgreement() {
                if (!props.showTerms || !agreed.value || !props.appName) return;
                try { localStorage.setItem('nux_agreement_pending_' + props.appName, '1'); } catch (e) {}
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
                inviteCode: ''
            });
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
            const compBase = (function() {
                const src = (document.currentScript && document.currentScript.src) || '';
                const idx = src.lastIndexOf('/');
                return idx > 0 ? src.slice(0, idx) : '';
            })();
            const defaultAgreementUrl = compBase.replace(/\/js\/components$/, '') + '/agreement.html';
            const effectiveTermsUrl = Vue.computed(function() { return props.termsUrl || defaultAgreementUrl; });
            const effectivePrivacyUrl = Vue.computed(function() { return props.privacyUrl || defaultAgreementUrl; });
            const eyeSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
            const eyeSlashSvg = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

            function applyTheme() {
                if (props.themeColor) {
                    document.documentElement.style.setProperty('--app-accent', props.themeColor);
                }
            }

            function restoreTheme() {
                if (props.themeColor) {
                    document.documentElement.style.removeProperty('--app-accent');
                }
            }

            Vue.onMounted(function() {
                applyTheme();
                try {
                    var saved = localStorage.getItem(REMEMBER_KEY);
                    if (saved && !form.username && !props.phoneLogin) form.username = saved;
                } catch (e) {}
            });
            Vue.onUnmounted(function() {
                restoreTheme();
                if (smsTimer) clearInterval(smsTimer);
            });

            function requireAgreed() {
                if (props.showTerms && !agreed.value) {
                    localError.value = '请先同意用户协议和隐私政策';
                    return false;
                }
                return true;
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
                    if (ident && (rememberMe.value || !props.showRememberMe)) localStorage.setItem(REMEMBER_KEY, ident);
                    else localStorage.removeItem(REMEMBER_KEY);
                } catch (e) {}
                markAgreement();
                emit('login', { username: form.username || '', password: form.password, rememberMe: rememberMe.value });
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
                if (form.password !== form.confirmPassword) {
                    localError.value = '两次密码不一致';
                    return;
                }
                if (props.showTerms && !agreed.value) {
                    localError.value = '请先同意用户协议和隐私政策';
                    return;
                }
                markAgreement();
                var payload = {
                    username: form.username || null,
                    password: form.password,
                    email: form.email || null,
                    phone: form.phone || null,
                    inviteCode: form.inviteCode || null,
                    code: smsCode.value || null
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
                    var res = await sdk.register(payload);
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
                if (!compBase) return;
                forgotLoading.value = true;
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
                    if (!effectiveSdk.value) { forgotLoading.value = false; return; }
                    if (forgotComp.value) { forgotLoading.value = false; forgotOpen.value = true; return; }
                    const s = document.createElement('script');
                    s.src = compBase + '/nux-forgot-password.js';
                    s.onload = function() {
                        forgotLoading.value = false;
                        forgotComp.value = window.NuxForgotPassword || null;
                        if (forgotComp.value) forgotOpen.value = true;
                    };
                    s.onerror = function() { forgotLoading.value = false; };
                    document.head.appendChild(s);
                }).catch(function() { forgotLoading.value = false; });
            }

            return {
                mode, loginType, form, smsCode, smsCountdown, agreed, rememberMe,
                showPassword, showConfirmPassword, combinedError, isSmsMode, regSms, effectiveSdk,
                effectiveTermsUrl, effectivePrivacyUrl,
                forgotOpen, forgotLoading, forgotComp,
                onLogin, onRegister, doRegister, sendSms, switchMode, switchLoginType, onThirdParty, onForgot, registering,
                eyeSvg, eyeSlashSvg
            };
        },
        template: `
            <div :class="['nux-login-page', 'nux-login--' + variant]">
                <div class="nux-login-form-side">
                    <div class="nux-login-card">
                        <component :is="forgotComp" v-if="showForgot && effectiveSdk && forgotOpen" :sdk="effectiveSdk" @back="forgotOpen = false" @done="forgotOpen = false"></component>
                        <div v-else-if="forgotLoading" class="nux-login-error">加载中…</div>
                        <template v-else>
                        <div class="nux-login-tabs">
                            <button :class="['nux-login-tab', { active: mode === 'login' }]" @click="switchMode('login')">登录</button>
                            <button v-if="showRegister" :class="['nux-login-tab', { active: mode === 'register' }]" @click="switchMode('register')">注册</button>
                        </div>
                        <div v-if="combinedError" class="nux-login-error">{{ combinedError }}</div>
                        <div v-if="showSmsLogin" class="nux-login-subtabs">
                            <button :class="['nux-login-subtab', { active: loginType === 'account' }]" @click="switchLoginType('account')">账号密码</button>
                            <button :class="['nux-login-subtab', { active: loginType === 'sms' }]" @click="switchLoginType('sms')">验证码登录</button>
                        </div>
                        <form @submit.prevent="mode === 'login' ? onLogin() : onRegister()">
                            <template v-if="!isSmsMode && !regSms">
                                <div v-if="phoneLogin && mode === 'login'" class="nux-form-group">
                                    <label class="nux-form-label">手机号</label>
                                    <input v-model="form.phone" type="tel" class="nux-input" placeholder="请输入手机号" autocomplete="tel" maxlength="11">
                                </div>
                                <div v-else class="nux-form-group">
                                    <label class="nux-form-label">用户名</label>
                                    <input v-model="form.username" type="text" class="nux-input" placeholder="请输入用户名" autocomplete="username">
                                </div>
                            </template>
                            <template v-else-if="isSmsMode">
                                <div class="nux-form-group">
                                    <label class="nux-form-label">手机号</label>
                                    <input v-model="form.phone" type="tel" class="nux-input" placeholder="请输入手机号" autocomplete="tel" maxlength="11">
                                </div>
                                <div class="nux-form-group">
                                    <label class="nux-form-label">验证码</label>
                                    <div class="nux-sms-row">
                                        <input v-model="smsCode" type="text" class="nux-input" placeholder="请输入验证码" autocomplete="one-time-code" maxlength="6">
                                        <button type="button" class="nux-sms-btn" :disabled="smsCountdown > 0 || smsLoading" @click="sendSms">
                                            {{ smsCountdown > 0 ? smsCountdown + 's 后重发' : (smsLoading ? '发送中' : '获取验证码') }}
                                        </button>
                                    </div>
                                </div>
                            </template>
                            <template v-else-if="regSms">
                                <div class="nux-form-group">
                                    <label class="nux-form-label">手机号</label>
                                    <input v-model="form.phone" type="tel" class="nux-input" placeholder="请输入手机号" autocomplete="tel" maxlength="11">
                                </div>
                                <div class="nux-form-group">
                                    <label class="nux-form-label">验证码</label>
                                    <div class="nux-sms-row">
                                        <input v-model="smsCode" type="text" class="nux-input" placeholder="请输入验证码" autocomplete="one-time-code" maxlength="6">
                                        <button type="button" class="nux-sms-btn" :disabled="smsCountdown > 0 || smsLoading" @click="sendSms">
                                            {{ smsCountdown > 0 ? smsCountdown + 's 后重发' : (smsLoading ? '发送中' : '获取验证码') }}
                                        </button>
                                    </div>
                                </div>
                            </template>
                            <div v-if="showTerms" class="nux-form-group">
                                <label class="nux-checkbox nux-terms">
                                    <input type="checkbox" v-model="agreed">
                                    <span v-if="effectiveTermsUrl || effectivePrivacyUrl">我已阅读并同意
                                        <a v-if="effectiveTermsUrl" :href="effectiveTermsUrl" target="_blank" rel="noopener">《用户协议》</a><a v-if="effectivePrivacyUrl" :href="effectivePrivacyUrl" target="_blank" rel="noopener">《隐私政策》</a>
                                    </span>
                                    <span v-else>{{ termsText }}</span>
                                </label>
                            </div>
                            <div v-if="mode === 'register' && showEmailField" class="nux-form-group">
                                <label class="nux-form-label">邮箱</label>
                                <input v-model="form.email" type="email" class="nux-input" placeholder="请输入邮箱" autocomplete="email">
                            </div>
                            <template v-if="mode === 'login' && !isSmsMode">
                                <div class="nux-form-group">
                                    <label class="nux-form-label">密码</label>
                                    <div class="nux-password-wrap">
                                        <input v-model="form.password" :type="showPassword ? 'text' : 'password'" class="nux-input" placeholder="请输入密码" autocomplete="current-password" required>
                                        <button type="button" class="nux-password-toggle" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword" v-html="showPassword ? eyeSlashSvg : eyeSvg"></button>
                                    </div>
                                </div>
                                <div v-if="showRememberMe || showForgot" class="nux-login-options">
                                    <label v-if="showRememberMe" class="nux-checkbox">
                                        <input type="checkbox" v-model="rememberMe">
                                        <span>记住我</span>
                                    </label>
                                    <button v-if="showForgot" type="button" class="nux-link" @click="onForgot">忘记密码？</button>
                                </div>
                            </template>
                            <template v-else-if="mode === 'register'">
                                <div class="nux-form-group">
                                    <label class="nux-form-label">密码</label>
                                    <div class="nux-password-wrap">
                                        <input v-model="form.password" :type="showPassword ? 'text' : 'password'" class="nux-input" placeholder="请输入密码" autocomplete="new-password" required>
                                        <button type="button" class="nux-password-toggle" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword" v-html="showPassword ? eyeSlashSvg : eyeSvg"></button>
                                    </div>
                                </div>
                                <div class="nux-form-group">
                                    <label class="nux-form-label">确认密码</label>
                                    <div class="nux-password-wrap">
                                        <input v-model="form.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" class="nux-input" placeholder="请再次输入密码" autocomplete="off" required>
                                        <button type="button" class="nux-password-toggle" :aria-label="showConfirmPassword ? '隐藏密码' : '显示密码'" @click="showConfirmPassword = !showConfirmPassword" v-html="showConfirmPassword ? eyeSlashSvg : eyeSvg"></button>
                                    </div>
                                </div>
                            </template>
                            <div v-if="mode === 'register' && showPhoneLogin && !isSmsMode && !showSmsLogin" class="nux-form-group">
                                <label class="nux-form-label">手机号</label>
                                <input v-model="form.phone" type="tel" class="nux-input" placeholder="请输入手机号" autocomplete="tel" maxlength="11">
                            </div>
                            <div v-if="mode === 'register' && showInviteCode" class="nux-form-group">
                                <label class="nux-form-label">邀请码</label>
                                <input v-model="form.inviteCode" type="text" class="nux-input" placeholder="邀请码（选填）">
                            </div>
                            <button type="submit" class="nux-login-submit" :disabled="loading || registering">
                                <span v-if="loading || registering" class="nx-spinner"></span>
                                {{ mode === 'login' ? (loading ? '登 录 …' : '登 录') : (registering ? '注 册 …' : '注 册') }}
                            </button>
                        </form>
                        </template>
                        <div v-if="thirdPartyLogin && thirdPartyLogin.length" class="nux-login-divider"><span>其他登录方式</span></div>
                        <div v-if="thirdPartyLogin && thirdPartyLogin.length" class="nux-login-third">
                            <button v-for="tp in thirdPartyLogin" :key="tp.key" type="button" class="nux-third-btn" :title="tp.name" @click="onThirdParty(tp.key)">
                                <span v-if="tp.icon" v-html="tp.icon"></span>
                                <span v-else>{{ tp.name }}</span>
                            </button>
                        </div>
                        <div class="nux-login-footer">
                            <slot name="footer"></slot>
                        </div>
                    </div>
                </div>
                <div class="nux-login-brand">
                    <div class="nux-login-brand-content">
                        <span v-if="appIcon" class="nux-login-icon">{{ appIcon }}</span>
                        <h1 v-if="appName" class="nux-login-app-name">{{ appName }}</h1>
                        <p v-if="slogan" class="nux-login-slogan">{{ slogan }}</p>
                        <p v-if="description" class="nux-login-desc">{{ description }}</p>
                        <div v-if="features && features.length" class="nux-login-features">
                            <div v-for="(f, i) in features" :key="i" class="nux-login-feature">
                                <span v-if="f.icon" class="nux-login-feature-icon">{{ f.icon }}</span>
                                <div class="nux-login-feature-text">
                                    <strong v-if="f.title">{{ f.title }}</strong>
                                    <span v-if="f.desc">{{ f.desc }}</span>
                                </div>
                            </div>
                        </div>
                        <div v-if="stats && stats.length" class="nux-login-stats">
                            <div v-for="(s, i) in stats" :key="i" class="nux-login-stat">
                                <strong>{{ s.value }}</strong>
                                <span>{{ s.label }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
    };
    window.NuxLoginPage = NuxLoginPage;
})();
