(function () {
    'use strict';
    const NuxRegisterPage = {
        name: 'NuxRegisterPage',
        inheritAttrs: false,
        props: {},
        emits: [],
        setup() {
            return {};
        },
        template: `
            <div class="nux-register-page">
                <div class="nux-register-inner">
                    <nux-login-page v-bind="$attrs" :default-mode="'register'" :use-custom-register="false"></nux-login-page>
                </div>
                <style>
                    .nux-register-page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 16px;
                        box-sizing:border-box;background:linear-gradient(160deg,#eef2f7 0%,#e2e8f0 55%,#cbd5e1 100%);}
                    .nux-register-inner{width:100%;max-width:520px;animation:nux-register-in .45s ease-out;}
                    @keyframes nux-register-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
                </style>
            </div>
        `
    };
    window.NuxRegisterPage = NuxRegisterPage;
})();