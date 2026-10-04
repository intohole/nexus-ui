(function() {
    const NuxUserCenter = {
        name: 'NuxUserCenter',
        props: {
            sdk: { type: Object, required: true },
            appName: { type: String, default: '' },
            label: { type: String, default: '' },
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
            const showOldPwd = Vue.ref(false);
            const showNewPwd = Vue.ref(false);
            const showConfirmPwd = Vue.ref(false);
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
            const wallet = Vue.ref(null);
            const walletTxs = Vue.ref([]);
            const walletTotal = Vue.ref(0);
            const walletPage = Vue.ref(1);
            const walletDirection = Vue.ref('all');
            const catalog = Vue.ref(null);
            const meters = Vue.ref(null);
            const billing = Vue.ref(null);
            const packages = Vue.ref([]);
            const recharging = Vue.ref(false);
            const claiming = Vue.ref(false);
            const walletLoading = Vue.ref(false);
            const walletPageSize = 20;
            const creditTasks = Vue.ref([]);
            const inviteInfo = Vue.ref(null);
            const inviteCopied = Vue.ref(false);
            const claimingCode = Vue.ref('');

            const APP_NAMES = {
                golden: '金股标', resumeAI: '跃职', aiPet: 'AI 宠物', geniusStudent: '贴身家教',
                verseCraft: '小说工坊', MiaoBi: '妙笔', promptGenius: '提示词天才', travelMate: '旅行助手',
                LifeCompass: '司南', codeBlock: '代码块', suki: 'Suki', oneNote: '笔记', challengePlanet: '星轨'
            };

            const lowBalance = Vue.computed(function() {
                return !!(wallet.value && typeof wallet.value.balance === 'number' && wallet.value.balance < 200);
            });
            const canClaimDaily = Vue.computed(function() {
                return !!(wallet.value && wallet.value.daily_gift && !wallet.value.daily_gift.granted_today);
            });
            const isFormal = Vue.computed(function() {
                return !!(wallet.value && wallet.value.charge_mode === 'formal');
            });
            const vipBadge = Vue.computed(function() {
                const v = wallet.value && wallet.value.vip;
                if (!v || !v.level || v.level === 'free' || !(v.discount < 1)) return '';
                const off = (v.discount * 10).toFixed(1).replace(/\.0$/, '');
                return (v.level_name || v.level) + ' · AI 调用 ' + off + ' 折';
            });
            const overdraftInfo = Vue.computed(function() {
                const od = wallet.value && wallet.value.overdraft;
                if (!od || !od.limit || !(od.used > 0)) return null;
                return {
                    used: od.used,
                    limit: od.limit,
                    pct: Math.min(100, Math.round(od.used * 100 / od.limit)),
                    exhausted: !!od.exhausted
                };
            });
            const monthSaved = Vue.computed(function() {
                const b = billing.value;
                return b && b.month_discount_given > 0 ? b.month_discount_given : 0;
            });

            const confirmMismatch = Vue.computed(function() {
                return confirmPassword.value && newPassword.value && newPassword.value !== confirmPassword.value;
            });

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

            function avatarInitial() {
                const u = user.value;
                if (!u) return '';
                if (u.username) return u.username.charAt(0);
                if (u.email) {
                    const local = String(u.email).split('@')[0];
                    if (local && /[a-z]/i.test(local.charAt(0))) return local.charAt(0).toUpperCase();
                }
                return '';
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
                if (!/[a-zA-Z]/.test(newPassword.value) || !/\d/.test(newPassword.value)) { passwordError.value = '新密码需同时包含字母和数字'; return; }
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
                if (typeof window.nuxConfirm === 'function') {
                    window.nuxConfirm('确定下线所有其他设备吗？').then(function(ok) {
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

            function gotoDatacenter() {
                drawerOpen.value = false;
                window.location.href = '/static/user-center.html';
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
                return window.NexusUtils ? NexusUtils.formatDateTimeHyphen(t) : '';
            }

            function copyInviteLink() {
                const info = inviteInfo.value;
                if (!info || !info.code) return;
                const link = window.location.origin + '/register.html?ref=' + info.code;
                const done = function() {
                    inviteCopied.value = true;
                    toast('邀请链接已复制，好友注册双方都得积分');
                    setTimeout(function() { inviteCopied.value = false; }, 2000);
                };
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(link).then(done).catch(function() { fallbackCopy(link, done); });
                } else {
                    fallbackCopy(link, done);
                }
            }

            function fallbackCopy(text, done) {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); done(); } catch (e) {}
                document.body.removeChild(ta);
            }

            function loadWallet() {
                if (walletLoading.value) return;
                walletLoading.value = true;
                Promise.all([
                    props.sdk.getPointsSummary(),
                    loadWalletTxs(),
                    props.sdk.getPointsCatalog(window.ucConfig && window.ucConfig.app_key),
                    props.sdk.getMetersSummary(),
                    props.sdk.getBillingSummary(),
                    (props.sdk.getCreditTasks ? props.sdk.getCreditTasks() : Promise.resolve(null)).catch(function() { return null; }),
                    (props.sdk.getCreditsInvite ? props.sdk.getCreditsInvite() : Promise.resolve(null)).catch(function() { return null; })
                ]).then(function(results) {
                    if (results[0] && results[0].success) wallet.value = results[0].data;
                    if (results[2] && results[2].success) catalog.value = results[2].data;
                    if (results[3] && results[3].success) meters.value = results[3].data;
                    if (results[4] && results[4].success) billing.value = results[4].data;
                    if (results[5] && results[5].success) creditTasks.value = (results[5].data && results[5].data.tasks) || [];
                    if (results[6] && results[6].success) inviteInfo.value = results[6].data;
                    if (isFormal.value && !packages.value.length) loadPackages();
                }).catch(function() {}).finally(function() {
                    walletLoading.value = false;
                });
            }

            function loadPackages() {
                props.sdk.getCreditPackages().then(function(res) {
                    if (res && res.success) packages.value = (res.data && res.data.items) || [];
                }).catch(function() {});
            }

            function claimDaily() {
                if (claiming.value) return;
                claiming.value = true;
                props.sdk.getPointsSummary().then(function(res) {
                    if (res && res.success) {
                        wallet.value = res.data;
                        if (wallet.value.daily_gift && wallet.value.daily_gift.granted_today) {
                            toast('今日 ' + wallet.value.daily_gift.amount + ' 积分已到账');
                            loadWalletTxs();
                        } else {
                            toast('今日赠送待领取，稍后再来看看', 'info');
                        }
                    }
                }).catch(function() {}).finally(function() {
                    claiming.value = false;
                });
            }

            function taskMetricLabel(t) {
                if (t.metric === 'distinct_apps') return '已体验 ' + t.current + '/' + t.target + ' 个应用';
                if (t.metric === 'consume_sum') return '已消耗 ' + t.current + '/' + t.target + ' 积分';
                return '已调用 ' + t.current + '/' + t.target + ' 次';
            }

            function taskRewardLabel(t) {
                if (t.metric === 'checkin' && t.reward_steps && t.reward_steps.length) {
                    return '+' + t.reward_steps[0] + '~' + t.reward_steps[t.reward_steps.length - 1];
                }
                return '+' + t.reward_points;
            }

            function refreshEarn() {
                if (props.sdk.getCreditTasks) {
                    props.sdk.getCreditTasks().then(function(res) {
                        if (res && res.success) creditTasks.value = (res.data && res.data.tasks) || [];
                    }).catch(function() {});
                }
                props.sdk.getPointsSummary().then(function(res) {
                    if (res && res.success) wallet.value = res.data;
                }).catch(function() {});
                loadWalletTxs();
            }

            function doCheckin() {
                if (claimingCode.value) return;
                claimingCode.value = 'checkin';
                props.sdk.checkinCreditTask().then(function(res) {
                    if (res && res.success && res.data && res.data.claimed) {
                        toast('签到成功，+' + res.data.reward + ' 积分' + (res.data.streak > 1 ? '（连续 ' + res.data.streak + ' 天）' : ''));
                        refreshEarn();
                    } else {
                        toast('今天已签到过啦', 'info');
                    }
                }).catch(function(e) {
                    toast((e && e.message) || '签到失败', 'error');
                }).finally(function() {
                    claimingCode.value = '';
                });
            }

            function doClaimTask(t) {
                if (claimingCode.value || !t.done || t.claimed) return;
                claimingCode.value = t.code;
                props.sdk.claimCreditTask(t.code).then(function(res) {
                    if (res && res.success) {
                        toast('任务完成，+' + res.data.reward + ' 积分已到账');
                        refreshEarn();
                    }
                }).catch(function(e) {
                    toast((e && e.message) || '领取失败', 'error');
                }).finally(function() {
                    claimingCode.value = '';
                });
            }

            function buyPackage(p) {
                if (recharging.value) return;
                recharging.value = true;
                props.sdk.createCreditOrder(p.id).then(function(res) {
                    if (!res || !res.success) throw new Error((res && res.message) || '下单失败');
                    const order = res.data;
                    return props.sdk.payCreditOrder(order.order_no).then(function(payRes) {
                        if (payRes && payRes.success) {
                            toast('充值成功，' + (order.points + (order.bonus_points || 0)) + ' 积分已到账');
                            loadWallet();
                        } else {
                            return props.sdk.cancelCreditOrder(order.order_no).catch(function() {})
                                .then(function() { toast('支付渠道即将开放，敬请期待', 'info'); });
                        }
                    });
                }).catch(function(e) {
                    toast(e.message || '充值未完成', 'error');
                }).finally(function() {
                    recharging.value = false;
                });
            }

            function appDisplayName(app) {
                return APP_NAMES[app] || app;
            }

            function moneyLabel(cents) {
                return '¥' + (cents / 100).toFixed(cents % 100 ? 2 : 0);
            }

            function loadWalletTxs() {
                return props.sdk.getPointsTransactions(walletDirection.value, walletPage.value, walletPageSize)
                    .then(function(res) {
                        if (res && res.success) {
                            walletTxs.value = (res.data && res.data.items) || [];
                            walletTotal.value = (res.data && res.data.total) || 0;
                        }
                    });
            }

            function switchWalletDirection(d) {
                walletDirection.value = d;
                walletPage.value = 1;
                loadWalletTxs();
            }

            function walletPageDelta(delta) {
                const maxPage = Math.max(1, Math.ceil(walletTotal.value / walletPageSize));
                const next = walletPage.value + delta;
                if (next < 1 || next > maxPage) return;
                walletPage.value = next;
                loadWalletTxs();
            }

            function txReasonLabel(code) {
                const map = {
                    register_gift: '注册赠送', daily_gift: '每日赠送',
                    consume: 'AI 能力消耗', award: '运营发放', recharge: '充值到账',
                    task_reward: '任务奖励'
                };
                return map[code] || code || '积分变动';
            }

            function chargeModeLabel() {
                const w = wallet.value;
                if (!w) return '';
                return { trial: '体验期', formal: '正式期', off: '免费期' }[w.charge_mode] || '';
            }

            function openWalletTab() {
                tab.value = 'points';
                loadWallet();
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
                showOldPwd, showNewPwd, showConfirmPwd, confirmMismatch,
                bindError, bindTarget, bindCode, bindType, bindSending, bindSubmitting, bindCountdown,
                wallet, walletTxs, walletTotal, walletPage, walletDirection, catalog, meters, walletLoading,
                billing, packages, recharging, claiming, lowBalance, canClaimDaily, isFormal,
                vipBadge, overdraftInfo, monthSaved,
                creditTasks, claimingCode, inviteInfo, inviteCopied,
                copyInviteLink,
                taskMetricLabel, taskRewardLabel, doCheckin, doClaimTask,
                toggleOpen, loadSessions, changePassword, revokeSession, revokeAll, doLogout, gotoDatacenter,
                sendBindCode, submitBind, switchBindType, boundContact,
                avatarName, avatarInitial, deviceLabel, timeLabel,
                loadWallet, loadWalletTxs, switchWalletDirection, walletPageDelta,
                claimDaily, buyPackage, appDisplayName, moneyLabel,
                txReasonLabel, chargeModeLabel, openWalletTab
            };
        },
        template: `
            <div class="nux-user-center">
                <button type="button" class="nux-uc-trigger" :class="{ 'nux-uc-floating': floating, 'nux-uc-active': drawerOpen, 'nux-uc-loading': loading && !user, 'nux-uc-labeled': !!label }" :title="avatarName() || '用户中心'" :aria-label="avatarName() || '用户中心'" @click="toggleOpen">
                    <nux-avatar :name="avatarName()" :initial="avatarInitial()" size="sm"></nux-avatar>
                    <span v-if="label" class="nux-uc-label">{{ label }}</span>
                </button>
                <nux-drawer v-model="drawerOpen" side="right" width="380px">
                    <div class="nux-uc-body">
                        <div class="nux-uc-header">
                            <div class="nux-uc-user">
                                <nux-avatar :name="avatarName()" :initial="avatarInitial()" size="lg"></nux-avatar>
                                <div class="nux-uc-user-meta">
                                    <strong v-if="avatarName()">{{ avatarName() }}</strong>
                                    <span v-if="user && user.email">{{ user.email }}</span>
                                    <span v-else-if="user && user.phone">{{ user.phone }}</span>
                                    <span v-else-if="loading" class="nux-uc-muted">加载中…</span>
                                </div>
                            </div>
                            <button type="button" class="nux-uc-close" @click="drawerOpen = false">×</button>
                        </div>
                        <div v-if="userError" class="nux-login-error">{{ userError }}</div>
                        <div class="nux-uc-tabs">
                            <button :class="['nux-uc-tab', { active: tab === 'profile' }]" type="button" @click="tab = 'profile'">个人资料</button>
                            <button :class="['nux-uc-tab', { active: tab === 'points' }]" type="button" @click="openWalletTab">我的积分</button>
                            <button :class="['nux-uc-tab', { active: tab === 'password' }]" type="button" @click="tab = 'password'">修改密码</button>
                            <button :class="['nux-uc-tab', { active: tab === 'security' }]" type="button" @click="tab = 'security'">安全设置</button>
                            <button :class="['nux-uc-tab', { active: tab === 'sessions' }]" type="button" @click="tab = 'sessions'; loadSessions()">会话管理</button>
                        </div>
                        <div v-if="tab === 'points'" class="nux-uc-pane">
                            <div v-if="walletLoading && !wallet" class="nux-uc-empty">加载中…</div>
                            <template v-else-if="wallet">
                                <div class="nux-wallet-card">
                                    <div class="nux-wallet-balance">
                                        <span class="nux-wallet-amount">{{ wallet.balance }}</span>
                                        <span class="nux-wallet-unit">积分</span>
                                        <span v-if="vipBadge" class="nux-wallet-badge vip">{{ vipBadge }}</span>
                                        <span v-if="chargeModeLabel()" class="nux-wallet-badge">{{ chargeModeLabel() }}</span>
                                    </div>
                                    <div v-if="lowBalance" :class="['nux-wallet-warn', { formal: isFormal }]">
                                        {{ isFormal ? '积分即将用完，正式期余额不足将无法使用 AI 能力' : (overdraftInfo && overdraftInfo.exhausted ? '免费体验额度已用完，每日赠送积分仍可正常使用' : '积分即将用完，明日自动赠送 200 分，体验期内不拦截') }}
                                    </div>
                                    <div class="nux-wallet-gifts">
                                        <span :class="{ done: wallet.register_gift && wallet.register_gift.granted }">
                                            {{ wallet.register_gift ? '注册赠送 ' + wallet.register_gift.amount : '' }}{{ wallet.register_gift && wallet.register_gift.granted ? ' ✓' : '' }}
                                        </span>
                                        <span :class="{ done: wallet.daily_gift && wallet.daily_gift.granted_today }">
                                            {{ wallet.daily_gift ? '每日赠送 ' + wallet.daily_gift.amount : '' }}{{ wallet.daily_gift && wallet.daily_gift.granted_today ? ' · 今日已领 ✓' : '' }}
                                        </span>
                                        <button v-if="canClaimDaily" type="button" class="nux-wallet-claim" :disabled="claiming" @click="claimDaily">
                                            {{ claiming ? '领取中…' : '领取今日积分' }}
                                        </button>
                                    </div>
                                    <div v-if="overdraftInfo" class="nux-wallet-overdraft">
                                        <span>{{ overdraftInfo.exhausted ? '体验授信已用完' : ('体验授信垫付中 ' + overdraftInfo.used + '/' + overdraftInfo.limit + ' 积分') }}</span>
                                        <div class="nux-wallet-bar"><i :style="{ width: overdraftInfo.pct + '%' }"></i></div>
                                    </div>
                                    <div v-if="meters && meters.month" class="nux-wallet-usage">
                                        本月 AI 调用 {{ meters.month.calls || 0 }} 次<span v-if="chargeModeLabel() === '体验期'">（体验期内平台承担）</span>
                                    </div>
                                </div>
                                <div v-if="wallet.growth" class="nux-wallet-block nux-wallet-growth">
                                    <div class="nux-uc-sessions-head"><span>成长等级</span><span class="nux-wallet-sum">累计消费 {{ wallet.growth.growth_value }} 积分</span></div>
                                    <div class="nux-wallet-growth-row">
                                        <span class="nux-wallet-badge growth">{{ wallet.growth.level_code }} · {{ wallet.growth.level_name }}</span>
                                        <span v-if="wallet.growth.daily_gift_bonus" class="nux-wallet-growth-bonus">每日赠送 +{{ wallet.growth.daily_gift_bonus }}</span>
                                        <span v-else class="nux-wallet-sum">消费满 {{ wallet.growth.next_level ? wallet.growth.next_level.threshold : '—' }} 分升级</span>
                                    </div>
                                    <div class="nux-wallet-bar"><i :style="{ width: (wallet.growth.progress || 0) + '%' }"></i></div>
                                    <div v-if="wallet.growth.next_level" class="nux-wallet-sum">
                                        再消费 {{ Math.max(0, wallet.growth.next_level.threshold - wallet.growth.growth_value) }} 积分升 {{ wallet.growth.next_level.level_code }} · {{ wallet.growth.next_level.level_name }}<span v-if="wallet.growth.next_level.daily_gift_bonus">，每日赠送涨至 +{{ wallet.growth.next_level.daily_gift_bonus }}</span>
                                    </div>
                                </div>
                                <template v-if="creditTasks.length">
                                    <div class="nux-wallet-block">
                                        <div class="nux-uc-sessions-head"><span>赚积分</span><span class="nux-wallet-sum">与每日保底赠送叠加</span></div>
                                        <div class="nux-wallet-tasks">
                                            <div v-for="t in creditTasks" :key="t.code" :class="['nux-wallet-task', { ready: t.done && !t.claimed, claimed: t.claimed }]">
                                                <div class="nux-wallet-task-row">
                                                    <div class="nux-wallet-task-main">
                                                        <b>{{ t.title }}</b>
                                                        <span v-if="t.metric === 'checkin'" class="nux-wallet-task-desc">
                                                            {{ t.claimed ? '今日已签 · 连续 ' + t.streak + ' 天' : (t.streak ? '已连续 ' + t.streak + ' 天，今天别断' : '连续签到奖励递增') }}
                                                        </span>
                                                        <span v-else class="nux-wallet-task-desc">{{ taskMetricLabel(t) }}</span>
                                                    </div>
                                                    <span class="nux-wallet-task-reward">{{ taskRewardLabel(t) }}</span>
                                                    <button v-if="t.metric === 'checkin' && !t.claimed" type="button" class="nux-wallet-claim" :disabled="claimingCode === 'checkin'" @click="doCheckin">
                                                        {{ claimingCode === 'checkin' ? '签到中…' : '签到' }}
                                                    </button>
                                                    <button v-else-if="t.metric !== 'checkin' && t.done && !t.claimed" type="button" class="nux-wallet-claim" :disabled="claimingCode === t.code" @click="doClaimTask(t)">
                                                        {{ claimingCode === t.code ? '领取中…' : '领取' }}
                                                    </button>
                                                    <span v-else-if="t.claimed" class="nux-wallet-task-ok">已领 ✓</span>
                                                </div>
                                                <div v-if="t.metric !== 'checkin'" class="nux-wallet-bar"><i :style="{ width: Math.min(100, Math.round(t.current * 100 / t.target)) + '%' }"></i></div>
                                            </div>
                                        </div>
                                    </div>
                                </template>
                                <div v-if="inviteInfo && inviteInfo.code" class="nux-wallet-block">
                                    <div class="nux-uc-sessions-head"><span>邀请好友</span><span class="nux-wallet-sum">双方都得积分</span></div>
                                    <div class="nux-wallet-invite">
                                        <span class="nux-wallet-invite-code">{{ inviteInfo.code }}</span>
                                        <button type="button" class="nux-wallet-claim" @click="copyInviteLink">{{ inviteCopied ? '已复制 ✓' : '复制邀请链接' }}</button>
                                    </div>
                                    <div class="nux-wallet-sum">好友注册填你的邀请码：TA 得 {{ inviteInfo.invitee_points }} 分，TA 首次消费你再得 {{ inviteInfo.referrer_points }} 分（最多 {{ inviteInfo.max_invitees }} 人）。已邀请 {{ inviteInfo.invited_count }} 人<span v-if="inviteInfo.rewarded_count"> · {{ inviteInfo.rewarded_count }} 人已发奖</span></div>
                                </div>
                                <div v-if="billing && billing.by_app && billing.by_app.length" class="nux-wallet-block">
                                    <div class="nux-uc-sessions-head"><span>消费汇总</span><span class="nux-wallet-sum">本月 {{ billing.month_cost || 0 }} · 累计 {{ billing.total_cost || 0 }} 积分<span v-if="monthSaved" class="nux-wallet-saved"> · 已省 {{ monthSaved }}</span></span></div>
                                    <div class="nux-wallet-apps">
                                        <div v-for="b in billing.by_app" :key="b.app" class="nux-wallet-app">
                                            <div class="nux-wallet-app-row">
                                                <span>{{ appDisplayName(b.app) }}</span>
                                                <b>{{ b.cost }} 积分<i>/ {{ b.count }} 次</i></b>
                                            </div>
                                            <div class="nux-wallet-bar"><i :style="{ width: Math.min(100, b.ratio) + '%' }"></i></div>
                                        </div>
                                    </div>
                                </div>
                                <template v-if="isFormal && packages.length">
                                    <div class="nux-uc-divider"></div>
                                    <div class="nux-uc-sessions-head"><span>充值</span></div>
                                    <div class="nux-wallet-packages">
                                        <button v-for="p in packages" :key="p.id" type="button" class="nux-wallet-package" :disabled="recharging" @click="buyPackage(p)">
                                            <b>{{ p.points + (p.bonus_points || 0) }} 积分</b>
                                            <span v-if="p.bonus_points" class="nux-wallet-bonus">含赠 {{ p.bonus_points }}</span>
                                            <i>{{ moneyLabel(p.price_cents) }}</i>
                                        </button>
                                    </div>
                                </template>
                                <div class="nux-uc-sessions-head nux-wallet-tx-head">
                                    <div class="nux-login-subtabs nux-wallet-filter">
                                        <button :class="['nux-login-subtab', { active: walletDirection === 'all' }]" type="button" @click="switchWalletDirection('all')">全部</button>
                                        <button :class="['nux-login-subtab', { active: walletDirection === 'income' }]" type="button" @click="switchWalletDirection('income')">收入</button>
                                        <button :class="['nux-login-subtab', { active: walletDirection === 'expense' }]" type="button" @click="switchWalletDirection('expense')">支出</button>
                                    </div>
                                </div>
                                <div v-if="!walletTxs.length" class="nux-uc-empty">暂无积分流水</div>
                                <div v-else class="nux-uc-session-list">
                                    <div v-for="t in walletTxs" :key="t.id" class="nux-uc-session">
                                        <div class="nux-uc-session-meta">
                                            <b>{{ txReasonLabel(t.reason_code) }}</b>
                                            <span>{{ t.description || (t.app ? '应用 ' + t.app : '') }} · {{ timeLabel(t.created_at) }}</span>
                                        </div>
                                        <b :class="t.amount > 0 ? 'nux-wallet-in' : 'nux-wallet-out'">{{ t.amount > 0 ? '+' : '' }}{{ t.amount }}</b>
                                    </div>
                                </div>
                                <div v-if="walletTotal > walletPageSize" class="nux-wallet-pager">
                                    <button type="button" class="nux-link" :disabled="walletPage <= 1" @click="walletPageDelta(-1)">上一页</button>
                                    <span>{{ walletPage }} / {{ Math.ceil(walletTotal / walletPageSize) }}</span>
                                    <button type="button" class="nux-link" :disabled="walletPage >= Math.ceil(walletTotal / walletPageSize)" @click="walletPageDelta(1)">下一页</button>
                                </div>
                                <template v-if="catalog && catalog.items && catalog.items.length">
                                    <div class="nux-uc-divider"></div>
                                    <div class="nux-uc-sessions-head"><span>AI 能力定价</span></div>
                                    <div class="nux-wallet-prices">
                                        <div v-for="p in catalog.items" :key="p.app + '/' + p.feature" class="nux-wallet-price">
                                            <span>{{ p.description || p.feature }}</span>
                                            <b>{{ p.cost }} 积分/次</b>
                                        </div>
                                    </div>
                                </template>
                                <div class="nux-uc-divider"></div>
                                <div class="nux-wallet-rules">
                                    <b>积分规则</b>
                                    <p>获取：注册赠 {{ wallet.register_gift ? wallet.register_gift.amount : 1000 }} 分；每日自动赠 {{ wallet.daily_gift ? wallet.daily_gift.amount : 200 }} 分<span v-if="wallet.growth && wallet.growth.daily_gift_bonus">（含成长等级 +{{ wallet.growth.daily_gift_bonus }}）</span>；签到与任务可再赚{{ isFormal ? '；也可充值补充' : '' }}。</p>
                                    <p>消耗：调用 AI 能力按上方目录价扣积分，旗舰模型 ×2、轻量模型 ×0.5、标准模型 ×1，按应用记录在消费汇总；消费累计越多成长等级越高。</p>
                                    <p v-if="!isFormal">当前为体验期：余额不足时由平台垫付（体验授信 {{ wallet.overdraft && wallet.overdraft.limit ? wallet.overdraft.limit + ' 分' : '有限额度' }}），授信用完后每日赠送积分仍可正常使用；正式计费开启前会提前通知。</p>
                                    <p v-else>当前为正式期：余额不足时将无法使用 AI 能力，请及时充值。</p>
                                </div>
                            </template>
                        </div>
                        <div v-if="tab === 'profile'" class="nux-uc-pane">
                            <div class="nux-uc-info">
                                <div class="nux-uc-info-row"><span>用户名</span><b>{{ (user && user.username) || '—' }}</b></div>
                                <div class="nux-uc-info-row"><span>邮箱</span><b>{{ (user && user.email) || '—' }}</b></div>
                                <div class="nux-uc-info-row"><span>手机号</span><b>{{ (user && user.phone) || '—' }}</b></div>
                            </div>
                            <button type="button" class="nux-uc-logout" @click="doLogout">退出登录</button>
                            <div class="nux-uc-divider"></div>
                            <button type="button" class="nux-uc-action" @click="gotoDatacenter">我的数据中心</button>
                        </div>
                        <div v-if="tab === 'password'" class="nux-uc-pane">
                            <div v-if="passwordError" class="nux-login-error">{{ passwordError }}</div>
                            <div class="nux-form-group">
                                <label class="nux-form-label">当前密码</label>
                                <div class="nux-password-wrap">
                                    <input v-model="oldPassword" :type="showOldPwd ? 'text' : 'password'" class="nux-input" placeholder="请输入当前密码" autocomplete="current-password">
                                    <button type="button" class="nux-password-toggle" :aria-label="showOldPwd ? '隐藏密码' : '显示密码'" @click="showOldPwd = !showOldPwd">
                                        <svg v-if="!showOldPwd" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                        <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                    </button>
                                </div>
                            </div>
                            <div class="nux-form-group">
                                <label class="nux-form-label">新密码</label>
                                <div class="nux-password-wrap">
                                    <input v-model="newPassword" :type="showNewPwd ? 'text' : 'password'" class="nux-input" placeholder="请输入新密码（至少8位，含字母和数字）" autocomplete="new-password">
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
                                <div v-if="confirmMismatch" class="nux-live-hint">两次输入的新密码不一致</div>
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
