(function () {
    'use strict';

    var COMPONENTS = {
        'nux-about-page': 'NuxAboutPage',
        'nux-accordion': 'NuxAccordion',
        'nux-agreement-modal': 'NuxAgreementModal',
        'nux-ai-badge': 'NuxAiBadge',
        'nux-ai-chat': 'NuxAiChat',
        'nux-ai-indicator': 'NuxAiIndicator',
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
        'nux-calendar': 'NuxCalendar',
        'nux-checkbox': 'NuxCheckbox',
        'nux-checkin': 'NuxCheckin',
        'nux-chip-group': 'NuxChipGroup',
        'nux-clarify-card': 'NuxClarifyCard',
        'nux-confirm': 'NuxConfirm',
        'nux-conversation-list': 'NuxConversationList',
        'nux-crud-page': 'NuxCrudPage',
        'nux-data-table': 'NuxDataTable',
        'nux-drawer': 'NuxDrawer',
        'nux-empty': 'NuxEmpty',
        'nux-empty-state': 'NuxEmptyState',
        'nux-error-state': 'NuxErrorState',
        'nux-export-button': 'NuxExportButton',
        'nux-footer': 'NuxFooter',
        'nux-forgot-password': 'NuxForgotPassword',
        'nux-form-group': 'NuxFormGroup',
        'nux-grid': 'NuxGrid',
        'nux-history-list': 'NuxHistoryList',
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
        'nux-plan-progress': 'NuxPlanProgress',
        'nux-portal-footer': 'NuxPortalFooter',
        'nux-poster': 'NuxPoster',
        'nux-progress': 'NuxProgress',
        'nux-radar-chart': 'NuxRadarChart',
        'nux-register-page': 'NuxRegisterPage',
        'nux-result-view': 'NuxResultView',
        'nux-search-box': 'NuxSearchBox',
        'nux-section': 'NuxSection',
        'nux-segmented': 'NuxSegmented',
        'nux-select': 'NuxSelect',
        'nux-selection-bar': 'NuxSelectionBar',
        'nux-settings-drawer': 'NuxSettingsDrawer',
        'nux-side-panel': 'NuxSidePanel',
        'nux-skeleton': 'NuxSkeleton',
        'nux-stat-card': 'NuxStatCard',
        'nux-steps': 'NuxSteps',
        'nux-switch': 'NuxSwitch',
        'nux-tab-group': 'NuxTabGroup',
        'nux-textarea': 'NuxTextarea',
        'nux-toast': 'NuxToast',
        'nux-undo-toast': 'NuxUndoToast',
        'nux-unlock': 'NuxUnlock',
        'nux-user-center': 'NuxUserCenter'
    };

    var HELPERS = {
        'NuxAiChatHelpers': 'AI 对话工具集（features/input/roles、键盘高度、富事件路由）',
        'NuxAiChatTemplate': 'AI 对话组件模板字符串',
        'NuxFloatAbout': '悬浮关于入口（自动挂载，无需注册）',
        'NuxFloatUserCenter': '悬浮用户中心（init/configure/destroy，非 Vue 组件）',
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
        if (!opts.silent && missing.length && window.console) {
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
