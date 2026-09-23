(function () {
    'use strict';
    window.NuxLoginPageTemplate = `
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
                        <form @submit.prevent="mode === 'login' ? onLogin() : onRegister()" novalidate>
                            <template v-if="!isSmsMode && !regSms">
                                <div v-if="phoneLogin && mode === 'login'" class="nux-form-group">
                                    <label class="nux-form-label">手机号</label>
                                    <input v-model="form.phone" type="tel" class="nux-input" placeholder="请输入手机号" autocomplete="tel" maxlength="11" required>
                                </div>
                                <div v-else class="nux-form-group">
                                    <label class="nux-form-label">用户名</label>
                                    <input v-model="form.username" type="text" class="nux-input" placeholder="用户名 / 邮箱 / 手机号" autocomplete="username" required>
                                </div>
                            </template>
                            <template v-else-if="isSmsMode">
                                <div class="nux-form-group">
                                    <label class="nux-form-label">手机号</label>
                                    <input v-model="form.phone" type="tel" class="nux-input" placeholder="请输入手机号" autocomplete="tel" maxlength="11" required>
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
                                    <input v-model="form.phone" type="tel" class="nux-input" placeholder="请输入手机号" autocomplete="tel" maxlength="11" required>
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
                            <div v-if="mode === 'register' && showEmailField" class="nux-form-group">
                                <label class="nux-form-label">邮箱{{requireEmail ? '（用于找回密码）' : ''}}</label>
                                <input v-model="form.email" type="email" class="nux-input" placeholder="请输入邮箱" autocomplete="email" :required="requireEmail">
                            </div>
                            <template v-if="mode === 'login' && !isSmsMode">
                                <div class="nux-form-group">
                                    <label class="nux-form-label">密码</label>
                                    <div class="nux-password-wrap">
                                        <input v-model="form.password" :type="showPassword ? 'text' : 'password'" class="nux-input" placeholder="请输入密码" autocomplete="current-password" required>
                                        <button type="button" class="nux-password-toggle" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword" v-html="showPassword ? eyeSlashSvg : eyeSvg"></button>
                                    </div>
                                    <p class="nux-form-hint">密码至少 {{ minPasswordLength }} 位，包含字母和数字</p>
                                </div>
                                <div v-if="showRememberMe || showForgot" class="nux-login-options">
                                    <label v-if="showRememberMe" class="nux-checkbox">
                                        <input type="checkbox" v-model="rememberMe">
                                        <span>记住我（7天免登录）</span>
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
                                    <p class="nux-form-hint">至少 {{ minPasswordLength }} 位，包含字母和数字</p>
                                </div>
                                <div class="nux-form-group">
                                    <label class="nux-form-label">确认密码</label>
                                    <div class="nux-password-wrap">
                                        <input v-model="form.confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" class="nux-input" placeholder="请再次输入密码" autocomplete="off" required>
                                        <button type="button" class="nux-password-toggle" :aria-label="showConfirmPassword ? '隐藏密码' : '显示密码'" @click="showConfirmPassword = !showConfirmPassword" v-html="showConfirmPassword ? eyeSlashSvg : eyeSvg"></button>
                                    </div>
                                </div>
                            <div v-if="mode === 'register' && ageGate" class="nux-form-group">
                                    <label class="nux-form-label">使用者年龄：{{ age }}岁</label>
                                    <input v-model.number="age" type="range" min="6" max="18" class="nux-input nux-age-slider" aria-label="使用者年龄">
                                    <p class="nux-age-notice">本服务供未成年人使用时，须由法定监护人授权并陪同。</p>
                                </div>
                                <div v-if="mode === 'register' && ageGate && age < minorAge" class="nux-form-group">
                                    <label class="nux-checkbox nux-terms">
                                        <input type="checkbox" v-model="guardianAgreed">
                                        <span>我确认本人为该未成年人的法定监护人，授权其使用本服务，并将作为家长账号统一管理其学习数据。</span>
                                    </label>
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
                            <div v-if="captchaRequired" class="nux-form-group">
                                <label class="nux-form-label">图形验证码</label>
                                <div class="nux-captcha-row">
                                    <input v-model="form.captchaCode" type="text" class="nux-input" placeholder="请输入验证码" maxlength="6" autocomplete="off" aria-label="图形验证码">
                                    <button type="button" class="nux-captcha-img" :aria-label="loading ? '验证码加载中' : '点击刷新验证码'" :disabled="captchaLoading" @click="loadCaptchaImage">
                                        <img v-if="captchaImg" :src="captchaImg" alt="验证码">
                                        <span v-else class="nux-captcha-loading">加载中…</span>
                                    </button>
                                </div>
                            </div>
                            <div v-if="showTerms" class="nux-form-group">
                                <label :class="['nux-checkbox', 'nux-terms', { 'nux-terms-warn': showTerms && !agreed }]">
                                    <input type="checkbox" v-model="agreed">
                                    <span v-if="effectiveTermsUrl || effectivePrivacyUrl">我已阅读并同意
                                        <a v-if="effectiveTermsUrl" :href="effectiveTermsUrl" target="_blank" rel="noopener">《用户协议》</a><a v-if="effectivePrivacyUrl" :href="effectivePrivacyUrl" target="_blank" rel="noopener">《隐私政策》</a>
                                    </span>
                                    <span v-else>{{ termsText }}</span>
                                </label>
                                <div v-if="showTerms && !agreed" class="nux-terms-hint">请先勾选同意用户协议和隐私政策，再{{ mode === 'login' ? '登录' : '注册' }}</div>
                            </div>
                            <button type="submit" class="nux-login-submit" :disabled="loading || registering || loginBusy">
                                <span v-if="loading || registering || loginBusy" class="nx-spinner"></span>
                                {{ mode === 'login' ? ((loading || loginBusy) ? '登 录 …' : '登 录') : (registering ? '注 册 …' : '注 册') }}
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
                        <img v-if="appLogo" :src="appLogo" class="nux-login-logo" alt="">
                        <span v-else-if="appIcon" class="nux-login-icon">{{ appIcon }}</span>
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
        `;
})();
