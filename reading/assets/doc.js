/* =====================================================================
   スクロール型ページの状態保存（依存なし・file:// でも動作）
   - チェックリスト：チェック状態を保存し、達成率を表示
   - ワークシート  ：記入内容を保存し、Markdown で書き出す
   保存先は <body data-store="キー名"> で指定する。
   ===================================================================== */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* 文字列から安定した鍵を作る（djb2）。項目を並べ替えても状態が維持される。 */
  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return 'k' + (h >>> 0).toString(36);
  }

  ready(function () {
    var KEY = document.body.getAttribute('data-store') || 'reading-page-v1';

    function load() {
      try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
      catch (e) { return {}; }
    }
    function save(state) {
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch (e) { /* プライベートモードなどでは保存できないが、動作は継続する */ }
    }

    var state = load();

    /* ---------------- チェックリスト ---------------- */
    var boxes = Array.prototype.slice.call(document.querySelectorAll('.ck input[type="checkbox"]'));
    boxes.forEach(function (b) {
      var label = b.closest('label');
      var t = label ? label.querySelector('.ck-t') : null;
      b.dataset.key = hash((t ? t.textContent : '').replace(/\s+/g, ' ').trim());
      if (state[b.dataset.key]) b.checked = true;
      b.addEventListener('change', function () {
        if (b.checked) state[b.dataset.key] = 1; else delete state[b.dataset.key];
        save(state);
        update();
      });
    });

    /* ---------------- ワークシートの入力欄 ---------------- */
    var fields = Array.prototype.slice.call(document.querySelectorAll('[data-k]'));
    fields.forEach(function (f) {
      var k = 'f_' + f.getAttribute('data-k');
      if (typeof state[k] === 'string') f.value = state[k];
      f.addEventListener('input', function () {
        if (f.value) state[k] = f.value; else delete state[k];
        save(state);
        autogrow(f);
        update();
      });
      autogrow(f);
    });

    function autogrow(f) {
      if (f.tagName !== 'TEXTAREA') return;
      f.style.height = 'auto';
      f.style.height = Math.max(f.scrollHeight, 44) + 'px';
    }

    /* ---------------- 表示の更新 ---------------- */
    var meter    = document.querySelector('.ck-meter i');
    var count    = document.querySelector('.ck-count');
    var btnReset = document.querySelector('[data-act="reset"]');
    var btnPrint = document.querySelector('[data-act="print"]');
    var btnOnly  = document.querySelector('[data-act="only"]');
    var btnCopy  = document.querySelector('[data-act="copy"]');
    var onlyOpen = false;

    function update() {
      var total = boxes.length + fields.length;
      var done  = boxes.filter(function (b) { return b.checked; }).length +
                  fields.filter(function (f) { return f.value.trim() !== ''; }).length;
      var pct = total ? Math.round((done / total) * 100) : 0;
      if (meter) meter.style.width = pct + '%';
      if (count) count.textContent = done + ' / ' + total + '　(' + pct + '%)';

      Array.prototype.forEach.call(document.querySelectorAll('.ck-group'), function (g) {
        var bs = Array.prototype.slice.call(g.querySelectorAll('input[type="checkbox"]'));
        var fs = Array.prototype.slice.call(g.querySelectorAll('[data-k]'));
        var d = bs.filter(function (b) { return b.checked; }).length +
                fs.filter(function (f) { return f.value.trim() !== ''; }).length;
        var el = g.querySelector('.ck-gcount');
        if (el) el.textContent = d + ' / ' + (bs.length + fs.length);
      });

      if (onlyOpen) applyFilter();
    }

    function applyFilter() {
      boxes.forEach(function (b) {
        var li = b.closest('li');
        if (li) li.style.display = (onlyOpen && b.checked) ? 'none' : '';
      });
      Array.prototype.forEach.call(document.querySelectorAll('.ck-group'), function (g) {
        var items = Array.prototype.slice.call(g.querySelectorAll('.ck > li'));
        if (!items.length) return;
        var visible = items.some(function (li) { return li.style.display !== 'none'; });
        g.style.display = visible ? '' : 'none';
      });
    }

    if (btnReset) btnReset.addEventListener('click', function () {
      if (!window.confirm('入力とチェックをすべて消去します。よろしいですか？')) return;
      boxes.forEach(function (b) { b.checked = false; });
      fields.forEach(function (f) { f.value = ''; autogrow(f); });
      state = {};
      save(state);
      update();
    });

    if (btnPrint) btnPrint.addEventListener('click', function () {
      var wasOpen = onlyOpen;
      if (wasOpen) { onlyOpen = false; applyFilter(); }
      window.print();
      if (wasOpen) { onlyOpen = true; applyFilter(); }
    });

    if (btnOnly) btnOnly.addEventListener('click', function () {
      onlyOpen = !onlyOpen;
      btnOnly.textContent = onlyOpen ? 'すべて表示' : '未チェックのみ表示';
      btnOnly.setAttribute('aria-pressed', String(onlyOpen));
      applyFilter();
    });

    /* ---------------- Markdown で書き出す ---------------- */
    if (btnCopy) btnCopy.addEventListener('click', function () {
      var out = ['# 論文精読メモ', ''];
      Array.prototype.forEach.call(document.querySelectorAll('.ck-group'), function (g) {
        var h = g.querySelector('h3');
        var lines = [];
        Array.prototype.forEach.call(g.querySelectorAll('[data-k]'), function (f) {
          var lab = f.closest('.ws-row');
          var el = lab ? lab.querySelector('.ws-label') : null;
          /* <small> の補足は見出しに含めない */
          var name = el ? (el.firstChild ? el.firstChild.textContent : el.textContent)
                            .replace(/\s+/g, ' ').trim() : '';
          if (f.value.trim()) lines.push('- **' + name + '**：' + f.value.trim().replace(/\n/g, '\n  '));
        });
        Array.prototype.forEach.call(g.querySelectorAll('.ck input[type="checkbox"]'), function (b) {
          var t = b.closest('label').querySelector('.ck-t');
          lines.push('- [' + (b.checked ? 'x' : ' ') + '] ' + t.textContent.replace(/\s*必須\s*$/, '').trim());
        });
        if (lines.length) {
          out.push('## ' + h.firstChild.textContent.trim(), '');
          out.push.apply(out, lines);
          out.push('');
        }
      });
      var text = out.join('\n');
      var done = function (ok) {
        btnCopy.textContent = ok ? 'コピーしました' : 'コピーできませんでした';
        setTimeout(function () { btnCopy.textContent = 'Markdown でコピー'; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallback(text, done); });
      } else { fallback(text, done); }
    });

    function fallback(text, done) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      done(ok);
    }

    window.addEventListener('resize', function () { fields.forEach(autogrow); });
    update();
  });
})();
