import { useDocStore } from './useDocStore';

/**
 * 在新标签页中打开当前文档的只读预览。
 *
 * 直接从 ProseMirror 编辑器中抓取已渲染的 DOM 内容，
 * 连同页面所有样式表一并写入新标签。
 */
export function usePreview() {
  const store = useDocStore();

  function openPreview() {
    const doc = store.currentDoc.value;
    if (!doc) return;

    const proseElement = document.querySelector('.ProseMirror');
    if (!proseElement) {
      alert('编辑器尚未就绪，请稍后再试。');
      return;
    }

    const content = proseElement.cloneNode(true) as HTMLElement;

    // ① 按 data-language 区分处理
    const findBlock = (el: Element, sel: string): HTMLElement | null => {
      let cur: HTMLElement | null = el.parentElement;
      while (cur && cur !== content) {
        if (cur.querySelector(sel)) return cur;
        cur = cur.parentElement;
      }
      // 没找到则尝试同级父节点（SVG 可能在兄弟子树中）
      cur = el.parentElement?.parentElement ?? null;
      while (cur && cur !== content) {
        if (cur.querySelector(sel)) return cur;
        cur = cur.parentElement;
      }
      return null;
    };

    content.querySelectorAll('[data-language]').forEach((langEl) => {
      const lang = langEl.getAttribute('data-language') ?? '';

      if (lang === 'stex' || lang === 'latex') {
        const block = findBlock(langEl, 'math, .katex');
        if (block) {
          const rendered = block.querySelector('math') ?? block.querySelector('.katex');
          if (rendered) {
            const wrap = rendered.closest('span, div') ?? rendered;
            block.innerHTML = '';
            block.appendChild(wrap);
          }
        }
        return;
      }

      if (lang === 'mermaid') {
        // 直接删除代码块容器，SVG 图兄弟节点自然保留
        let wrapper: HTMLElement | null = langEl.parentElement;
        for (let i = 0; i < 5 && wrapper && wrapper !== content; i++) {
          if (wrapper.querySelector('textbox, [contenteditable], .cm-editor, .cm-scroller')) {
            wrapper.remove();
            break;
          }
          wrapper = wrapper.parentElement;
        }
        return;
      }

      // 常规代码块
      const parent = langEl.parentElement!;
      const cmContent = parent.querySelector('.cm-content');
      const html = cmContent?.innerHTML ?? parent.textContent ?? '';
      const pre = document.createElement('pre');
      pre.className = 'readonly-code-block';
      if (lang) {
        const label = document.createElement('div');
        label.className = 'code-block-lang';
        label.textContent = lang;
        pre.appendChild(label);
      }
      const code = document.createElement('code');
      code.innerHTML = html;
      pre.appendChild(code);
      const cmEditor = parent.querySelector('.cm-editor');
      (cmEditor ?? parent).replaceWith(pre);
    });

    // ①-b Mermaid：以 .mermaid-preview 渲染图为锚点，反向删除代码块容器
    content.querySelectorAll('.mermaid-preview').forEach((preview) => {
      let sibling = preview.previousElementSibling as HTMLElement | null;
      while (sibling) {
        if (sibling.querySelector('textbox, [contenteditable], .cm-editor, .cm-scroller, [data-language]')) {
          sibling.remove();
          break;
        }
        sibling = sibling.previousElementSibling as HTMLElement | null;
      }
    });

    // ①-c 行内公式：剥掉 math_inline 包裹，只留 <math>（与块级公式一致）
    content.querySelectorAll('[data-type="math_inline"]').forEach((el) => {
      const mathml = el.querySelector('math');
      if (mathml) (el as HTMLElement).replaceWith(mathml);
      else {
        const katex = el.querySelector('.katex');
        if (katex) (el as HTMLElement).replaceWith(katex);
      }
    });

    // ② 移除交互/浮动 UI
    content.querySelectorAll(
      'button, .code-block-config, .block-edit, .milkdown-toolbar, .milkdown-top-bar, .latex-config, .block-handle, .image-toolbar, .milkdown-tooltip',
    ).forEach((el) => el.remove());

    // 清除 list checkbox
    content.querySelectorAll('li .label-wrapper, li label[contenteditable="false"]').forEach((el) => {
      (el as HTMLElement).remove();
    });

    // 清理 absolute/fixed 空壳
    content.querySelectorAll('[style*="position: absolute"], [style*="position: fixed"]').forEach((el) => {
      if (el.children.length === 0 || (el.children.length <= 2 && el.querySelector('img'))) {
        el.remove();
      }
    });

    // 清理所有空节点
    content.querySelectorAll('div, span, p').forEach((el) => {
      if (!el.textContent?.trim() && el.children.length === 0 && !el.querySelector('img, svg, math, .katex')) {
        el.remove();
      }
    });

    // ③ 移除可编辑属性
    content.removeAttribute('contenteditable');
    content.removeAttribute('role');
    content.removeAttribute('translate');
    content.querySelectorAll('[contenteditable]').forEach((el) => {
      el.removeAttribute('contenteditable');
    });

    const styles = collectPageStyles();
    const theme = document.documentElement.dataset.theme || 'light';
    const title = escapeHtml(doc.title || 'Markdown Preview');

    const html = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${theme}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
${styles}
<style>
  :root {
    --color-bg: #ffffff;
    --color-text: #1f1f1f;
    --color-text-muted: #6b7280;
    --color-border: #e5e5e5;
    --color-code-bg: #f5f5f5;
    --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    --font-mono: 'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace;
  }
  [data-theme="dark"] {
    --color-bg: #1e1e1e;
    --color-text: #e5e5e5;
    --color-text-muted: #9ca3af;
    --color-border: #3a3a3a;
    --color-code-bg: #2d2d2d;
  }
  html, body { height: auto; overflow: auto; }
  body { max-width: 860px; margin: 0 auto; padding: 32px 64px 64px; }
  .ProseMirror { padding: 0 !important; max-width: none !important; }
  .PreviewToolbar {
    position: fixed; top: 0; left: 0; right: 0;
    background: var(--color-bg); border-bottom: 1px solid var(--color-border);
    padding: 8px 16px; font-size: 13px; color: var(--color-text-muted);
    display: flex; align-items: center; gap: 16px; z-index: 100;
    font-family: var(--font-sans);
  }
  .PreviewToolbar-title { font-weight: 600; color: var(--color-text); }
  .PreviewToolbar-spacer { flex: 1; }
  body.has-toolbar { padding-top: 56px; }
  blockquote {
    border-left: 3px solid var(--color-border);
    padding: 4px 16px; color: var(--color-text-muted); margin: 1em 0;
  }
  .readonly-code-block {
    background: var(--color-code-bg); border-radius: 6px;
    padding: 16px; overflow-x: auto; margin: 1em 0;
  }
  .code-block-lang { font-size: 12px; color: var(--color-text-muted); margin-bottom: 8px; }
  .readonly-code-block code {
    font-family: var(--font-mono); font-size: 14px; line-height: 1.5;
    white-space: pre; background: none; padding: 0;
  }
  /* 覆盖 Crepe/CodeMirror One Dark 主题的暗色背景 */
  .cm-editor, .cm-scroller, .cm-content, .cm-gutters, .cm-lineNumbers,
  [style*="#282c34"], [style*="#2c313a"], [style*="#21252b"] {
    background: transparent !important;
  }
  /* 阻止收集的外部样式污染 KaTeX 内部定位（上下标依赖 position/display 精确值） */
  .katex, .katex * {
    line-height: normal !important;
    vertical-align: baseline;
  }
  .katex .msupsub, .katex .vlist-t, .katex .vlist-r, .katex .vlist {
    position: relative !important;
  }
  .katex .msupsub .vlist-t, .katex .mfrac .vlist-t {
    display: inline-table !important;
  }
    </style>
</head>
<body class="has-toolbar">
<div class="PreviewToolbar">
  <span class="PreviewToolbar-title">${title}</span>
  <span class="PreviewToolbar-spacer"></span>
  <span>${doc.content.length} 字</span>
</div>
${content.outerHTML}
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    window.open(URL.createObjectURL(blob), '_blank');
  }

  return { openPreview };
}

function collectPageStyles(): string {
  const parts: string[] = [];
  document.querySelectorAll('style').forEach((el) => { parts.push(el.outerHTML); });
  document.querySelectorAll('link[rel="stylesheet"]').forEach((el) => { parts.push(el.outerHTML); });
  return parts.join('\n');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
