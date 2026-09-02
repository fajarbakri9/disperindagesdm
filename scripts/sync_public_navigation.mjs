import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : SOURCE_ROOT;
const pages = new Map([
  ["index.html", "home"], ["404.html", ""], ["arsip-berita.html", "news"],
  ["berita.html", "news"], ["direktori-lpg.html", "directory"],
  ["harga-bahan-pokok.html", "directory"], ["katalog-ikm.html", "directory"],
  ["kontak.html", "services"], ["layanan.html", "services"],
  ["maklumat-pelayanan.html", "profile"], ["pasar.html", "directory"],
  ["penyalur-bbm.html", "directory"], ["ppid.html", "services"],
  ["profil.html", "profile"], ["search.html", ""],
]);

const a = (current, target) => current === target ? " active" : "";
function desktopNav(current) {
  return `<ul class="nav-menu">
        <li><a href="index.html" class="nav-link${a(current,"home")}">Beranda</a></li>
        <li class="nav-dropdown"><a href="profil.html" class="nav-link nav-dropdown-toggle${a(current,"profile")}">Profil <span class="dropdown-arrow">▾</span></a><div class="nav-dropdown-menu">
          <a href="profil.html#berakhlak" class="dropdown-item"><div class="dropdown-icon">🎯</div><div class="dropdown-text"><span class="dropdown-title">Core Values ASN BerAKHLAK</span><span class="dropdown-desc">Tata nilai budaya kerja ASN</span></div></a>
          <a href="profil.html" class="dropdown-item"><div class="dropdown-icon">🏛️</div><div class="dropdown-text"><span class="dropdown-title">Profil &amp; Organisasi Resmi</span><span class="dropdown-desc">Visi, misi, struktur &amp; tupoksi Perbup 35/2023</span></div></a>
        </div></li>
        <li class="nav-dropdown"><a href="layanan.html" class="nav-link nav-dropdown-toggle${a(current,"services")}">Layanan Publik <span class="dropdown-arrow">▾</span></a><div class="nav-dropdown-menu">
          <a href="kontak.html" class="dropdown-item"><div class="dropdown-icon">📞</div><div class="dropdown-text"><span class="dropdown-title">Kontak &amp; Lokasi Kantor</span><span class="dropdown-desc">Alamat, peta &amp; WhatsApp dinas</span></div></a>
          <a href="index.html#pengaduan" class="dropdown-item"><div class="dropdown-icon">📨</div><div class="dropdown-text"><span class="dropdown-title">Pengaduan Online</span><span class="dropdown-desc">Kanal resmi dan SP4N-LAPOR!</span></div></a>
          <a href="layanan.html" class="dropdown-item"><div class="dropdown-icon">⚡</div><div class="dropdown-text"><span class="dropdown-title">Standar Pelayanan &amp; SOP</span><span class="dropdown-desc">Standar layanan publik resmi</span></div></a>
          <a href="ppid.html" class="dropdown-item"><div class="dropdown-icon">📋</div><div class="dropdown-text"><span class="dropdown-title">PPID Pelaksana</span><span class="dropdown-desc">Informasi publik dan dokumen resmi</span></div></a>
          <a href="layanan.html#transparansi-pelayanan" class="dropdown-item"><div class="dropdown-icon">📊</div><div class="dropdown-text"><span class="dropdown-title">Transparansi Pelayanan</span><span class="dropdown-desc">SKM, IKM, dan rekapitulasi layanan</span></div></a>
        </div></li>
        <li class="nav-dropdown"><a href="direktori-lpg.html" class="nav-link nav-dropdown-toggle${a(current,"directory")}">Direktori <span class="dropdown-arrow">▾</span></a><div class="nav-dropdown-menu">
          <a href="direktori-lpg.html" class="dropdown-item"><div class="dropdown-icon">🔥</div><div class="dropdown-text"><span class="dropdown-title">Direktori Pangkalan LPG 3 KG</span><span class="dropdown-desc">Sebaran pangkalan dan agen penyalur resmi</span></div></a>
          <a href="pasar.html" class="dropdown-item"><div class="dropdown-icon">🏬</div><div class="dropdown-text"><span class="dropdown-title">Direktori Pasar Daerah</span><span class="dropdown-desc">Sarana pasar dan status operasional</span></div></a>
          <a href="penyalur-bbm.html" class="dropdown-item"><div class="dropdown-icon">⛽</div><div class="dropdown-text"><span class="dropdown-title">Direktori Penyalur BBM</span><span class="dropdown-desc">Sebaran SPBU &amp; Pertashop Pinrang</span></div></a>
          <a href="peta-gis.html" class="dropdown-item"><div class="dropdown-icon">🗺️</div><div class="dropdown-text"><span class="dropdown-title">Peta GIS Disperindag ESDM</span><span class="dropdown-desc">Peta terpadu pasar, LPG, dan penyalur BBM</span></div></a>
          <a href="harga-bahan-pokok.html" class="dropdown-item"><div class="dropdown-icon">🛒</div><div class="dropdown-text"><span class="dropdown-title">Harga Pasar &amp; Bapokting</span><span class="dropdown-desc">Pantauan komoditas harian</span></div></a>
          <a href="katalog-ikm.html" class="dropdown-item"><div class="dropdown-icon">🏭</div><div class="dropdown-text"><span class="dropdown-title">Katalog Produk IKM</span><span class="dropdown-desc">Produk unggulan Pinrang</span></div></a>
        </div></li>
        <li><a href="arsip-berita.html" class="nav-link${a(current,"news")}">Berita</a></li>
      </ul>`;
}

