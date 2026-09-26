/* =====================================================================
   HTML スライド制御（依存なし・file:// でも動作）
   - 1280x720 の固定ステージを等比拡大してビューポートに収める
   - ← → Space PageUp/Down Home End でページ送り
   - o / t キーでスライド一覧（目次）
   - URL ハッシュ (#5) でスライドを直接指定・共有
   ===================================================================== */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var deck = document.querySelector('.deck');
    if (!deck) return;

    var slides = Array.prototype.slice.call(deck.querySelectorAll('.slide'));
    var total = slides.length;
    var idx = 0;

    var bar      = document.querySelector('.progress__bar');
    var counter  = document.querySelector('.topbar__num');
    var btnPrev  = document.querySelector('.navbtn--prev');
    var btnNext  = document.querySelector('.navbtn--next');
    var btnToc   = document.querySelector('[data-act="toc"]');
    var btnPrint = document.querySelector('[data-act="print"]');
    var toc      = document.querySelector('.toc');
    var tocList  = document.querySelector('.toc__list');
    var deckTitle = (document.querySelector('.topbar__title') || {}).textContent || '';

    /* ---------- 各スライドに通し番号のフッタを付与 ---------- */
    slides.forEach(function (s, i) {
      if (!s.querySelector('.slide__foot')) {
        var f = document.createElement('div');
        f.className = 'slide__foot';
        f.innerHTML = '<span>' + escapeHtml(deckTitle) + '</span><span>' +
                      (i + 1) + ' / ' + total + '</span>';
        s.appendChild(f);
      }
    });

    function escapeHtml(t) {
      return String(t).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    }

    /* ---------- 目次を組み立て ---------- */
    function slideTitle(s, i) {
      var h = s.querySelector('h1, h2');
      return h ? h.textContent.replace(/\s+/g, ' ').trim() : 'スライド ' + (i + 1);
    }
    if (tocList) {
      slides.forEach(function (s, i) {
        var b = document.createElement('button');
        b.className = 'toc__item';
        b.type = 'button';
        b.innerHTML = '<b>' + (i + 1) + '</b>' + escapeHtml(slideTitle(s, i));
        b.addEventListener('click', function () { closeToc(); go(i); });
        tocList.appendChild(b);
      });
    }

    function markToc() {
      if (!tocList) return;
      Array.prototype.forEach.call(tocList.children, function (c, i) {
        c.classList.toggle('is-current', i === idx);
      });
    }
    function openToc() { if (toc) { toc.classList.add('is-open'); markToc(); } }
    function closeToc() { if (toc) toc.classList.remove('is-open'); }
    function toggleToc() { if (toc) toc.classList.contains('is-open') ? closeToc() : openToc(); }

    /* ---------- ページ送り ---------- */
    function go(n, skipHash) {
      idx = Math.max(0, Math.min(total - 1, n));
      slides.forEach(function (s, i) { s.classList.toggle('is-active', i === idx); });
      if (bar) bar.style.width = (total > 1 ? (idx / (total - 1)) * 100 : 100) + '%';
      if (counter) counter.textContent = (idx + 1) + ' / ' + total;
      if (btnPrev) btnPrev.disabled = (idx === 0);
      if (btnNext) btnNext.disabled = (idx === total - 1);
      if (!skipHash) {
        try { history.replaceState(null, '', '#' + (idx + 1)); }
        catch (e) { /* file:// で失敗することがあるので無視 */ }
      }
      markToc();
      deck.scrollTop = 0;
    }

    /* ---------- 本文が枠に収まるよう自動縮小 ----------
       スライドは絶対配置なので、visibility:hidden のまま表示して計測すれば
       他のスライドのレイアウトに影響せず、画面にもちらつかない。           */
    function autofit() {
      slides.forEach(function (s) {
        var body = s.querySelector('.slide__body');
        if (!body || s.hasAttribute('data-nofit')) return;
        var wasActive = s.classList.contains('is-active');
        if (!wasActive) { s.style.display = 'flex'; s.style.visibility = 'hidden'; }
        body.style.removeProperty('--bs');
        for (var bs = 100; bs >= 78; bs -= 2) {
          body.style.setProperty('--bs', bs / 100);
          var over = (body.scrollHeight - body.clientHeight > 1) ||
                     (s.scrollHeight - s.clientHeight > 1);
          if (!over) break;
        }
        if (!wasActive) { s.style.display = ''; s.style.visibility = ''; }
      });
    }

    /* ---------- ステージの等比拡大 ---------- */
    var stage = document.querySelector('.stage');
    function fit() {
      if (!stage) return;
      var pad = 24;
      var w = stage.clientWidth - pad * 2;
      var h = stage.clientHeight - pad * 2;
      var s = Math.min(w / 1280, h / 720);
      if (!isFinite(s) || s <= 0) s = 1;
      deck.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
    }
    window.addEventListener('resize', fit);
    fit();

    /* ---------- 入力 ---------- */
    if (btnPrev) btnPrev.addEventListener('click', function () { go(idx - 1); });
    if (btnNext) btnNext.addEventListener('click', function () { go(idx + 1); });
    if (btnToc) btnToc.addEventListener('click', toggleToc);
    if (btnPrint) btnPrint.addEventListener('click', function () { window.print(); });
    if (toc) toc.addEventListener('click', function (e) { if (e.target === toc) closeToc(); });

    document.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key;
      if (k === 'Escape') { closeToc(); return; }
      if (k === 'o' || k === 'O' || k === 't' || k === 'T') { toggleToc(); e.preventDefault(); return; }
      if (toc && toc.classList.contains('is-open')) return;
      if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'Enter') { go(idx + 1); e.preventDefault(); }
      else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { go(idx - 1); e.preventDefault(); }
      else if (k === 'Home') { go(0); e.preventDefault(); }
      else if (k === 'End') { go(total - 1); e.preventDefault(); }
    });

    /* タッチ（スワイプ） */
    var tx = null;
    document.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
    document.addEventListener('touchend', function (e) {
      if (tx === null) return;
      var dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 60) go(idx + (dx < 0 ? 1 : -1));
      tx = null;
    }, { passive: true });

    /* ---------- 起動 ---------- */
    var start = parseInt((location.hash || '').replace('#', ''), 10);
    go(isFinite(start) && start > 0 ? start - 1 : 0, true);
    autofit();
    /* Web フォントの読み込み後に文字幅が変わるので、もう一度合わせる */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(autofit).catch(function () {});
    }
    window.addEventListener('beforeprint', autofit);
  });
})();
