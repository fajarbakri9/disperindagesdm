/**
 * dir-view-switch.js — Tab View Switcher Universal
 * Digunakan oleh: direktori-lpg.html, penyalur-bbm.html, pasar.html
 *
 * Mekanisme:
 *  - Baca atribut data-*-view di setiap <button> dalam .dir-view-tabs
 *  - Cocokkan dengan data-*-panel di panel saudara
 *  - Toggle class .active pada button dan panel yang sesuai
 *  - Tidak merusak alur data Firestore (hanya CSS class toggle)
 *
 * Contoh pola HTML yang didukung:
 *   <nav class="dir-view-tabs">
 *     <button class="active" data-lpg-view="cards">Cards</button>
 *     <button data-lpg-view="table">Tabel</button>
 *     <button data-lpg-view="infogram">Infografis</button>
 *   </nav>
 *   <div class="dir-view-panel active" data-lpg-panel="cards">...</div>
 *   <div class="dir-view-panel" data-lpg-panel="table">...</div>
 *   <div class="dir-view-panel" data-lpg-panel="infogram">...</div>
 */
(function () {
  'use strict';

  /**
   * Temukan atribut data-*-view dari sebuah button.
   * Return { attr: 'data-lpg-view', val: 'cards' } atau null.
   */
  function getViewAttr(btn) {
    for (var i = 0; i < btn.attributes.length; i++) {
      var a = btn.attributes[i];
      if (a.name.indexOf('data-') === 0 && a.name.slice(-5) === '-view') {
        return { attr: a.name, val: a.value };
      }
    }
    return null;
  }

  /**
   * Cari semua panel [data-*-panel] yang terkait dengan nav ini.
   * Telusuri ke atas hingga menemukan elemen yang mengandung panel.
   */
  function findPanels(nav, panelAttr) {
    var el = nav.parentElement;
    while (el && el !== document.documentElement) {
      var found = el.querySelectorAll('[' + panelAttr + ']');
      if (found.length > 0) return found;
      el = el.parentElement;
    }
    return [];
  }

  /**
   * Inisialisasi semua nav.dir-view-tabs yang ada di halaman.
   */
  function initDirViewTabs() {
    var navs = document.querySelectorAll('.dir-view-tabs');
    navs.forEach(function (nav) {
      nav.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn || !nav.contains(btn)) return;

        var info = getViewAttr(btn);
        if (!info) return;

        // panel attr: ganti -view dengan -panel
        var panelAttr = info.attr.replace('-view', '-panel');

        // Nonaktifkan semua button di nav ini
        nav.querySelectorAll('button').forEach(function (b) {
          b.classList.remove('active');
        });
        btn.classList.add('active');

        // Aktifkan panel yang cocok, nonaktifkan yang lain
        var panels = findPanels(nav, panelAttr);
        panels.forEach(function (panel) {
          if (panel.getAttribute(panelAttr) === info.val) {
            panel.classList.add('active');
          } else {
            panel.classList.remove('active');
          }
        });
      });
    });
  }

  // Jalankan saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDirViewTabs);
  } else {
    initDirViewTabs();
  }

})();
