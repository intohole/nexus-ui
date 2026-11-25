/* NexusStop —— 「停止/取消 AI 生成」原语（前21，六仓手搓形态的单源收编）
 *
 * 收编的公约数语义（出现 ≥3 仓）：seq 代际闸（旧流迟到帧/回调不得污染新轮，
 * suki askSeq 型防假停）、停止通道（registerStop 契约→controller 兜底）、
 * 服务端取消钩子（smartCode interrupt/verseCraft cancelTask/arcade cancel 同构）、
 * stopping 中间态（「停止中…」可 await 收尾，verseCraft/arcade 形态）、
 * 终态四态分类与文案收敛点（suki 四态签名行收编）。
 *
 * 承诺语义（评审裁定）：终态状态机与渲染收敛点单源；
 * 文案 = 平台默认单源 + 宿主 notes 覆盖（notes 四键见 DEFAULT_NOTES）。
 *
 * 用法（流式宿主）:
 *   const stopper = NexusStop.create({ cancelRequest: () => api.post('/chat/interrupt') });
 *   const seq = stopper.begin();                    // 每轮开始取代际
 *   if (!stopper.isCurrent(seq)) return;            // 迟到回调顶部拒收
 *   stopper.onStopFn(fn);                           // registerStop 契约
 *   stopper.stop();                                 // 用户停止：stopFn→controller→cancelRequest
 *   msg._stoppedNote = stopper.noteFor(stopper.classify(!!msg.content));
 *
 * 长任务宿主（服务端收尾型）:
 *   stopper.stop(); await stopper.waitSettled();    // stopping 态可 await（settleTimeoutMs 兜底）
 */
(function() {
    'use strict';
    if (window.NexusStop) return;

    /* 平台默认文案（源出 suki 四态签名行措辞，f18 全等断言实证）；宿主 notes 同键覆盖 */
    var DEFAULT_NOTES = {
        stoppedPartial: '已停止 · 以上是停止前已生成的部分',
        stoppedEmpty: '你已停止了这次提问',
        interrupted: '连接中断 · 以上是已收到的部分',
        lost: '这条提问没有保留回答（可能被停止或未完成）'
    };

    window.NexusStop = {
        DEFAULT_NOTES: DEFAULT_NOTES,
        create: function(cfg) {
            cfg = cfg || {};
            var notes = Object.assign({}, DEFAULT_NOTES, cfg.notes || {});
            var stopFn = cfg.stopFn || null;
            var controller = null;
            var seq = 0;
            var stopping = false;
            var settleTimer = null;
            var settleWaiters = null;
            var settleTimeoutMs = cfg.settleTimeoutMs || 8000;

            /* 代际闸：begin 于每轮启动调用并捕获返回值；迟到回调以 isCurrent 拒收 */
            function begin() {
                seq += 1;
                stopping = false;
                if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
                return seq;
            }

            function isCurrent(s) { return s === seq; }

            /* 停止通道：registerStop 契约（stopFn 优先）→ controller.stop() 兜底 */
            function onStopFn(fn) { stopFn = fn || null; }
            function attach(ctrl) { controller = ctrl || null; }

            function finish() {
                stopping = false;
                if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
                if (settleWaiters) {
                    var ws = settleWaiters;
                    settleWaiters = null;
                    ws.forEach(function (r) { r(); });
                }
            }

            function stop() {
                if (stopping) return;
                stopping = true;
                /* 停止即作废当前代际（suki askSeq 语义）：迟到帧/迟到回调即刻失效，
                 * 无需等下一轮 begin() */
                seq += 1;
                if (stopFn) { try { stopFn(); } catch (e) {} }
                else if (controller) { try { controller.stop(); } catch (e) {} }
                /* 服务端取消钩子：火后不管（失败不阻塞本地收口，smartCode/arcade 同构语义） */
                if (typeof cfg.cancelRequest === 'function') {
                    try { Promise.resolve(cfg.cancelRequest()).catch(function () {}); } catch (e) {}
                }
                /* stopping 兜底收尾：服务端确认迟到/丢失时最迟 settleTimeoutMs 落定 */
                settleTimer = setTimeout(finish, settleTimeoutMs);
            }

            /* stopping 态可 await：服务端收尾型宿主在 stop() 后等待（finish/settleTimeout 唤醒） */
            function waitSettled() {
                if (!stopping) return Promise.resolve();
                return new Promise(function (resolve) {
                    (settleWaiters = settleWaiters || []).push(resolve);
                });
            }

            function classify(hasContent) {
                return hasContent ? 'stoppedPartial' : 'stoppedEmpty';
            }

            function noteFor(kind) {
                return notes[kind] || '';
            }

            return {
                begin: begin,
                isCurrent: isCurrent,
                onStopFn: onStopFn,
                attach: attach,
                stop: stop,
                finish: finish,
                waitSettled: waitSettled,
                classify: classify,
                noteFor: noteFor,
                notes: notes,
                get stopping() { return stopping; },
                get seq() { return seq; }
            };
        }
    };
})();
