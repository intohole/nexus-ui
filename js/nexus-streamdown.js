(function () {
    'use strict';

    const VERSION = '1.0.0';

    // 流式 markdown 渲染伴生器：块切分 → 尾块自动闭合 → 稳定块缓存。
    // 配合 v-html 的「值不变不重建 DOM」语义实现块级 memoize：稳定区 html 字符串
    // 仅在块边界推进时变化，活跃尾块每帧重渲。渲染委托 window.NexusMarkdown。
    // update 返回 null 表示调用方应回退一次性全文渲染。

    const FENCE_LINE_RE = /^[ \t]*(?:```|~~~)/;
    const LIST_LINE_RE = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]/;
    const TABLE_LINE_RE = /^[ \t]*\|/;
    const FENCE_LINE_STRIP_RE = /^[ \t]*(?:```|~~~)[^`]*$/gm;

    function countOccurrences(s, sub) {
        let n = 0;
        let i = 0;
        while ((i = s.indexOf(sub, i)) !== -1) { n++; i += sub.length; }
        return n;
    }

    // 扫描全文返回最后一个安全段落切点的字符偏移（-1 = 无切点，全文活跃）。
    //   1. 未闭合 code fence / $$ 数学块：起始行起整体留在活跃块（块内空行不切）
    //   2. 段落边界（\n\n）为切点；同类型列表/表格被空行分隔时不切（防 ol 重编号、断表格）
    function findCut(text) {
        const lines = text.split('\n');
        let cut = -1;
        let offset = 0;
        let inFence = false;
        let inMath = false;
        let prevType = '';
        let lastContentIdx = -1;
        const tryCut = function (lineStart, type) {
            const sameType = type !== '' && type === prevType;
            if (lastContentIdx >= 0 && !sameType) cut = lineStart;
        };
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineStart = offset;
            offset += line.length + 1;
            if (FENCE_LINE_RE.test(line)) {
                tryCut(lineStart, inFence ? '' : 'fence');
                inFence = !inFence;
                prevType = inFence ? 'fence' : '';
                lastContentIdx = i;
                continue;
            }
            if (inFence) continue;
            const dd = countOccurrences(line, '$$');
            if (inMath) {
                if (dd > 0) {
                    inMath = false;
                    prevType = '';
                    lastContentIdx = i;
                }
                continue;
            }
            if (dd % 2 === 1) {
                tryCut(lineStart, 'math');
                inMath = true;
                prevType = 'math';
                lastContentIdx = i;
                continue;
            }
            if (!line.trim()) continue;
            const type = LIST_LINE_RE.test(line) ? 'list' : (TABLE_LINE_RE.test(line) ? 'table' : '');
            tryCut(lineStart, type);
            lastContentIdx = i;
            prevType = type;
        }
        return cut;
    }

    // 尾块自动闭合：补齐未闭合 fence / 行内反引号 / ** 强调 / $$ 数学块，
    // 消除流式帧间「粗体闪成纯文本」「代码块闪成正文」类抖动。
    function autoCloseTail(text) {
        let out = text;
        let fenceCount = 0;
        const lines = out.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (FENCE_LINE_RE.test(lines[i])) fenceCount++;
        }
        if (fenceCount % 2 === 1) out += '\n```';
        const outsideFence = out.replace(FENCE_LINE_STRIP_RE, '');
        if (countOccurrences(outsideFence, '`') % 2 === 1) out += '`';
        if (countOccurrences(outsideFence, '**') % 2 === 1) out += '**';
        if (countOccurrences(out, '$$') % 2 === 1) out += '$$';
        return out;
    }

    // fullText：当前全文；state：调用方持有的增量缓存对象（跨帧复用）。
    // 前缀判定失败（重试/编辑导致内容重写）时自动作废缓存重新计算。
    function update(fullText, state) {
        const md = window.NexusMarkdown;
        if (!md || typeof fullText !== 'string' || !fullText) return null;
        const st = state || {};
        if (typeof st.full === 'string' && fullText.slice(0, st.full.length) !== st.full) {
            st.full = '';
            st.stableText = '';
            st.stableHtml = '';
        }
        st.full = fullText;
        const cut = findCut(fullText);
        const stableText = cut > 0 ? fullText.slice(0, cut) : '';
        const activeRaw = cut > 0 ? fullText.slice(cut) : fullText;
        let stableHtml;
        if (stableText === st.stableText && typeof st.stableHtml === 'string') {
            stableHtml = st.stableHtml;
        } else {
            stableHtml = stableText ? md.render(stableText) : '';
            st.stableText = stableText;
            st.stableHtml = stableHtml;
        }
        return { stableHtml: stableHtml, activeHtml: md.render(autoCloseTail(activeRaw)) };
    }

    window.NexusStreamdown = {
        version: VERSION,
        update,
        findCut,
        autoCloseTail
    };
})();