function drawerNav(current, filename) {
  const sectionTarget = {news:"arsip-berita.html",profile:"profil.html",services:"layanan.html",directory:"direktori-lpg.html"}[current];
  const pageTarget = {"direktori-lpg.html":"direktori-lpg.html","katalog-ikm.html":"katalog-ikm.html","kontak.html":"kontak.html","pasar.html":"pasar.html","harga-bahan-pokok.html":"harga-bahan-pokok.html","penyalur-bbm.html":"penyalur-bbm.html","ppid.html":"ppid.html","peta-gis.html":"peta-gis.html","maklumat-pelayanan.html":"profil.html"}[filename] || sectionTarget;
  const link = (href, icon, label) => `      <a href="${href}" class="drawer-link${href === pageTarget ? " active" : ""}"><span>${icon}</span> ${label}</a>`;
  return `<div class="drawer-nav">
      <div class="mobile-nav-group-title">MENU UTAMA</div>
${[["index.html","🏠","Beranda"],["arsip-berita.html","📰","Berita &amp; Publikasi"],["layanan.html","⚡","Layanan Publik"],["profil.html","🏛️","Profil &amp; Tupoksi"]].map(x=>link(...x)).join("\n")}
      <div class="mobile-nav-group-title">LAYANAN PUBLIK</div>
${[["kontak.html","📞","Kontak &amp; Lokasi"],["index.html#pengaduan","📨","Pengaduan Online"],["ppid.html","📋","PPID Pelaksana"],["layanan.html#transparansi-pelayanan","📊","Transparansi Pelayanan"]].map(x=>link(...x)).join("\n")}
      <div class="mobile-nav-group-title">DIREKTORI</div>
${[["direktori-lpg.html","🔥","Direktori Pangkalan LPG 3 KG"],["penyalur-bbm.html","⛽","Direktori Penyalur BBM"],["pasar.html","🏬","Direktori Pasar"],["harga-bahan-pokok.html","🛒","Harga Bahan Pokok SP2KP"],["katalog-ikm.html","🏭","Katalog Produk IKM"],["peta-gis.html","🗺️","Peta GIS Disperindag ESDM"]].map(x=>link(...x)).join("\n")}
      <div class="drawer-divider"></div>
      <div class="mobile-nav-group-title">AKSES SISTEM</div>
      <div class="drawer-access-label asn"><span>🏛️</span><div><strong>ASN DISPERINDAG ESDM</strong><small>Pegawai dan administrator dinas</small></div></div>
      <a href="login.html" class="drawer-link drawer-portal-btn"><span>🔐</span> Login ASN Disperindag</a>
      <div class="drawer-access-label agent"><span>🔥</span><div><strong>AGEN LPG 3 KG</strong><small>Agen penyalur resmi</small></div></div>
      <a href="lpg-agen.html" class="drawer-link drawer-agent-btn"><span>🚚</span> Portal Agen LPG 3 Kg</a>
    </div>`;
}

function rootRelative(fragment) {
  return fragment.replace(/\b(href|src|action)="(?!https?:\/\/|\/|#|mailto:|tel:)([^"]+)"/g, '$1="/$2"');
}
function allHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? allHtml(path.join(dir,e.name)) : e.name.endsWith(".html") ? [path.join(dir,e.name)] : []);
}
const home = fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
const match = home.match(/\s*<!-- 1\. TOP UTILITY BAR[\s\S]*?(?=\s*<!-- MOBILE DRAWER NAVIGATION)/);
if (!match) throw new Error("Canonical home header not found");

function sync(file, current) {
  let canonical = match[0].replace(/<ul class="nav-menu">[\s\S]*?<\/ul>/, desktopNav(current));
  canonical = rootRelative(canonical);
  let text = fs.readFileSync(file,"utf8");
  const headerRx = /\s*<!-- 1\.[\s\S]*?(?=\s*<!-- (?:MOBILE DRAWER|3\.))/;
  if (!headerRx.test(text)) return false;
  text = text.replace(headerRx, canonical + "\n\n  ");
  const drawerRx = /<div class="drawer-nav">[\s\S]*?<\/div>\s*<\/div>\s*(?=<!--\s*(?:3\.|RUNNING|MOBILE))/;
  if (drawerRx.test(text)) text = text.replace(drawerRx, rootRelative(drawerNav(current,path.basename(file))) + "\n  </div>\n\n  ");
  text = text.replaceAll('/#transparansi-pelayanan','/layanan.html#transparansi-pelayanan').replaceAll('/index.html#transparansi-pelayanan','/layanan.html#transparansi-pelayanan');
  text = text.replace(/css\/style\.css\?v=[^"']+/g, 'css/style.css?v=20260902_login_roles_v1');
  fs.writeFileSync(file,text.replace(/\r\n/g,"\n"));
  return true;
}

let count = 0;
for (const [name,current] of pages) if (sync(path.join(ROOT,name),current)) count++;
for (const file of allHtml(path.join(ROOT,"berita"))) if (sync(file,"news")) count++;
for (const file of allHtml(path.join(ROOT,"pasar"))) if (path.basename(file) !== "index.html" || path.dirname(file) !== path.join(ROOT,"pasar")) if (sync(file,"directory")) count++;
console.log(`Navigasi tersinkron: ${count} halaman`);
