(function() {
    const { ref, computed, onMounted, onUnmounted } = Vue;

    const TYPE_ICONS = {
        message: 'fa-regular fa-comment',
        comment: 'fa-regular fa-comment',
        order: 'fa-solid fa-cart-shopping',
        trade: 'fa-solid fa-cart-shopping',
        system: 'fa-solid fa-circle-info',
        alert: 'fa-solid fa-triangle-exclamation',
        follow: 'fa-solid fa-user-plus',
        like: 'fa-solid fa-heart',
        task: 'fa-solid fa-list-check',
        approval: 'fa-solid fa-file-signature'
    };

    const NuxNotificationBell = {
        name: 'NuxNotificationBell',
        props: {
            notifyBaseUrl: { type: String, default: '/api/notify' },
            viewAllUrl: { type: String, default: '/notifications' },
            pollInterval: { type: Number, default: 60000 }
        },
        emits: ['view-all', 'notification-click'],
        setup(props, { emit }) {
            const { isMobile } = useMobile();
            const open = ref(false);
            const bellRef = ref(null);
            let pollTimer = null;

            const notif = useNotification({ baseUrl: props.notifyBaseUrl });
            notif.onNotification((n) => {
                notif.unreadCount.value++;
                if (open.value) {
                    notif.notifications.value.unshift(n);
                    if (notif.notifications.value.length > 10) notif.notifications.value.pop();
                }
            });

            const displayCount = computed(() => {
                return notif.unreadCount.value > 99 ? '99+' : notif.unreadCount.value;
            });

            const typeIcon = (type) => TYPE_ICONS[type] || 'fa-regular fa-bell';
            const contentSummary = (content) => {
                if (!content) return '';
                return NexusUtils.truncateText(content, 50);
            };
            const formatTime = (ts) => NexusUtils.formatRelativeTime(ts);

            const loadList = async () => {
                await notif.getList({ page: 1, page_size: 10 });
            };

            const togglePanel = async () => {
                open.value = !open.value;
                if (open.value) await loadList();
            };

            const handleClick = async (item) => {
                if (!item.is_read) await notif.markRead(item.id);
                emit('notification-click', item);
                open.value = false;
                if (item.link) window.location.href = item.link;
            };

            const handleMarkAllRead = async () => {
                try {
                    await notif.markAllRead();
                    if (window.showToast) window.showToast('已全部标记为已读', 'success');
                } catch (e) {
                    if (window.showToast) window.showToast('操作失败，请重试', 'error');
                }
            };

            const handleViewAll = () => {
                open.value = false;
                emit('view-all');
                if (props.viewAllUrl) window.location.href = props.viewAllUrl;
            };

            const handleClickOutside = (e) => {
                if (bellRef.value && !bellRef.value.contains(e.target)) open.value = false;
            };

            onMounted(() => {
                notif.getUnreadCount();
                pollTimer = setInterval(() => notif.getUnreadCount(), props.pollInterval);
                notif.connectSSE();
                document.addEventListener('click', handleClickOutside);
            });

            onUnmounted(() => {
                if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
                notif.disconnectSSE();
                document.removeEventListener('click', handleClickOutside);
            });

            return {
                open, bellRef, isMobile, displayCount,
                notifications: notif.notifications,
                unreadCount: notif.unreadCount,
                loading: notif.loading,
                togglePanel, handleClick, handleMarkAllRead, handleViewAll,
                typeIcon, contentSummary, formatTime
            };
        },
        template: `
            <div class="nux-notif-bell" ref="bellRef">
                <button class="nux-notif-btn" @click="togglePanel" aria-label="通知">
                    <i class="fa-regular fa-bell"></i>
                    <span v-if="unreadCount > 0" class="nux-notif-badge">{{ displayCount }}</span>
                </button>
                <transition name="nux-notif-panel">
                    <div v-if="open" :class="['nux-notif-panel', { 'nux-notif-fullscreen': isMobile }]">
                        <div class="nux-notif-header">
                            <span class="nux-notif-title">通知</span>
                            <button v-if="unreadCount > 0" class="nux-notif-readall" @click="handleMarkAllRead">全部已读</button>
                        </div>
                        <div class="nux-notif-list">
                            <div v-if="loading" class="nux-notif-loading"><span class="nx-spinner"></span></div>
                            <div v-else-if="notifications.length === 0" class="nux-notif-empty">
                                <i class="fa-regular fa-bell-slash nux-notif-empty-icon"></i>
                                <span>暂无通知</span>
                            </div>
                            <div v-else v-for="item in notifications" :key="item.id"
                                 :class="['nux-notif-item', { 'is-unread': !item.is_read }]"
                                 @click="handleClick(item)">
                                <span class="nux-notif-icon"><i :class="typeIcon(item.type)"></i></span>
                                <div class="nux-notif-body">
                                    <div class="nux-notif-item-title">{{ item.title }}</div>
                                    <div class="nux-notif-item-content">{{ contentSummary(item.content) }}</div>
                                    <div class="nux-notif-item-time">{{ formatTime(item.created_at) }}</div>
                                </div>
                                <span v-if="!item.is_read" class="nux-notif-dot"></span>
                            </div>
                        </div>
                        <div class="nux-notif-footer">
                            <a class="nux-notif-viewall" href="javascript:void(0)" @click="handleViewAll">查看全部</a>
                        </div>
                    </div>
                </transition>
            </div>
        `
    };

    window.NuxNotificationBell = NuxNotificationBell;
})();
