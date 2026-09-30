(function () {
    'use strict';

    var COMPONENTS = {
        'nux-about-page': 'NuxAboutPage',
        'nux-accordion': 'NuxAccordion',
        'nux-ai-badge': 'NuxAiBadge',
        'nux-ai-chat': 'NuxAiChat',
        'nux-ai-indicator': 'NuxAiIndicator',
        'nux-ai-notice': 'NuxAiNotice',
        'nux-ai-task-progress': 'NuxAiTaskProgress',
        'nux-ai-widgets': 'NuxAiWidgets',
        'nux-app-card': 'NuxAppCard',
        'nux-app-switcher': 'NuxAppSwitcher',
        'nux-automation': 'NuxAutomation',
        'nux-avatar': 'NuxAvatar',
        'nux-backtop': 'NuxBacktop',
        'nux-badge': 'NuxBadge',
        'nux-bottom-nav': 'NuxBottomNav',
        'nux-breadcrumb': 'NuxBreadcrumb',
        'nux-button': 'NuxButton',
        'nux-camera-recognize': 'NuxCameraRecognize',
        'nux-calendar': 'NuxCalendar',
        'nux-checkbox': 'NuxCheckbox',
        'nux-radio-group': 'NuxRadioGroup',
        'nux-checkin': 'NuxCheckin',
        'nux-chip-group': 'NuxChipGroup',
        'nux-clarify-card': 'NuxClarifyCard',
        'nux-conversation-list': 'NuxConversationList',
        'nux-date-picker': 'NuxDatePicker',
        'nux-drawer': 'NuxDrawer',
        'nux-empty-state': 'NuxEmptyState',
        'nux-error-state': 'NuxErrorState',
        'nux-file-upload': 'NuxFileUpload',
        'nux-footer': 'NuxFooter',
        'nux-forgot-password': 'NuxForgotPassword',
        'nux-form-group': 'NuxFormGroup',
        'nux-icon': 'NuxIcon',
        'nux-infinite-scroll': 'NuxInfiniteScroll',
        'nux-input': 'NuxInput',
        'nux-layout-sidebar': 'NuxLayoutSidebar',
        'nux-layout-topnav': 'NuxLayoutTopNav',
        'nux-loading': 'NuxLoading',
        'nux-login-page': 'NuxLoginPage',
        'nux-menu-about': 'NuxMenuAbout',
        'nux-menu-user': 'NuxMenuUser',
        'nux-modal': 'NuxModal',
        'nux-notification-bell': 'NuxNotificationBell',
        'nux-notification-panel': 'NuxNotificationPanel',
        'nux-onboarding': 'NuxOnboarding',
        'nux-onboarding-strip': 'NuxOnboardingStrip',
        'nux-pagination': 'NuxPagination',
        'nux-portal-footer': 'NuxPortalFooter',
        'nux-poster': 'NuxPoster',
        'nux-progress': 'NuxProgress',
        'nux-qrcode': 'NuxQrcode',
        'nux-radar-chart': 'NuxRadarChart',
        'nux-result-view': 'NuxResultView',
        'nux-search-box': 'NuxSearchBox',
        'nux-section': 'NuxSection',
        'nux-segmented': 'NuxSegmented',
        'nux-input-number': 'NuxInputNumber',
        'nux-select': 'NuxSelect',
        'nux-selection-bar': 'NuxSelectionBar',
        'nux-settings-drawer': 'NuxSettingsDrawer',
        'nux-side-panel': 'NuxSidePanel',
        'nux-skeleton': 'NuxSkeleton',
        'nux-slider': 'NuxSlider',
        'nux-sortable': 'NuxSortable',
        'nux-stat-card': 'NuxStatCard',
        'nux-swipe-actions': 'NuxSwipeActions',
        'nux-switch': 'NuxSwitch',
        'nux-tab-group': 'NuxTabGroup',
        'nux-tag': 'NuxTag',
        'nux-textarea': 'NuxTextarea',
        'nux-theme-toggle': 'NuxThemeToggle',
        'nux-undo-toast': 'NuxUndoToast',
        'nux-user-center': 'NuxUserCenter',
        'nux-voice-input': 'NuxVoiceInput'
    };

    var HELPERS = {
        'NuxAiChatHelpers': 'AI 对话工具集（features/input/roles、键盘高度、富事件路由）',
        'NuxAiChatTemplate': 'AI 对话组件模板字符串',
        'NuxAiWidgetsRegistry': 'AI 消息内组件渲染器注册表（register(type, def, icon)，供 nux-ai-widgets-rich 等扩展）',
        'nux-ai-widgets-rich.js': 'AI 消息内增强组件（form/chart/confirm），仅向 NuxAiWidgetsRegistry 注册类型并注入样式，无独立全局导出',
        'NuxLoginHelpers': '登录页工具集（验证码/SMS 状态机、协议勾选、忘记密码动态加载）',
        'NuxLoginPageTemplate': '登录页模板字符串',
        'NuxRadarDraw': '雷达图 Canvas 绘制引擎（静态方法）',
        'PosterRender': '海报渲染引擎（px/elementStyle/buildInner/capture/download）'
    };

    var isComponent = function (def) {
        return !!def && typeof def === 'object' && !!(def.template || def.render || def.setup);
    };

    var register = function (app, options) {
        var opts = options || {};
        var registered = [];
        var missing = [];
        if (!app || typeof app.component !== 'function') {
            if (!opts.silent && window.console) window.console.warn('[NexusComponents] 需要传入 Vue app 实例');
            return registered;
        }
        Object.keys(COMPONENTS).forEach(function (tag) {
            var def = window[COMPONENTS[tag]];
            if (isComponent(def)) {
                app.component(tag, def);
                registered.push(tag);
            } else {
                missing.push(tag);
            }
        });
        if (opts.warnMissing && missing.length && window.console) {
            window.console.warn('[NexusComponents] 以下组件脚本未加载，已跳过: ' + missing.join(', '));
        }
        return registered;
    };

    window.NexusComponents = {
        register: register,
        components: COMPONENTS,
        helpers: HELPERS,
        list: function () { return Object.keys(COMPONENTS); }
    };
})();
