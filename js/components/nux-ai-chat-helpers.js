(function () {
    'use strict';
    window.NuxAiChatHelpers = {
        defaultFeatures: {
            stopButton: true,
            streamFallback: true,
            scrollToBottomButton: true,
            smartScroll: true,
            typingIndicator: true,
            messageCopy: true,
            aiTag: true,
            timestamp: false,
            keyboardAvoid: true,
            richReasoning: true,
            richTools: true,
            richReferences: true
        },
        defaultInput: {
            enterToSend: true,
            shiftEnterNewline: true,
            autoResize: true,
            maxLength: 4000,
            rateLimit: 0,
            checkComposing: true,
            maxRows: 6
        },
        defaultRoles: {
            user: { avatar: '🧑', label: '我' },
            assistant: { avatar: '🤖', label: 'AI助手', aiTag: true }
        },
        scrollToBottomEl: function (el, smooth) {
            if (!el) return;
            el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
        },
        isNearBottom: function (el, threshold) {
            if (!el) return true;
            return el.scrollHeight - el.scrollTop - el.clientHeight < (threshold || 150);
        },
        getKeyboardHeight: function () {
            if (!window.visualViewport) return 0;
            const diff = window.innerHeight - window.visualViewport.height;
            return diff > 80 ? diff : 0;
        },
        mountKeyboard: function (enabled, kbRef, onOpen) {
            const vv = window.visualViewport;
            if (!enabled || !vv || !kbRef) return function () {};
            const sync = function () {
                const kb = window.NuxAiChatHelpers.getKeyboardHeight();
                if (kb !== kbRef.value) {
                    kbRef.value = kb;
                    if (kb > 0 && onOpen) onOpen();
                }
            };
            vv.addEventListener('resize', sync);
            window.addEventListener('resize', sync);
            return function () {
                vv.removeEventListener('resize', sync);
                window.removeEventListener('resize', sync);
            };
        },
        routeRichEvent: function (msg, event, data) {
            const payload = data || {};
            const type = String(event || payload.type || '').toLowerCase();
            let handled = true;
            if (type === 'meta') {
                msg.meta = payload;
            } else if (type === 'thinking') {
                msg.thinking = (msg.thinking || '') + (payload.content || payload.thinking || '');
            } else if (type === 'tool' || type === 'tool_executed') {
                const tools = msg.tools || (msg.tools = []);
                const label = payload.display_name || payload.name || payload.tool;
                if (label) tools.push(label);
            } else if (type === 'references' || type === 'reference') {
                msg.references = payload.references || payload.items || [];
            } else {
                handled = false;
            }
            return handled;
        }
    };
})();