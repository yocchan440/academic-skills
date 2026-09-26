/* =====================================================================
   提出前チェックリストの進捗保存（依存なし・file:// でも動作）
   - チェック状態は localStorage に保存（項目の文言から鍵を作るので、
     項目を並べ替えても状態は維持される）
   - 全体／グループごとの達成率を表示
   - 未チェックの項目だけを表示する絞り込み
   ===================================================================== */
(function () {
  'use strict';

  var KEY = 'thesis-checklist-v1';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* 項目の文言から安定した鍵を作る（djb2） */
  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return 'k' + (h >>> 0).toString(36);
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { /* プライベートモードなどでは保存できないが、動作は継続する */ }
  }

  ready(function () {
    var boxes = Array.prototype.slice.call(document.querySelectorAll('.ck input[type="checkbox"]'));
    if (!boxes.length) return;

    var state = load();

    /* --- 各項目に鍵を割り当て、保存された状態を復元 --- */
    boxes.forEach(function (b) {
      var label = b.closest('label');
      var t = label ? label.querySelector('.ck-t') : null;
      var key = hash((t ? t.textContent : b.name || '').replace(/\s+/g, ' ').trim());
      b.dataset.key = key;
      if (state[key]) b.checked = true;
      b.addEventListener('change', function () {
        if (b.checked) state[b.dataset.key] = 1; else delete state[b.dataset.key];
        save(state);
        update();
      });
    });

    var meter    = document.querySelector('.ck-meter i');
    var count    = document.querySelector('.ck-count');
    var btnReset = document.querySelector('[data-act="reset"]');
    var btnPrint = document.querySelector('[data-act="print"]');
    var btnOnly  = document.querySelector('[data-act="only"]');
    var onlyOpen = false;

    function update() {
      var done = boxes.filter(function (b) { return b.checked; }).length;
      var pct = Math.round((done / boxes.length) * 100);
      if (meter) meter.style.width = pct + '%';
      if (count) count.textContent = done + ' / ' + boxes.length + '　(' + pct + '%)';

      Array.prototype.forEach.call(document.querySelectorAll('.ck-group'), function (g) {
        var bs = Array.prototype.slice.call(g.querySelectorAll('input[type="checkbox"]'));
        var d = bs.filter(function (b) { return b.checked; }).length;
        var el = g.querySelector('.ck-gcount');
        if (el) el.textContent = d + ' / ' + bs.length;
      });

      if (onlyOpen) applyFilter();
    }

    function applyFilter() {
      boxes.forEach(function (b) {
        var li = b.closest('li');
        if (li) li.style.display = (onlyOpen && b.checked) ? 'none' : '';
      });
      Array.prototype.forEach.call(document.querySelectorAll('.ck-group'), function (g) {
        var visible = Array.prototype.slice.call(g.querySelectorAll('.ck > li'))
          .some(function (li) { return li.style.display !== 'none'; });
        g.style.display = visible ? '' : 'none';
      });
    }

    if (btnReset) btnReset.addEventListener('click', function () {
      if (!window.confirm('チェックをすべて外します。よろしいですか？')) return;
      boxes.forEach(function (b) { b.checked = false; });
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

    update();
  });
})();
