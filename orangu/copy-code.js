// Adds a "Copy" button to every code block on the page: <pre><code> blocks in
// the documentation and <div class="terminal-block"> blocks on the landing
// pages. Self-contained — injects its own styles and wires every block on load.
(function () {
  var css = [
    '.code-copy-wrap { position: relative; }',
    '.code-copy-btn {',
    '  position: absolute; top: 8px; right: 8px; z-index: 2;',
    '  font-family: inherit; font-size: 0.68rem; font-weight: 600;',
    '  letter-spacing: 0.05em; text-transform: uppercase; line-height: 1;',
    '  color: var(--text-3, #8a8a8a);',
    '  background: var(--bg-2, rgba(20, 20, 20, 0.7));',
    '  border: 1px solid var(--border, rgba(255, 255, 255, 0.14));',
    '  border-radius: 5px; padding: 5px 9px; cursor: pointer;',
    '  -webkit-user-select: none; user-select: none; opacity: 0;',
    '  transition: opacity .15s ease, color .15s ease, border-color .15s ease;',
    '}',
    '.code-copy-wrap:hover .code-copy-btn, .code-copy-btn:focus-visible { opacity: 1; }',
    '.code-copy-btn:hover { color: var(--amber, #c4803c); border-color: var(--amber, #c4803c); }',
    '.code-copy-btn.copied { color: #7ec88a; border-color: #7ec88a; opacity: 1; }',
    '@media (hover: none) { .code-copy-btn { opacity: 0.85; } }'
  ].join('\n');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // A .terminal-block renders one command line per child <div>; join them so the
  // copied text is the runnable command, not a single squashed line.
  function terminalText(el) {
    var lines = el.querySelectorAll(':scope > div');
    if (lines.length) {
      return Array.prototype.map
        .call(lines, function (d) { return d.textContent; })
        .join('\n');
    }
    return el.textContent;
  }

  function copyText(text, btn) {
    text = text.replace(/[ \t]+$/gm, '').replace(/\s+$/, '');
    function ok() {
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      setTimeout(function () {
        btn.textContent = 'Copy';
        btn.classList.remove('copied');
      }, 1500);
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { /* ignore */ }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, fallback);
    } else {
      fallback();
    }
  }

  // Wrap the block in a positioned container so the button stays pinned to the
  // top-right even when the block scrolls horizontally on long lines.
  function attach(block, getText) {
    var parent = block.parentElement;
    if (parent && parent.classList.contains('code-copy-wrap')) return;
    var wrap = document.createElement('div');
    wrap.className = 'code-copy-wrap';
    block.parentNode.insertBefore(wrap, block);
    wrap.appendChild(block);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy-btn';
    btn.textContent = 'Copy';
    btn.setAttribute('aria-label', 'Copy to clipboard');
    btn.addEventListener('click', function () { copyText(getText(), btn); });
    wrap.appendChild(btn);
  }

  function init() {
    document.querySelectorAll('pre').forEach(function (pre) {
      var code = pre.querySelector('code');
      attach(pre, function () { return (code || pre).textContent; });
    });
    document.querySelectorAll('.terminal-block').forEach(function (tb) {
      attach(tb, function () { return terminalText(tb); });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
