import { readFileSync } from 'node:fs';

const ROOT = new URL('../js/', import.meta.url).pathname;
global.window = global;

const results = [];
const check = (name, cond) => { results.push([name, !!cond]); };
const flush = () => new Promise((r) => setImmediate(r));

const load = (f) => (0, eval)(readFileSync(ROOT + f, 'utf8'));
load('nexus-stop.js');
const S = window.NexusStop;

/* 默认文案 = suki 四态原文（f18 全等断言的逐字硬条款） */
check('默认 notes: stoppedPartial 逐字', S.DEFAULT_NOTES.stoppedPartial === '已停止 · 以上是停止前已生成的部分');
check('默认 notes: stoppedEmpty 逐字', S.DEFAULT_NOTES.stoppedEmpty === '你已停止了这次提问');
check('默认 notes: interrupted 逐字', S.DEFAULT_NOTES.interrupted === '连接中断 · 以上是已收到的部分');
check('默认 notes: lost 逐字', S.DEFAULT_NOTES.lost === '这条提问没有保留回答（可能被停止或未完成）');

{
    const s = S.create();
    const a = s.begin();
    check('begin: 代际自增且 isCurrent 命中', a === 1 && s.isCurrent(a) && !s.isCurrent(0));
    const b = s.begin();
    check('新轮 begin: 旧代际失效（防假停）', b === 2 && !s.isCurrent(a) && s.isCurrent(b));
    check('初始非 stopping', s.stopping === false);
}

{
    let stoppedBy = '';
    const s = S.create({ stopFn: () => { stoppedBy = 'stopFn'; } });
    s.begin();
    s.stop();
    check('stop: stopFn 优先触发', stoppedBy === 'stopFn');
    check('stop: 进入 stopping 态', s.stopping === true);
    s.finish();
    check('finish: stopping 退出', s.stopping === false);
}

{
    let controllerStopped = false;
    let cancelFired = false;
    const s = S.create({ cancelRequest: () => { cancelFired = true; return Promise.resolve(); } });
    s.begin();
    s.attach({ stop: () => { controllerStopped = true; } });
    s.stop();
    check('stop: controller 兜底触发', controllerStopped === true);
    check('stop: cancelRequest 钩子已发', cancelFired === true);
    check('stop: 重复 stop 幂等', (s.stop(), true) && s.stopping === true);
    s.finish();
}

{
    let cancelCalled = 0;
    const s = S.create({ cancelRequest: () => { cancelCalled += 1; throw new Error('sync boom'); } });
    s.begin();
    s.stop();
    await flush();
    check('stop: cancelRequest 同步抛错不炸 stop', cancelCalled === 1);
}

{
    const s = S.create({ settleTimeoutMs: 30 });
    s.begin();
    s.stop();
    const p = s.waitSettled();
    s.finish();
    let settledEarly = false;
    p.then(() => { settledEarly = true; });
    await flush();
    check('waitSettled: finish 唤醒等待方', settledEarly === true);
}

{
    const s = S.create({ settleTimeoutMs: 25 });
    s.begin();
    s.stop();
    await new Promise((r) => setTimeout(r, 60));
    check('waitSettled: settleTimeout 兜底收尾', s.stopping === false);
}

{
    /* 长任务宿主形态：stop 后不 finish，等 settleTimeout 自动收尾 */
    const s = S.create({ settleTimeoutMs: 20 });
    s.begin();
    s.stop();
    const before = s.stopping;
    await new Promise((r) => setTimeout(r, 50));
    check('stopping 兜底: 超时前在途+超时后自动 false', before === true && s.stopping === false);
}

{
    const s = S.create({
        notes: { stoppedEmpty: '（宿主覆盖）本轮没有内容' }
    });
    check('classify: 有内容→stoppedPartial', s.classify(true) === 'stoppedPartial');
    check('classify: 无内容→stoppedEmpty', s.classify(false) === 'stoppedEmpty');
    check('noteFor: 平台默认未覆盖键保持', s.noteFor('stoppedPartial') === S.DEFAULT_NOTES.stoppedPartial);
    check('noteFor: 宿主覆盖键生效', s.noteFor('stoppedEmpty') === '（宿主覆盖）本轮没有内容');
    check('noteFor: interrupted/lost 逐字（suki 直替零漂移）',
        s.noteFor('interrupted') === '连接中断 · 以上是已收到的部分'
        && s.noteFor('lost') === '这条提问没有保留回答（可能被停止或未完成）');
}

let failed = 0;
for (const [name, ok] of results) {
    console.log((ok ? 'PASS' : 'FAIL') + '  ' + name);
    if (!ok) failed += 1;
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
