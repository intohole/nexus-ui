(function() {
    const NuxLoginPage = {
        name: 'NuxLoginPage',
        props: {
            appName: { type: String, default: '' },
            appIcon: { type: String, default: '' },
            slogan: { type: String, default: '' },
            showRegister: { type: Boolean, default: true },
            showPhoneLogin: { type: Boolean, default: false },
            loading: { type: Boolean, default: false },
            error: { type: String, default: '' }
        },
        emits: ['login', 'register'],
        setup(props, { emit }) {
            const mode = Vue.ref('login');
            const form = Vue.reactive({
                username: '',
                password: '',
                confirmPassword: '',
                phone: '',
                code: ''
            });

            function onLogin() {
                emit('login', { username: form.username, password: form.password });
            }

            function onRegister() {
                emit('register', {
                    username: form.username,
                    password: form.password,
                    confirmPassword: form.confirmPassword,
                    phone: form.phone,
                    code: form.code
                });
            }

            function switchMode(m) {
                mode.value = m;
            }

            return { mode, form, onLogin, onRegister, switchMode };
        },
        template: `
            <div class="nux-login-page">
                <div class="nux-login-brand">
                    <div class="nux-login-brand-content">
                        <span v-if="appIcon" class="nux-login-icon">{{ appIcon }}</span>
                        <h1 v-if="appName" class="nux-login-app-name">{{ appName }}</h1>
                        <p v-if="slogan" class="nux-login-slogan">{{ slogan }}</p>
                    </div>
                </div>
                <div class="nux-login-form-side">
                    <div class="nux-login-card">
                        <div class="nux-login-tabs">
                            <button :class="['nux-login-tab', { active: mode === 'login' }]" @click="switchMode('login')">登录</button>
                            <button v-if="showRegister" :class="['nux-login-tab', { active: mode === 'register' }]" @click="switchMode('register')">注册</button>
                        </div>

                        <div v-if="error" class="nux-login-error">{{ error }}</div>

                        <form @submit.prevent="mode === 'login' ? onLogin() : onRegister()">
                            <div class="nux-form-group">
                                <label class="nux-form-label">用户名</label>
                                <input v-model="form.username" type="text" class="nux-input" placeholder="请输入用户名" autocomplete="username" required>
                            </div>

                            <div v-if="showPhoneLogin && mode === 'register'" class="nux-form-group">
                                <label class="nux-form-label">手机号</label>
                                <input v-model="form.phone" type="tel" class="nux-input" placeholder="请输入手机号">
                            </div>

                            <div class="nux-form-group">
                                <label class="nux-form-label">密码</label>
                                <input v-model="form.password" type="password" class="nux-input" placeholder="请输入密码" autocomplete="current-password" required>
                            </div>

                            <div v-if="mode === 'register'" class="nux-form-group">
                                <label class="nux-form-label">确认密码</label>
                                <input v-model="form.confirmPassword" type="password" class="nux-input" placeholder="请再次输入密码" autocomplete="new-password" required>
                            </div>

                            <button type="submit" class="nux-login-submit" :disabled="loading">
                                <span v-if="loading" class="nx-spinner"></span>
                                {{ mode === 'login' ? '登 录' : '注 册' }}
                            </button>
                        </form>

                        <div class="nux-login-footer">
                            <slot name="footer"></slot>
                        </div>
                    </div>
                </div>
            </div>
        `
    };

    window.NuxLoginPage = NuxLoginPage;
})();
