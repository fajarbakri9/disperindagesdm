// Shared lightweight navigation behavior for public pages without js/app.js.
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('hamburgerBtn') || document.getElementById('mobileMenuBtn');
    const drawer = document.getElementById('mobileDrawer');
    const overlay = document.getElementById('mobileDrawerOverlay');
    const close = document.getElementById('drawerCloseBtn');
    if (!toggle || !drawer || !overlay) return;

    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function setOpen(isOpen) {
      drawer.classList.toggle('open', isOpen);
      overlay.classList.toggle('active', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      drawer.setAttribute('aria-hidden', String(!isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
      if (isOpen && close) window.setTimeout(function () { close.focus(); }, 100);
      if (!isOpen) toggle.focus();
    }

    toggle.addEventListener('click', function () { setOpen(true); });
    if (close) close.addEventListener('click', function () { setOpen(false); });
    overlay.addEventListener('click', function () { setOpen(false); });
    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && drawer.classList.contains('open')) setOpen(false);
      if (event.key !== 'Tab' || !drawer.classList.contains('open')) return;
      const focusable = Array.from(drawer.querySelectorAll(focusableSelector)).filter(function (element) {
        return element.offsetParent !== null;
      });
      if (!focusable.length) {
        event.preventDefault();
        drawer.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  });
})();
