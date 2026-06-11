(function() {
    const utils = {
        formatDate(dateString, options = {}) {
            if (!dateString) return '';
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) return '';
                return date.toLocaleString('zh-CN', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                    ...options
                });
            } catch (e) { return ''; }
        },

        formatDateShort(dateString) {
            return this.formatDate(dateString, { hour: undefined, minute: undefined });
        },

        formatCurrency(amount) {
            if (amount === undefined || amount === null || isNaN(amount)) return '¥0';
            return '¥' + Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
        },

        formatNumber(num, decimals = 2) {
            if (num === undefined || num === null || isNaN(num)) return '0';
            return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        },

        truncateText(text, maxLength = 100) {
            if (!text) return '';
            if (text.length <= maxLength) return text;
            return text.substring(0, maxLength) + '...';
        },

        debounce(func, wait) {
            let timeout;
            return function(...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        },

        throttle(func, limit) {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substring(2);
        },

        deepClone(obj) {
            return JSON.parse(JSON.stringify(obj));
        },

        downloadFile(content, filename, mimeType = 'text/plain') {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        },

        formatPhone(phone) {
            if (!phone || phone.length < 7) return phone || '';
            return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4);
        },

        formatMsg(content) {
            if (!content) return '';
            let html = content
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                .replace(/^- (.+)$/gm, '<li>$1</li>')
                .replace(/\n/g, '<br>');
            html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
            html = html.replace(/<\/ul><ul>/g, '');
            return html;
        },

        autoResize(el) {
            if (!el) return;
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        },

        pick(obj, keys) {
            const result = {};
            keys.forEach(key => { if (key in obj) result[key] = obj[key]; });
            return result;
        },

        omit(obj, keys) {
            const result = { ...obj };
            keys.forEach(key => delete result[key]);
            return result;
        },

        setViewportHeight() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--nx-vh', `${vh}px`);
        }
    };

    utils.setViewportHeight();
    window.addEventListener('resize', utils.debounce(utils.setViewportHeight, 100));

    window.NexusUtils = utils;
})();
