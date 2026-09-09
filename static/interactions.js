/* Sophia's Garden Artisan — interaction layer.
   Progressive enhancement only: every effect starts from a visible,
   working page, and all motion is disabled for visitors who ask for
   reduced motion. Nothing here changes product imagery or copy. */
(function () {
  'use strict';
  var reduce = window.matchMedia &&
               window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. scroll reveal ------------------------------------- */
  function reveals() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
        setTimeout(function () { el.classList.add('is-in'); }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 2. product viewer: scroll + drag rotation ------------- */
  /* The board supplied two container angles per product. The viewer
     cross-fades between them and adds a matched Y-rotation so the pack
     reads as turning. Drop in a full turntable sequence later and the
     same component plays it frame by frame — see data-frames. */
  function viewer() {
    document.querySelectorAll('[data-viewer]').forEach(function (root) {
      var frames = Array.prototype.slice.call(root.querySelectorAll('[data-frame]'));
      if (frames.length < 2) return;
      var stage = root.querySelector('[data-stage]') || root;
      // Progress must be measured against a container that actually scrolls.
      // The viewer itself is position:sticky — once stuck its rect stops
      // moving, which would freeze the rotation.
      var track = root.closest('[data-viewer-track]') || root.parentElement;
      var dots = Array.prototype.slice.call(root.querySelectorAll('[data-dot]'));
      var n = frames.length;
      var pos = 0;          // 0 .. n-1, fractional
      var dragging = false, lastX = 0, dragged = 0, manualUntil = 0;

      function render() {
        var clamped = Math.max(0, Math.min(n - 1, pos));
        frames.forEach(function (f, i) {
          var d = Math.abs(clamped - i);
          var o = Math.max(0, 1 - d);
          // Sharpen the cross-fade. With only two real angles a long linear
          // blend reads as a double exposure; this keeps each view crisp and
          // confines the blend to a narrow band, so it reads as a turn.
          o = (o * o * o) / ((o * o * o) + Math.pow(1 - o, 3) || 1);
          f.style.opacity = o;
          if (!reduce) {
            var turn = (clamped - i) * 30;      // degrees
            f.style.transform = 'rotateY(' + turn + 'deg) scale(' + (0.97 + o * 0.03) + ')';
          }
          f.classList.toggle('is-active', d < 0.5);
        });
        dots.forEach(function (dot, i) {
          dot.classList.toggle('is-on', Math.round(clamped) === i);
        });
      }

      function setPos(p) { pos = p; render(); }

      // scroll-linked rotation while the viewer is in view
      var ticking = false;
      function onScroll() {
        if (ticking || reduce) return;
        ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          // a deliberate drag takes precedence over scroll for a moment,
          // so the visitor's own rotation is not snapped away
          if (dragging || performance.now() < manualUntil) return;
          var t = track.getBoundingClientRect();
          var vh = window.innerHeight || 800;
          // Progress across the track's full travel through the viewport:
          // 0 as it enters from the bottom, 1 as it leaves past the top.
          // Measured on the track (not the sticky viewer, whose rect freezes
          // once it sticks) so this works in both states.
          var raw = (vh - t.top) / (vh + t.height);
          // Stretch the middle band so the turn completes while the viewer
          // is still on screen rather than finishing after it has gone.
          var prog = (raw - 0.30) / 0.45;
          prog = Math.max(0, Math.min(1, prog));
          setPos(prog * (n - 1));
        });
      }

      // drag to rotate
      function down(e) {
        dragging = true; dragged = 0;
        lastX = (e.touches ? e.touches[0].clientX : e.clientX);
        root.classList.add('is-dragging');
      }
      function move(e) {
        if (!dragging) return;
        var x = (e.touches ? e.touches[0].clientX : e.clientX);
        var dx = x - lastX;
        lastX = x;
        dragged += Math.abs(dx);
        setPos(Math.max(0, Math.min(n - 1, pos + dx / (root.offsetWidth / (n - 1) / 1.6))));
        if (e.cancelable && dragged > 6) e.preventDefault();
      }
      function up() {
        if (dragging && dragged > 6) manualUntil = performance.now() + 2500;
        dragging = false;
        root.classList.remove('is-dragging');
      }

      stage.addEventListener('mousedown', down);
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
      stage.addEventListener('touchstart', down, { passive: true });
      stage.addEventListener('touchmove', move, { passive: false });
      window.addEventListener('touchend', up);

      dots.forEach(function (dot, i) {
        dot.addEventListener('click', function () { manualUntil = performance.now() + 2500; setPos(i); });
        dot.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setPos(i); }
        });
      });

      window.addEventListener('scroll', onScroll, { passive: true });
      render();
      onScroll();
    });
  }

  /* ---------- 3. count-up figures ---------------------------------- */
  function counters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        var target = parseFloat(el.getAttribute('data-count'));
        var suffix = el.getAttribute('data-suffix') || '';
        var dur = 900, t0 = performance.now();
        (function step(t) {
          var p = Math.min(1, (t - t0) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          var v = target * eased;
          el.textContent = (target % 1 ? v.toFixed(1) : Math.round(v)) + suffix;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 4. sticky product bar -------------------------------- */
  function stickyBar() {
    var bar = document.querySelector('[data-stickybar]');
    if (!bar) return;
    var trigger = document.querySelector('[data-stickybar-after]');
    if (!trigger) return;
    function check() {
      var past = trigger.getBoundingClientRect().bottom < 0;
      bar.classList.toggle('is-shown', past);
    }
    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  /* ---------- 5. reading progress on articles ---------------------- */
  function progress() {
    var bar = document.querySelector('[data-progress]');
    if (!bar) return;
    var article = document.querySelector('[data-progress-target]');
    if (!article) return;
    function upd() {
      var r = article.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      var done = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      bar.style.transform = 'scaleX(' + done + ')';
    }
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  }


  /* ---------- 6. login gate (DEMONSTRATION ONLY) -------------------- */
  /* One login for everyone. Each document panel carries its own access
     code; the code entered decides which panel opens. This is a
     walkthrough, not access control — the codes are in the page source and
     every panel's markup is served to all visitors. Real accounts and real
     documents require server-side authentication. */
  function portalGate() {
    var portal = document.querySelector('[data-portal]');
    if (!portal) return;
    var gate = portal.querySelector('[data-gate]');
    var panels = Array.prototype.slice.call(
      portal.querySelectorAll('[data-portal-inner]'));
    var form = portal.querySelector('[data-gate-form]');
    var err = portal.querySelector('[data-gate-error]');
    if (!gate || !form || !panels.length) return;
    var key = 'sga_portal_' + location.pathname;

    function panelFor(code) {
      for (var i = 0; i < panels.length; i++) {
        var expected = (panels[i].getAttribute('data-portal-code') || '')
                         .trim().toUpperCase();
        if (expected && expected === code) return panels[i];
      }
      return null;
    }

    function open_(panel) {
      gate.hidden = true;
      panels.forEach(function (p) { p.hidden = (p !== panel); });
      try { sessionStorage.setItem(key, panel.getAttribute('data-portal-code')); }
      catch (e) {}
      window.scrollTo(0, 0);
    }

    function close_() {
      panels.forEach(function (p) { p.hidden = true; });
      gate.hidden = false;
      try { sessionStorage.removeItem(key); } catch (e) {}
      var f = form.querySelector('input');
      if (f) f.value = '';
      window.scrollTo(0, 0);
    }

    // restore an unlocked panel for this session
    try {
      var saved = sessionStorage.getItem(key);
      if (saved) {
        var p = panelFor(saved.trim().toUpperCase());
        if (p) open_(p);
      }
    } catch (e) {}

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = (form.querySelector('input').value || '').trim().toUpperCase();
      if (!v) {
        err.textContent = 'Enter your access code.';
        err.hidden = false;
        return;
      }
      var panel = panelFor(v);
      if (!panel) {
        err.textContent = 'That code was not recognised. Check it and try again.';
        err.hidden = false;
        return;
      }
      err.hidden = true;
      open_(panel);
    });

    portal.querySelectorAll('[data-signout]').forEach(function (b) {
      b.addEventListener('click', close_);
    });
  }

  function init() { reveals(); viewer(); counters(); stickyBar(); progress(); portalGate(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
