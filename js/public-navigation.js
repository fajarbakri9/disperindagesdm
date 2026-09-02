// Shared lightweight navigation behavior for public pages without js/app.js.
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('hamburgerBtn') || document.getElementById('mobileMenuBtn');
    const drawer = document.getElementById('mobileDrawer');
    const overlay = document.getElementById('mobileDrawerOverlay');
    const close = document.getElementById('drawerCloseBtn');
    if (!toggle || !drawer || !overlay) return;

    function setOpen(isOpen) {
      drawer.classList.toggle('open', isOpen);
      overlay.classList.toggle('active', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      drawer.setAttribute('aria-hidden', String(!isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
      if (isOpen && close) close.focus();
    }

    toggle.addEventListener('click', function () { setOpen(true); });
    if (close) close.addEventListener('click', function () { setOpen(false); });
    overlay.addEventListener('click', function () { setOpen(false); });
    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && drawer.classList.contains('open')) setOpen(false);
    });
  });
})();
