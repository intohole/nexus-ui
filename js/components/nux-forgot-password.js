(function() {
    const NuxForgotPassword = {
        name: 'NuxForgotPassword',
        props: {
            sdk: { type: Object, required: true },
            defaultType: { type: String, default: 'email' }
        },
        emits: ['back', 'done'],
        setup(props, { emit }) {
            const view = Vue.ref('form');
            const type = Vue.ref(props.defaultType === 'phone' ? 'phone' : 'email');
            const target = Vue.ref('');
            const code = Vue.ref('');
            const newPassword = Vue.ref('');
            const confirmPassword = Vue.ref('');
            const showNewPwd = Vue.ref(false);
            const showConfirmPwd = Vue.ref(false);
            const error = Vue.ref('');
            const sending = Vue.ref(false);
            const submitting = Vue.ref(false);
            const countdown = Vue.ref(0);
            let timer = null;

            const confirmMismatch = Vue.computed(function() {
                return confirmPassword.value && newPassword.value && newPassword.value !== confirmPassword.value;
            });

            function startCountdown() {
                countdown.value = 60;
                if (timer) clearInterval(timer);
                timer = setInterval(function() {
                    countdown.value -= 1;
                    if (countdown.value <= 0) clearInterval(timer);
                }, 1000);
            }

            function sendCode() {
                error.value = '';
                if (type.value === 'phone' && !/^1[3-9]\d{9}$/.test(target.value)) {
                    error.value = '请输入正确的手机号';
                    return;
                }
                if (type.value === 'email' && !/^\S+@\S+\.\S+$/.test(target.value)) {
                    error.value = '请输入正确的邮箱';
                    return;
                }
                sending.value = true;
                const payload = type.value === 'phone' ? { phone: target.value } : { email: target.value };
                props.sdk.forgotPassword(payload).then(function(res) {
                    if (res && res.success) {
                        startCountdown();
                    } else {
                        error.value = (res && res.message) || '验证码发送失败';
                    }
                }).catch(function(e) {
                    error.value = e.message || '验证码发送失败';
                }).finally(function() {
                    sending.value = false;
                });
            }

            function submit() {
                error.value = '';
                if (!code.value) { error.value = '请输入验证码'; return; }
                if (newPassword.value.length < 8) { error.value = '密码至少8位'; return; }
                if (newPassword.value !== confirmPassword.value) { error.value = '两次密码不一致'; return; }
                submitting.value = true;
                const payload = {
                    code: code.value,
                    newPassword: newPassword.value,
                    ...(type.value === 'phone' ? { phone: target.value } : { email: target.value })
                };
                props.sdk.resetPassword(payload).then(function(res) {
                    if (res && res.success) {
                        view.value = 'done';
                    } else {
                        error.value = (res && res.message) || '密码重置失败';
                    }
                }).catch(function(e) {
                    error.value = e.message || '密码重置失败';
                }).finally(function() {
                    submitting.value = false;
                });
            }

            function switchType(t) {
                error.value = '';
                type.value = t;
            }

            Vue.onUnmounted(function() {
                if (timer) clearInterval(timer);
            });

            return {
                view, type, target, code, newPassword, confirmPassword, error,
                sending, submitting, countdown, sendCode, submit, switchType,
                showNewPwd, showConfirmPwd, confirmMismatch,
                back: function() { emit('back'); },
                done: function() { emit('done'); }
            };
        },
        template: `
            <div class="nux-forgot">
                <div v-if="view === 'form'">
                    <div class="nux-forgot-head">
                        <button type="button" class="nux-link" @click="back">← 返回登录</button>
                        <h3 class="nux-forgot-title">找回密码</h3>
                    </div>
                    <div v-if="error" class="nux-login-error">{{ error }}</div>
                    <div class="nux-login-subtabs nux-forgot-tabs">
                        <button :class="['nux-login-subtab', { active: type === 'email' }]" type="button" @click="switchType('email')">邮箱找回</button>
                        <button :class="['nux-login-subtab', { active: type === 'phone' }]" type="button" @click="switchType('phone')">手机找回</button>
                    </div>
                    <div class="nux-form-group">
                        <label class="nux-form-label">{{ type === 'email' ? '邮箱' : '手机号' }}</label>
                        <input v-model="target" :type="type === 'email' ? 'email' : 'tel'"
                               :placeholder="type === 'email' ? '请输入注册邮箱' : '请输入注册手机号'"
                               class="nux-input" :maxlength="type === 'phone' ? 11 : ''">
                    </div>
                    <div class="nux-form-group">
                        <label class="nux-form-label">验证码</label>
                        <div class="nux-sms-row">
                            <input v-model="code" type="text" class="nux-input" placeholder="请输入验证码" autocomplete="one-time-code" maxlength="6">
                            <button type="button" class="nux-sms-btn" :disabled="countdown > 0 || sending" @click="sendCode">
                                {{ countdown > 0 ? countdown + 's 后重发' : (sending ? '发送中' : '获取验证码') }}
                            </button>
                        </div>
                    </div>
                    <div class="nux-form-group">
                        <label class="nux-form-label">新密码</label>
                        <div class="nux-password-wrap">
                            <input v-model="newPassword" :type="showNewPwd ? 'text' : 'password'" class="nux-input" placeholder="请输入新密码（至少8位）" autocomplete="new-password">
                            <button type="button" class="nux-password-toggle" :aria-label="showNewPwd ? '隐藏密码' : '显示密码'" @click="showNewPwd = !showNewPwd">
                                <svg v-if="!showNewPwd" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="nux-form-group">
                        <label class="nux-form-label">确认新密码</label>
                        <div class="nux-password-wrap">
                            <input v-model="confirmPassword" :type="showConfirmPwd ? 'text' : 'password'" class="nux-input" placeholder="请再次输入新密码" autocomplete="new-password">
                            <button type="button" class="nux-password-toggle" :aria-label="showConfirmPwd ? '隐藏密码' : '显示密码'" @click="showConfirmPwd = !showConfirmPwd">
                                <svg v-if="!showConfirmPwd" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            </button>
                        </div>
                        <div v-if="confirmMismatch" class="nux-live-hint">两次输入的密码不一致</div>
                    </div>
                    <button type="button" class="nux-login-submit" :disabled="submitting" @click="submit">
                        <span v-if="submitting" class="nx-spinner"></span>
                        重置密码
                    </button>
                </div>
                <div v-else class="nux-forgot-done">
                    <div class="nux-forgot-done-icon">✓</div>
                    <h3 class="nux-forgot-title">密码已重置</h3>
                    <p class="nux-forgot-done-text">请使用新密码重新登录</p>
                    <button type="button" class="nux-login-submit" @click="done">去登录</button>
                </div>
            </div>
        `
    };

    window.NuxForgotPassword = NuxForgotPassword;
})();
