(function () {
  function initCard(card) {
    if (card.classList.contains('border-glow-card')) return;

    var span = document.createElement('span');
    span.className = 'edge-light';
    card.insertBefore(span, card.firstChild);
    card.classList.add('border-glow-card');

    var parent = card.parentElement;
    if (parent) {
      var po = window.getComputedStyle(parent).overflow;
      if (po === 'hidden' || po === 'clip') {
        card.style.setProperty('--glow-padding', '0px');
      } else {
        card.style.overflow = 'visible';
      }
    }

    card.addEventListener('pointermove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var cx = rect.width / 2, cy = rect.height / 2;
      var dx = x - cx, dy = y - cy;

      var kx = dx !== 0 ? cx / Math.abs(dx) : 1e9;
      var ky = dy !== 0 ? cy / Math.abs(dy) : 1e9;
      var edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);

      var deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (deg < 0) deg += 360;

      card.style.setProperty('--edge-proximity', (edge * 100).toFixed(3));
      card.style.setProperty('--cursor-angle', deg.toFixed(3) + 'deg');
    });

    card.addEventListener('pointerleave', function () {
      card.style.setProperty('--edge-proximity', '0');
    });
  }

  function initBar(bar) {
    if (bar.classList.contains('edge-glow-bar')) return;
    bar.classList.add('edge-glow-bar');

    bar.addEventListener('pointermove', function (e) {
      var rect = bar.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      bar.style.setProperty('--glow-x', x.toFixed(2) + '%');
    });
  }

  function init() {
    ['.support-card', '.doc-cell', '.g-cell', '.community-card', '.step-block']
      .forEach(function (sel) {
        document.querySelectorAll(sel).forEach(initCard);
      });
    document.querySelectorAll('nav, footer').forEach(initBar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
