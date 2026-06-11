(function() {
    const { ref, onUnmounted } = Vue;

    const useSSE = (options = {}) => {
        const status = ref('disconnected');
        const data = ref(null);
        let eventSource = null;
        let reconnectTimer = null;
        let reconnectAttempts = 0;
        const maxReconnect = options.maxReconnect || 5;
        const reconnectInterval = options.reconnectInterval || 3000;

        const connect = (url) => {
            disconnect();
            status.value = 'connecting';
            try {
                eventSource = new EventSource(url);
                eventSource.onopen = () => { status.value = 'connected'; reconnectAttempts = 0; };
                eventSource.onmessage = (e) => {
                    try { data.value = JSON.parse(e.data); } catch { data.value = e.data; }
                    if (options.onMessage) options.onMessage(data.value);
                };
                if (options.events) {
                    Object.entries(options.events).forEach(([name, handler]) => {
                        eventSource.addEventListener(name, (e) => {
                            try { handler(JSON.parse(e.data)); } catch { handler(e.data); }
                        });
                    });
                }
                eventSource.onerror = () => {
                    status.value = 'disconnected';
                    eventSource.close();
                    eventSource = null;
                    if (reconnectAttempts < maxReconnect) {
                        reconnectAttempts++;
                        reconnectTimer = setTimeout(() => connect(url), reconnectInterval * reconnectAttempts);
                    }
                };
            } catch (e) { status.value = 'disconnected'; }
        };

        const disconnect = () => {
            if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
            if (eventSource) { eventSource.close(); eventSource = null; }
            status.value = 'disconnected';
            reconnectAttempts = 0;
        };

        onUnmounted(disconnect);

        return { status, data, connect, disconnect };
    };

    window.useSSE = useSSE;
})();
