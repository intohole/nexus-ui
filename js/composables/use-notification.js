(function() {
    const { ref, onUnmounted } = Vue;

    // 通知数据/轮询/SSE 的唯一实现在 NexusNotification（js/notification.js），
    // 本组合式函数只做 Vue 响应式绑定，不再自行维护第二套请求与重连逻辑。
    const useNotification = (options = {}) => {
        const ownManager = !options.manager;
        const manager = options.manager || new window.NexusNotification({
            baseUrl: options.baseUrl || window.NOTIFY_BASE_URL || '/api/notify',
            tokenKey: options.tokenKey || 'token',
            onNotification: options.onNotification || null,
        });

        const notifications = ref([]);
        const unreadCount = ref(0);
        const loading = ref(false);
        const total = ref(0);

        const reflect = () => {
            notifications.value = manager.getNotifications();
            unreadCount.value = manager.getUnread();
        };

        manager.on('*', reflect);

        const getList = async (params = {}) => {
            loading.value = true;
            try {
                const resp = await manager.getList(params);
                total.value = resp.total || 0;
                reflect();
                return resp;
            } finally {
                loading.value = false;
            }
        };

        const getUnreadCount = async () => {
            const count = await manager.getUnreadCount();
            reflect();
            return count;
        };

        const markRead = async (id) => {
            await manager.markRead(id);
            reflect();
            return true;
        };

        const markAllRead = async () => {
            await manager.markAllRead();
            reflect();
            return true;
        };

        const deleteNotification = async (id) => {
            await manager.deleteNotification(id);
            reflect();
            return true;
        };

        const onNotification = (cb) => { manager.on('notification', cb); };

        const disconnectSSE = () => { manager.disconnectSSE(); };
        const connectSSE = () => { manager.connectSSE(); };

        onUnmounted(() => {
            manager.off('*', reflect);
            if (ownManager) manager.stop();
        });

        return {
            notifications, unreadCount, loading, total,
            getList, getUnreadCount, markRead, markAllRead, deleteNotification,
            connectSSE, disconnectSSE, onNotification
        };
    };

    window.useNotification = useNotification;
})();
