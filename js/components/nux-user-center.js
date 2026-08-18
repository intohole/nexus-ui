(function() {
    const NuxUserCenter = {
        name: 'NuxUserCenter',
        props: {
            sdk: { type: Object, required: true },
            appName: { type: String, default: '' },
            floating: { type: Boolean, default: false }
        },
        emits: ['logout'],
        setup(props, { emit }) {
            const drawerOpen = Vue.ref(false);
            const tab = Vue.ref('profile');
            const user = Vue.ref(null);
            const sessions = Vue.ref([]);
            const loading = Vue.ref(false);
            const sessionsLoading = Vue.ref(false);
            const oldPassword = Vue.ref('');
            const newPassword = Vue.ref('');
            const confirmPassword = Vue.ref('');
            const passwordError = Vue.ref('');
            const submitting = Vue.ref(false);
            const userError = Vue.ref('');
            const bindError = Vue.ref('');
            const bindTarget = Vue.ref('');
            const bindCode = Vue.ref('');
            const bindType = Vue.ref('email');
            const bindSending = Vue.ref(false);
            const bindSubmitting = Vue.ref(false);
            const bindCountdown = Vue.ref(0);
            let bindTimer = null;
            let sessionTimer = null;

            function toast(msg, type) {
                if (typeof window.showToast === 'function') {
                    window.showToast(msg, type || 'success');
                }
            }

            function avatarName() {
                const u = user.value;
                if (!u) return '';
                return u.username || u.email || u.phone || '';
            }

            function toggleOpen() {
                drawerOpen.value = !drawerOpen.value;
                if (drawerOpen.value) {
                    loadUser();
                    loadSessions();
                }
            }

            function loadUser() {
                loading.value = true;
                userError.value = '';
                props.sdk.getCurrentUser().then(function(res) {
                    if (res && res.success) {
                        user.value = res.data;
                    } else {
                        userError.value = (res && res.message) || '获取用户信息失败';
                    }
                }).catch(function(e) {
                    userError.value = e.message || '获取用户信息失败';
                }).finally(function() {
                    loading.value = false;
                });
            }

            function loadSessions() {
                sessionsLoading.value = true;
                props.sdk.getSessions().then(function(res) {
                    if (res && res.success) {
                        sessions.value = res.data || [];
                    }
                }).catch(function() {}).finally(function() {
                    sessionsLoading.value = false;
                });
            }

            function changePassword() {
                passwordError.value = '';
                if (!oldPassword.value) { passwordError.value = '请输入当前密码'; return; }
                if (newPassword.value.length < 8) { passwordError.value = '新密码至少8位'; return; }
                if (newPassword.value !== confirmPassword.value) { passwordError.value = '两次输入的新密码不一致'; return; }
                submitting.value = true;
                props.sdk.changePassword({
                    oldPassword: oldPassword.value,
                    newPassword: newPassword.value,
                    revokeOthers: true
                }).then(function(res) {
                    if (res && res.success) {
                        toast('密码修改成功，其他设备已下线');
                        oldPassword.value = '';
                        newPassword.value = '';
                        confirmPassword.value = '';
                        tab.value = 'profile';
                    } else {
                        passwordError.value = (res && res.message) || '密码修改失败';
                    }
                }).catch(function(e) {
                    passwordError.value = e.message || '密码修改失败';
                }).finally(function() {
                    submitting.value = false;
                });
            }

            function revokeSession(id) {
                props.sdk.revokeSession(id).then(function(res) {
                    if (res && res.success) {
                        toast('已下线该设备');
                        loadSessions();
                    }
                }).catch(function(e) {
                    toast(e.message || '操作失败', 'error');
                });
            }

            function revokeAll() {
                if (typeof window.NuxConfirm === 'function') {
                    window.NuxConfirm('确定下线所有其他设备吗？').then(function(ok) {
                        if (ok) doRevokeAll();
                    });
                } else {
                    doRevokeAll();
                }
            }

            function doRevokeAll() {
                props.sdk.revokeAllSessions().then(function(res) {
                    if (res && res.success) {
                        toast('所有其他设备已下线');
                        loadSessions();
                    }
                }).catch(function(e) {
                    toast(e.message || '操作失败', 'error');
                });
            }

            function doLogout() {
                props.sdk.logout().finally(function() {
                    drawerOpen.value = false;
                    emit('logout');
                });
            }

            function startBindCountdown() {
                bindCountdown.value = 60;
                if (bindTimer) clearInterval(bindTimer);
                bindTimer = setInterval(function() {
                    bindCountdown.value -= 1;
                    if (bindCountdown.value <= 0) clearInterval(bindTimer);
                }, 1000);
            }

            function sendBindCode() {
                bindError.value = '';
                if (bindType.value === 'phone' && !/^1[3-9]\d{9}$/.test(bindTarget.value)) {
                    bindError.value = '请输入正确的手机号';
                    return;
                }
                if (bindType.value === 'email' && !/^\S+@\S+\.\S+$/.test(bindTarget.value)) {
                    bindError.value = '请输入正确的邮箱';
                    return;
                }
                bindSending.value = true;
                const payload = bindType.value === 'phone' ? { phone: bindTarget.value } : { email: bindTarget.value };
                props.sdk.sendBindCode(payload).then(function(res) {
                    if (res && res.success) {
                        startBindCountdown();
                    } else {
                        bindError.value = (res && res.message) || '验证码发送失败';
                    }
                }).catch(function(e) {
                    bindError.value = e.message || '验证码发送失败';
                }).finally(function() {
                    bindSending.value = false;
                });
            }

            function submitBind() {
                bindError.value = '';
                if (!bindCode.value) { bindError.value = '请输入验证码'; return; }
                bindSubmitting.value = true;
                const payload = {
                    code: bindCode.value,
                    ...(bindType.value === 'phone' ? { phone: bindTarget.value } : { email: bindTarget.value })
                };
                props.sdk.bindContact(payload).then(function(res) {
                    if (res && res.success) {
                        toast('绑定成功');
                        bindTarget.value = '';
                        bindCode.value = '';
                        loadUser();
                    } else {
                        bindError.value = (res && res.message) || '绑定失败';
                    }
                }).catch(function(e) {
                    bindError.value = e.message || '绑定失败';
                }).finally(function() {
                    bindSubmitting.value = false;
                });
            }

            function switchBindType(t) {
                bindError.value = '';
                bindType.value = t;
            }

            function boundContact() {
                const u = user.value;
                if (!u) return '';
                if (bindType.value === 'phone') return u.phone || '';
                return u.email || '';
            }

            function deviceLabel(s) {
                return s.device_info || ('设备#' + s.id);
            }

            function timeLabel(t) {
                if (!t) return '';
                var d = new Date(t);
                if (isNaN(d.getTime())) return '';
                var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
                return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
            }

            Vue.onMounted(function() {
                loadUser();
            });

            Vue.onUnmounted(function() {
                if (sessionTimer) clearInterval(sessionTimer);
                if (bindTimer) clearInterval(bindTimer);
            });

            return {
                drawerOpen, tab, user, sessions, loading, sessionsLoading,
                oldPassword, newPassword, confirmPassword, passwordError, submitting, userError,
                bindError, bindTarget, bindCode, bindType, bindSending, bindSubmitting, bindCountdown,
                toggleOpen, loadSessions, changePassword, revokeSession, revokeAll, doLogout,
                sendBindCode, submitBind, switchBindType, boundContact,
                avatarName, deviceLabel, timeLabel
            };
        },
        template: `
            <div class="nux-user-center">
                <button type="button" class="nux-uc-trigger" :class="{ 'nux-uc-floating': floating, 'nux-uc-active': drawerOpen, 'nux-uc-loading': loading && !user }" :title="avatarName() || '用户中心'" :aria-label="avatarName() || '用户中心'" @click="toggleOpen">
                    <nux-avatar :name="avatarName()" size="sm"></nux-avatar>
                </button>
                <nux-drawer v-model="drawerOpen" side="right" width="380px">
                    <div class="nux-uc-body">
                        <div class="nux-uc-header">
                            <div class="nux-uc-user">
                                <nux-avatar :name="avatarName()" size="lg"></nux-avatar>
                                <div class="nux-uc-user-meta">
                                    <strong v-if="avatarName()">{{ avatarName() }}</strong>
                                    <span v-if="user && user.email">{{ user.email }}</span>
                                    <span v-else-if="user && user.phone">{{ user.phone }}</span>
                                    <span v-else>未登录</span>
                                </div>
                            </div>
                            <button type="button" class="nux-uc-close" @click="drawerOpen = false">×</button>
                        </div>
                        <div v-if="userError" class="nux-login-error">{{ userError }}</div>
                        <div class="nux-uc-tabs">
                            <button :class="['nux-uc-tab', { active: tab === 'profile' }]" type="button" @click="tab = 'profile'">个人资料</button>
                            <button :class="['nux-uc-tab', { active: tab === 'password' }]" type="button" @click="tab = 'password'">修改密码</button>
                            <button :class="['nux-uc-tab', { active: tab === 'security' }]" type="button" @click="tab = 'security'">安全设置</button>
                            <button :class="['nux-uc-tab', { active: tab === 'sessions' }]" type="button" @click="tab = 'sessions'; loadSessions()">会话管理</button>
                        </div>
                        <div v-if="tab === 'profile'" class="nux-uc-pane">
                            <div class="nux-uc-info">
                                <div class="nux-uc-info-row"><span>用户名</span><b>{{ (user && user.username) || '—' }}</b></div>
                                <div class="nux-uc-info-row"><span>邮箱</span><b>{{ (user && user.email) || '—' }}</b></div>
                                <div class="nux-uc-info-row"><span>手机号</span><b>{{ (user && user.phone) || '—' }}</b></div>
                            </div>
                            <button type="button" class="nux-uc-logout" @click="doLogout">退出登录</button>
                        </div>
                        <div v-if="tab === 'password'" class="nux-uc-pane">
                            <div v-if="passwordError" class="nux-login-error">{{ passwordError }}</div>
                            <div class="nux-form-group">
                                <label class="nux-form-label">当前密码</label>
                                <input v-model="oldPassword" type="password" class="nux-input" placeholder="请输入当前密码" autocomplete="current-password">
                            </div>
                            <div class="nux-form-group">
                                <label class="nux-form-label">新密码</label>
                                <input v-model="newPassword" type="password" class="nux-input" placeholder="请输入新密码（至少8位）" autocomplete="new-password">
                            </div>
                            <div class="nux-form-group">
                                <label class="nux-form-label">确认新密码</label>
                                <input v-model="confirmPassword" type="password" class="nux-input" placeholder="请再次输入新密码" autocomplete="new-password">
                            </div>
                            <button type="button" class="nux-login-submit" :disabled="submitting" @click="changePassword">
                                <span v-if="submitting" class="nx-spinner"></span>
                                确认修改
                            </button>
                            <p class="nux-uc-tip">修改成功后，其他设备将自动下线。</p>
                        </div>
                        <div v-if="tab === 'security'" class="nux-uc-pane">
                            <div v-if="bindError" class="nux-login-error">{{ bindError }}</div>
                            <div class="nux-login-subtabs nux-forgot-tabs">
                                <button :class="['nux-login-subtab', { active: bindType === 'email' }]" type="button" @click="switchBindType('email')">绑定邮箱</button>
                                <button :class="['nux-login-subtab', { active: bindType === 'phone' }]" type="button" @click="switchBindType('phone')">绑定手机</button>
                            </div>
                            <p v-if="boundContact()" class="nux-uc-tip">当前已绑定：{{ boundContact() }}</p>
                            <div class="nux-form-group">
                                <label class="nux-form-label">{{ bindType === 'email' ? '邮箱' : '手机号' }}</label>
                                <input v-model="bindTarget" :type="bindType === 'email' ? 'email' : 'tel'"
                                       class="nux-input" :placeholder="bindType === 'email' ? '请输入要绑定的邮箱' : '请输入要绑定的手机号'"
                                       :maxlength="bindType === 'phone' ? 11 : ''" autocomplete="off">
                            </div>
                            <div class="nux-form-group">
                                <label class="nux-form-label">验证码</label>
                                <div class="nux-sms-row">
                                    <input v-model="bindCode" type="text" class="nux-input" placeholder="请输入验证码" autocomplete="one-time-code" maxlength="6">
                                    <button type="button" class="nux-sms-btn" :disabled="bindCountdown > 0 || bindSending" @click="sendBindCode">
                                        {{ bindCountdown > 0 ? bindCountdown + 's 后重发' : (bindSending ? '发送中' : '获取验证码') }}
                                    </button>
                                </div>
                            </div>
                            <button type="button" class="nux-login-submit" :disabled="bindSubmitting" @click="submitBind">
                                <span v-if="bindSubmitting" class="nx-spinner"></span>
                                确认绑定
                            </button>
                            <p class="nux-uc-tip">绑定邮箱/手机后，可通过验证码找回密码。</p>
                        </div>
                        <div v-if="tab === 'sessions'" class="nux-uc-pane">
                            <div class="nux-uc-sessions-head">
                                <span>当前账号登录的设备</span>
                                <button v-if="sessions.length" type="button" class="nux-link" @click="revokeAll">全部下线</button>
                            </div>
                            <div v-if="sessionsLoading" class="nux-uc-empty">加载中…</div>
                            <div v-else-if="!sessions.length" class="nux-uc-empty">暂无其他登录设备</div>
                            <div v-else class="nux-uc-session-list">
                                <div v-for="s in sessions" :key="s.id" class="nux-uc-session">
                                    <div class="nux-uc-session-meta">
                                        <b>{{ deviceLabel(s) }}</b>
                                        <span>{{ s.ip_address || '未知IP' }} · {{ timeLabel(s.last_active_at || s.created_at) }}</span>
                                    </div>
                                    <button type="button" class="nux-link" @click="revokeSession(s.id)">下线</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </nux-drawer>
            </div>
        `
    };

    window.NuxUserCenter = NuxUserCenter;
})();
