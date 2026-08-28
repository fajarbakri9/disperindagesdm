# ARAHAN TEKNIS DEVELOPER
## PEMBENAHAN COMMAND CENTER DISPERINDAG ESDM KABUPATEN PINRANG

### TUJUAN

Lakukan pembenahan **hanya pada halaman Command Center Disperindag ESDM Kabupaten Pinrang**.

Pertahankan konsep visual, struktur lima slide, warna, layout utama, dark/light mode, fullscreen, auto-slide, running ticker, cuaca, jam/tanggal, dan gaya TV Wallboard yang sudah ada.

**Jangan melakukan redesign besar.**

**Jangan mengubah atau mengerjakan ulang modul jam/tanggal karena bagian tersebut sudah diperbaiki sebelumnya.**

Fokus pekerjaan pada:

- validitas data;
- integritas realtime;
- Firestore dan fallback data;
- status koneksi;
- freshness data;
- keamanan render;
- cuaca;
- keterbacaan data;
- kestabilan wallboard;
- responsive TV;
- efisiensi listener Firestore.

---

# 1. PERTAHANKAN STRUKTUR COMMAND CENTER

Pertahankan lima slide:

1. Ikhtisar Lengkap
2. Bursa Harga Pasar
3. Kemetrologian & Tera
4. Gas LPG 3 Kg & ESDM
5. Industri & SP4N-LAPOR!

Pertahankan juga:

- logo Kabupaten Pinrang;
- judul Command Center;
- badge status;
- cuaca;
- jam dan tanggal existing;
- dark/light mode;
- fullscreen;
- tab navigasi;
- auto-slide;
- progress auto-slide;
- running ticker;
- responsive layout.

Jangan membuat halaman atau konsep baru.

---

# 2. JANGAN UBAH MODUL JAM/TANGGAL

Modul jam dan tanggal sudah diperbaiki.

Developer **tidak perlu melakukan perubahan lagi** pada:

```text
ccLiveTime
ccLiveDate
updateClock()
format jam
format tanggal
timezone
interval update jam
```

Jangan melakukan refactor pada bagian tersebut kecuali ditemukan bug baru yang benar-benar menyebabkan Command Center gagal berjalan.

Fokus pekerjaan pada bagian lain.

---

# 3. HILANGKAN ANGKA FALLBACK YANG TERLIHAT SEPERTI DATA AKTUAL

Jangan menampilkan angka realistis sebagai fallback apabila Firestore gagal atau belum mempunyai data.

Contoh angka yang tidak boleh dipakai sebagai fallback permanen:

```text
2,1%
786
2.450+
Rp20.000
340+
100%
84,5%
1.248
320+
89,4
```

Ganti nilai awal HTML menjadi:

```text
--
```

Contoh:

```html
<div id="cc_kpi_inflation_rate">--</div>

<div id="cc_kpi_pasar_sentral_stalls">--</div>

<div id="cc_kpi_uttp_verified">--</div>

<div id="cc_kpi_het_lpg_price">--</div>

<div id="cc_kpi_spbu_verified_pct">--</div>
```

Jika tidak ada data, tampilkan:

```text
DATA BELUM TERSEDIA
```

Tujuan:

**Database gagal tidak boleh membuat Command Center tetap terlihat seolah-olah sedang menampilkan data aktual.**

---

# 4. FIRESTORE MENJADI SUMBER DATA UTAMA

Urutan sumber data:

```text
FIRESTORE
    ↓
CACHE TERAKHIR
    ↓
EMPTY STATE
```

Artinya:

### Pertama

Ambil data Firestore.

### Kedua

Jika Firestore gagal tetapi terdapat cache valid, gunakan cache.

### Ketiga

Jika Firestore dan cache tidak tersedia, tampilkan empty state.

Jangan menggunakan data dummy/faktual sebagai fallback.

---

# 5. DEFAULT CONFIG HANYA BOLEH BERISI STRUKTUR KOSONG

Contoh:

```js
const DEFAULT_COMMAND_CENTER_CONFIG = {

  inflation_rate: null,

  pasar_sentral_stalls: null,

  uttp_verified: null,

  het_lpg_price: null,

  spbu_verified_pct: null,

  lpg_distribution_pct: null,

  total_ikm_trained: null,

  total_ikm_certified: null,

  skm_score: null,

  updated_at: null

};
```

Jangan:

```js
inflation_rate: "2.1%"
```

atau:

```js
het_lpg_price: "Rp 20.000"
```

sebagai fallback.

---

# 6. BUAT EMPAT STATUS DATA

Command Center harus mengenali:

```text
LIVE
CACHED
STALE
UNAVAILABLE
```

## LIVE

Firestore aktif dan data masih dalam periode freshness.

Tampilan:

```text
● LIVE
```

Warna hijau.

## CACHED

Firestore/network bermasalah tetapi cache tersedia.

Tampilan:

```text
● OFFLINE / CACHE
```

Warna kuning.

## STALE

Data tersedia tetapi sudah terlalu lama.

Tampilan:

```text
● DATA STALE
```

Warna oranye.

## UNAVAILABLE

Tidak ada data valid.

Tampilan:

```text
● DATA TIDAK TERSEDIA
```

Warna merah.

---

# 7. BADGE LIVE HARUS BERDASARKAN KONDISI SEBENARNYA

Jangan selalu menampilkan:

```text
LIVE MONITORING
```

dengan indikator hijau.

Gunakan:

```html
<span
  class="cc-live-badge"
  id="systemLiveBadge"
>
  ● MEMUAT DATA
</span>
```

JavaScript:

```js
function setSystemStatus(status) {

  const badge =
    document.getElementById(
      "systemLiveBadge"
    );

  badge.classList.remove(
    "status-live",
    "status-cached",
    "status-stale",
    "status-offline"
  );

  if (status === "live") {

    badge.textContent =
      "● LIVE";

    badge.classList.add(
      "status-live"
    );

  }

  else if (
    status === "cached"
  ) {

    badge.textContent =
      "● OFFLINE / CACHE";

    badge.classList.add(
      "status-cached"
    );

  }

  else if (
    status === "stale"
  ) {

    badge.textContent =
      "● DATA STALE";

    badge.classList.add(
      "status-stale"
    );

  }

  else {

    badge.textContent =
      "● DATA TIDAK TERSEDIA";

    badge.classList.add(
      "status-offline"
    );

  }

}
```

---

# 8. TAMBAHKAN INFORMASI “DATA TERBARU”

Selain jam existing, Command Center perlu menunjukkan **umur data**.

Contoh:

```text
DATA TERBARU
28 AGU 2026 • 13:38 WITA
```

Ini berbeda dengan jam sistem.

Jam menunjukkan waktu sekarang.

`DATA TERBARU` menunjukkan kapan data terakhir diperbarui.

Gunakan:

```text
updated_at
```

dari Firestore.

---

# 9. TIMESTAMP DATA HARUS BERASAL DARI SERVER

Ketika data disimpan, gunakan:

```js
firebase.firestore
  .FieldValue
  .serverTimestamp()
```

untuk:

```text
created_at
updated_at
verified_at
```

Jangan menggunakan waktu perangkat operator sebagai timestamp resmi data.

---

# 10. PERBAIKI BUG DUPLIKASI `syncWeather()`

Di `command-center.html` terdapat lebih dari satu definisi:

```js
async function syncWeather()
```

Hapus duplikasi.

Gunakan hanya **satu implementasi `syncWeather()`**.

Pertahankan versi yang memiliki:

- WMO decoder;
- status `isLive`;
- `lastUpdated`;
- cache;
- handling error yang lebih lengkap.

---

# 11. CUACA REFRESH OTOMATIS

Saat halaman pertama kali terbuka:

```js
syncWeather();
```

Kemudian:

```js
setInterval(() => {

  syncWeather();

}, 15 * 60 * 1000);
```

Refresh ±15 menit sudah cukup.

Jangan melakukan request cuaca terlalu sering.

---

# 12. STATUS CUACA HARUS TERLIHAT

Jika berhasil:

```text
⛅ PINRANG
28°C
CERAH BERAWAN
```

Jika menggunakan cache:

```text
⛅ 28°C
DATA CUACA TERAKHIR
```

Jika terlalu lama:

```text
⚠ CUACA BELUM TERBARUI
```

Jangan menampilkan status LIVE ketika API gagal dan hanya menggunakan data lama.

---

# 13. JANGAN MENYEBUT BMKG JIKA API YANG DIGUNAKAN OPEN-METEO

Jika request dilakukan ke:

```text
api.open-meteo.com
```

jangan memberi label atau komentar yang menyatakan data tersebut langsung berasal dari BMKG.

Gunakan:

```text
CUACA PINRANG
```

Pada source/internal metadata dapat ditulis:

```text
Open-Meteo
```

---

# 14. STANDARDISASI DATA KPI

Setiap KPI sebaiknya memiliki:

```text
value
unit
source
period
updated_at
```

Contoh:

```js
{
  value: 18500,

  unit: "rupiah",

  source:
    "Disperindag ESDM Kabupaten Pinrang",

  period:
    "Agustus 2026",

  updated_at:
    Timestamp
}
```

Jangan hanya menyimpan:

```js
"Rp 18.500"
```

---

# 15. SIMPAN ANGKA SEBAGAI NUMBER

Jangan:

```js
official_bases:
  "340+"
```

Jangan:

```js
distribution_pct:
  "84.5%"
```

Jangan:

```js
het_price:
  "Rp 18.500"
```

Gunakan:

```js
official_bases:
  340
```

```js
distribution_pct:
  84.5
```

```js
het_price:
  18500
```

Formatting dilakukan frontend.

---

# 16. FORMAT RUPIAH DI FRONTEND

Gunakan:

```js
const formatRupiah =
  new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }
  );
```

Contoh:

```js
formatRupiah.format(18500);
```

hasil:

```text
Rp18.500
```

---

# 17. VALIDASI ANGKA

Tambahkan:

```js
function safeNumber(value) {

  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : null;

}
```

---

# 18. VALIDASI PERSENTASE

Gunakan:

```js
function safePercentage(value) {

  const n =
    Number(value);

  if (
    !Number.isFinite(n)
  ) {
    return null;
  }

  return Math.min(
    Math.max(n, 0),
    100
  );

}
```

Semua persentase harus melewati fungsi ini sebelum dirender.

---

# 19. PROGRESS BAR LPG WAJIB DI-CLAMP

Jangan langsung:

```js
progressBar.style.width =
  config.lpg_distribution_pct;
```

Gunakan:

```js
const pct =
  safePercentage(
    config.lpg_distribution_pct
  );

progressBar.style.width =
  pct === null
    ? "0%"
    : `${pct}%`;
```

---

# 20. DATA HARGA HARUS MEMPUNYAI `previous_price`

Struktur:

```js
{
  commodity_name:
    "Cabai Rawit",

  unit:
    "kg",

  price:
    52000,

  previous_price:
    48000,

  stock_status:
    "limited",

  source:
    "Monitoring Petugas Pasar",

  observed_at:
    Timestamp,

  updated_at:
    Timestamp
}
```

---

# 21. HITUNG TREND HARGA SECARA OTOMATIS

Jangan bergantung sepenuhnya pada input:

```text
up
down
stable
```

Gunakan:

```js
function getTrend(
  current,
  previous
) {

  if (
    !Number.isFinite(current) ||
    !Number.isFinite(previous)
  ) {
    return "stable";
  }

  if (
    current > previous
  ) {
    return "up";
  }

  if (
    current < previous
  ) {
    return "down";
  }

  return "stable";

}
```

---

# 22. TAMPILKAN SELISIH HARGA

Hitung:

```js
const delta =
  current -
  previous;
```

Persentase:

```js
const percentage =
  previous > 0
    ? (
        delta /
        previous
      ) * 100
    : 0;
```

Tampilan:

```text
CABAI RAWIT

Rp52.000/Kg

▲ Rp4.000
+8,3%
```

---

# 23. HAPUS STATUS PASOKAN HARDCODE

Jangan memberikan seluruh komoditas:

```text
🟢 TERSEDIA MELIMPAH
```

secara otomatis.

Gunakan field:

```text
stock_status
```

Pilihan:

```text
abundant
normal
limited
scarce
unavailable
```

Mapping:

```js
const STOCK_STATUS = {

  abundant:
    "Melimpah",

  normal:
    "Normal",

  limited:
    "Terbatas",

  scarce:
    "Langka",

  unavailable:
    "Tidak Tersedia"

};
```

---

# 24. STATUS PASOKAN HARUS PUNYA WARNA DINAMIS

Gunakan:

```text
MELIMPAH
Hijau

NORMAL
Hijau/Cyan

TERBATAS
Kuning

LANGKA
Merah

TIDAK TERSEDIA
Merah
```

Jangan semua berwarna hijau.

---

# 25. TAMPILKAN UPDATE HARGA

Pada Bursa Harga tambahkan:

```text
UPDATE DATA
28 AGUSTUS 2026 • 07.30 WITA
```

dan:

```text
SUMBER:
MONITORING PETUGAS PASAR
```

Jangan hanya:

```text
UPDATE HARIAN
```

tanpa timestamp.

---

# 26. PERBAIKI ISTILAH INDIKATOR HARGA BILA DIPERLUKAN

Jika angka bukan indikator inflasi resmi, jangan gunakan istilah:

```text
INFLASI PANGAN DAERAH
```

Gunakan:

```text
PERUBAHAN HARGA BAPOKTING
```

atau:

```text
INDEKS STABILITAS HARGA
```

Contoh:

```text
+2,1%

VS MINGGU LALU
```

Jika menggunakan data inflasi resmi, cantumkan sumber dan periodenya.

---

# 27. LPG HARUS SEPENUHNYA DINAMIS

Jangan hardcode:

```text
HET
Jumlah Agen
Jumlah Pangkalan
Kuota
Realisasi
Persentase Distribusi
```

Semua harus berasal dari Firestore.

Contoh:

```js
{
  het_price: 0,

  het_regulation: "",

  official_agents: 0,

  official_bases: 0,

  monthly_quota: 0,

  distributed: 0,

  distribution_pct: 0,

  updated_at:
    Timestamp
}
```

---

# 28. JANGAN GUNAKAN “340+ PANGKALAN TAAT”

Jika tidak tersedia data kepatuhan terukur, gunakan:

```text
PANGKALAN TERDAFTAR
```

atau:

```text
PANGKALAN AKTIF
```

Jika nantinya tersedia data kepatuhan, pisahkan menjadi:

```text
Pangkalan Terdaftar

Terverifikasi Patuh

Dalam Pengawasan

Pelanggaran Bulan Ini
```

---

# 29. STATUS 12 KECAMATAN HARUS BERBASIS DATA

Setiap kecamatan minimum memiliki:

```js
{
  name: "",

  status: "",

  pangkalan: 0,

  active_reports: 0,

  updated_at:
    Timestamp
}
```

Jika tersedia data stok:

```js
stock_coverage_days
```

dapat dimasukkan.

---

# 30. STATUS KECAMATAN JANGAN SEKADAR WARNA MANUAL

Kategori:

```text
NORMAL
WASPADA
KRITIS
```

harus mempunyai dasar.

Contoh konsep:

```js
function determineStatus(
  data
) {

  if (
    data.stock_coverage_days < 2
  ) {
    return "KRITIS";
  }

  if (
    data.stock_coverage_days < 4
  ) {
    return "WASPADA";
  }

  return "NORMAL";

}
```

Nilai threshold final disesuaikan dengan kebijakan/data dinas.

---

# 31. TAMPILKAN PENJELASAN STATUS KECAMATAN

Lebih baik:

```text
DUAMPANUA

🟡 WASPADA

Stok:
2,8 hari

1 Aduan Aktif
```

daripada hanya:

```text
DUAMPANUA
🟡 WASPADA
```

---

# 32. SP4N-LAPOR! HARUS MENGGUNAKAN DATA AKTUAL

Jika laporan memang tersimpan di Firestore, tambahkan realtime listener.

Contoh:

```js
db.collection(
  "reports"
)
.orderBy(
  "created_at",
  "desc"
)
.limit(5)
.onSnapshot(
  handleReportsSnapshot,
  handleFirestoreError
);
```

---

# 33. JANGAN MENGGUNAKAN LABEL `RESPONS LIVE` JIKA BELUM REALTIME

Jika report belum mempunyai listener realtime, ubah badge menjadi:

```text
MONITORING ADUAN
```

Baru gunakan:

```text
RESPONS LIVE
```

jika memang datanya realtime.

---

# 34. JANGAN TAMPILKAN IDENTITAS PRIBADI PELAPOR

Pada Command Center jangan menampilkan:

```text
Nama Lengkap
Nomor Telepon
NIK
Email
Alamat Lengkap
```

Tampilkan hanya:

```text
ADUAN LPG

DUAMPANUA

STATUS:
DITINDAKLANJUTI

MASUK:
27 AGUSTUS 2026
```

---

# 35. HENTIKAN `innerHTML` UNTUK DATA FIRESTORE

Jangan melakukan:

```js
container.innerHTML =
  data.map(...);
```

untuk data Firestore.

Gunakan:

```text
document.createElement()
textContent
append()
replaceChildren()
```

Contoh:

```js
function createDistrictCard(
  data
) {

  const card =
    document.createElement(
      "div"
    );

  card.className =
    "district-card-item";

  const name =
    document.createElement(
      "strong"
    );

  name.textContent =
    data.name || "-";

  const status =
    document.createElement(
      "span"
    );

  status.textContent =
    data.status || "-";

  card.append(
    name,
    status
  );

  return card;

}
```

---

# 36. SANITASI STRING

Gunakan:

```js
function safeString(
  value,
  fallback = "-"
) {

  if (
    typeof value !==
    "string"
  ) {
    return fallback;
  }

  return value
    .trim()
    .slice(
      0,
      250
    );

}
```

Data Firestore tidak boleh langsung dianggap HTML.

---

# 37. CENTRAL ERROR HANDLER FIRESTORE

Jangan hanya:

```js
console.warn(error);
```

Gunakan:

```js
function handleFirestoreError(
  error
) {

  console.error(
    "Firestore Error:",
    error
  );

  setSystemStatus(
    "cached"
  );

  showSystemNotice(
    "Koneksi data terganggu"
  );

}
```

---

# 38. SIMPAN WAKTU SNAPSHOT TERAKHIR

Setiap snapshot sukses:

```js
lastFirestoreSuccess =
  Date.now();
```

Kemudian monitor:

```js
setInterval(() => {

  const age =
    Date.now() -
    lastFirestoreSuccess;

  if (
    age >
    MAX_FIRESTORE_STALE_MS
  ) {

    setSystemStatus(
      "stale"
    );

  }

}, 30000);
```

---

# 39. ONLINE/OFFLINE DETECTION

Tambahkan:

```js
window.addEventListener(
  "offline",
  () => {

    setSystemStatus(
      "cached"
    );

  }
);
```

```js
window.addEventListener(
  "online",
  () => {

    reconnectRealtimeData();

  }
);
```

Tetapi jangan menganggap:

```js
navigator.onLine === true
```

berarti Firestore pasti aktif.

Status LIVE harus berdasarkan snapshot berhasil.

---

# 40. LOCALSTORAGE HANYA BERFUNGSI SEBAGAI CACHE

Struktur:

```js
{
  data: {...},

  cached_at:
    Date.now(),

  server_updated_at:
    timestamp
}
```

Jika menggunakan cache:

```text
● OFFLINE / CACHE

DATA TERAKHIR:
28 AGU 2026 • 13:20 WITA
```

Jangan tetap tampilkan LIVE.

---

# 41. BUAT FRESHNESS POLICY

Tambahkan fungsi:

```js
function getFreshnessStatus(
  updatedAt,
  maxAgeMinutes
) {

  if (!updatedAt) {
    return "unavailable";
  }

  const age =
    Date.now() -
    updatedAt;

  if (
    age >
    maxAgeMinutes *
    60 *
    1000
  ) {

    return "stale";

  }

  return "fresh";

}
```

Contoh batas awal:

```text
Harga Pasar
24 jam

LPG
6 jam

Pengaduan
30 menit

Cuaca
30 menit

Metrologi
sesuai pembaruan petugas

SKM
sesuai periode survei
```

---

# 42. SKM HARUS MENAMPILKAN PERIODE

Jangan hanya:

```text
89,4 / 100
A
```

Gunakan:

```text
SKM SEMESTER I 2026

89,4 / 100

PREDIKAT A
```

Struktur:

```js
{
  value:
    89.4,

  grade:
    "A",

  period:
    "Semester I 2026",

  updated_at:
    Timestamp
}
```

---

# 43. JADWAL TERA HARUS MEMILIKI TANGGAL DAN STATUS

Struktur:

```js
{
  title: "",

  location: "",

  start_at:
    Timestamp,

  end_at:
    Timestamp,

  status:
    "scheduled",

  result_count:
    null
}
```

Status:

```text
TERJADWAL
BERLANGSUNG
SELESAI
DITUNDA
DIBATALKAN
```

---

# 44. HASIL KEGIATAN TERA

Setelah agenda selesai, jangan tetap menampilkan agenda seolah-olah belum dilaksanakan.

Contoh:

```text
SELESAI

127 UTTP DIPERIKSA

119 SAH

8 PERLU TINDAK LANJUT
```

---

# 45. AUTO-SLIDE GUNAKAN DURASI PER SLIDE

Gunakan:

```js
const slideDurations = [

  15000,

  25000,

  18000,

  20000,

  18000

];
```

Rekomendasi:

```text
IKHTISAR
15 detik

BURSA HARGA
25 detik

METROLOGI
18 detik

LPG
20 detik

INDUSTRI/SP4N
18 detik
```

---

# 46. OPTIMALKAN PROGRESS AUTO-SLIDE

Tidak perlu update progress setiap 100 ms.

Gunakan:

```text
250–500 ms
```

atau CSS animation.

Tujuan:

mengurangi beban CPU untuk wallboard yang berjalan terus-menerus.

---

# 47. PAUSE SAAT TAB BROWSER TIDAK AKTIF

Gunakan:

```js
document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.hidden
    ) {

      pauseAutoSlide();

    }

    else {

      resumeAutoSlide();

    }

  }
);
```

---

# 48. RESPONSIVE HARUS MEMPERHITUNGKAN TINGGI TV

Selain:

```css
@media (max-width: 1100px)
```

tambahkan:

```css
@media (max-height: 850px) {

}
```

```css
@media (max-height: 720px) {

}
```

```css
@media (max-height: 600px) {

}
```

Tujuan:

mencegah content terpotong pada TV dengan viewport pendek.

---

# 49. RESOLUSI WAJIB DITEST

Minimal:

```text
1280 × 720

1366 × 768

1920 × 1080

1920 × 720

2560 × 1440

3840 × 2160
```

Pastikan:

```text
Header tidak terpotong

KPI terbaca

Tabel harga muat

12 kecamatan tetap rapi

Running ticker terlihat

Tidak ada card keluar layar

Auto-slide tetap stabil
```

---

# 50. GUNAKAN `clamp()` UNTUK TYPOGRAPHY

Contoh:

```css
.kpi-num-lg {

  font-size:
    clamp(
      1.8rem,
      2.3vw,
      2.8rem
    );

}
```

Header:

```css
.cc-title-box h1 {

  font-size:
    clamp(
      0.95rem,
      1.2vw,
      1.35rem
    );

}
```

---

# 51. SIMPAN PREFERENSI THEME

Saat tema berubah:

```js
localStorage.setItem(
  "cc_theme",
  newTheme
);
```

Pada initialization:

```js
const savedTheme =
  localStorage.getItem(
    "cc_theme"
  );

if (savedTheme) {

  document
    .documentElement
    .setAttribute(
      "data-theme",
      savedTheme
    );

}
```

---

# 52. FONT FALLBACK

Gunakan:

```css
font-family:
  "Plus Jakarta Sans",
  "Segoe UI",
  Arial,
  sans-serif;
```

Untuk angka:

```css
font-family:
  "Chakra Petch",
  "Roboto Mono",
  monospace;
```

Jika Google Fonts gagal, UI tetap dapat digunakan.

---

# 53. EMPTY STATE WAJIB ADA

Setiap modul harus mengenali:

```text
LOADING
SUCCESS
EMPTY
ERROR
CACHED
STALE
```

Contoh:

```text
MEMUAT DATA...
```

```text
BELUM ADA DATA HARGA HARI INI
```

```text
DATA TIDAK TERSEDIA
```

```text
MENAMPILKAN CACHE TERAKHIR
```

Jangan membiarkan tabel/card kosong tanpa penjelasan.

---

# 54. TICKER JANGAN MEMPUNYAI FALLBACK HARGA PALSU

Jika ticker kosong, jangan otomatis menampilkan nilai harga tertentu.

Fallback cukup:

```text
COMMAND CENTER DISPERINDAG ESDM KABUPATEN PINRANG
```

atau:

```text
MEMUAT INFORMASI TERBARU...
```

---

# 55. DATA TICKER HARUS DINAMIS

Contoh:

```js
{
  items: [

    {
      text:
        "Harga komoditas diperbarui pukul 07.30 WITA",

      status:
        "active"
    },

    {
      text:
        "Pelayanan tera dijadwalkan 29 Agustus 2026",

      status:
        "active"
    }

  ],

  updated_at:
    Timestamp
}
```

---

# 56. PISAHKAN HARGA TERKINI DARI HISTORI

Gunakan collection:

```text
prices_current
```

untuk Command Center.

Jika perlu menyimpan histori:

```text
price_history
```

Command Center jangan listen ke seluruh histori.

---

# 57. BATASI REALTIME QUERY

Jangan:

```js
db.collection(
  "prices"
)
.onSnapshot(...);
```

jika collection dapat terus membesar.

Gunakan:

```js
db.collection(
  "prices_current"
)
.limit(20)
.onSnapshot(...);
```

atau query hanya data aktif.

---

# 58. JUMLAH LISTENER FIRESTORE HARUS DIKENDALIKAN

Target cukup:

```text
1 listener
command_center/metrics

1 listener
command_center/districts

1 listener
prices_current

1 listener
reports_current
```

Jangan membuat satu listener per KPI.

---

# 59. STRUKTUR JAVASCRIPT

Jika refactor dilakukan, pisahkan menjadi:

```text
/js/

command-center.js

firestore-service.js

weather-service.js

renderer.js

validators.js

formatter.js
```

Namun **jangan memindahkan atau mengubah modul jam/tanggal yang sudah diperbaiki jika berisiko menimbulkan regression**.

Refactor hanya apabila aman.

---

# 60. STRUKTUR CSS

Pindahkan CSS secara bertahap ke:

```text
/css/command-center.css
```

Kurangi inline style secara bertahap.

Gunakan class reusable:

```text
.metric-card

.metric-label

.metric-value

.metric-status

.metric-source

.metric-updated
```

---

# 61. JANGAN MELAKUKAN REDESIGN BESAR

Perubahan dilakukan bertahap.

Urutan:

```text
TAHAP 1
Bug + Validitas Data

TAHAP 2
Realtime Status + Cache

TAHAP 3
Security Render

TAHAP 4
Responsive TV

TAHAP 5
Code Refactor
```

Visual existing dipertahankan.

---

# 62. PRIORITAS P0 — WAJIB

```text
[ ] Jangan mengubah modul jam/tanggal existing

[ ] Hapus duplicate syncWeather()

[ ] Refresh cuaca berkala

[ ] Hapus angka fallback realistis

[ ] Gunakan -- untuk data kosong

[ ] Firestore sebagai sumber utama

[ ] localStorage hanya cache

[ ] Badge LIVE dinamis

[ ] Tambahkan status CACHED

[ ] Tambahkan status STALE

[ ] Tambahkan status UNAVAILABLE

[ ] Tambahkan waktu update data

[ ] Validasi semua angka

[ ] Clamp semua percentage

[ ] Hapus hardcode status pasokan

[ ] Harga menggunakan previous_price

[ ] LPG sepenuhnya dinamis

[ ] Status kecamatan berbasis data

[ ] SP4N tidak boleh mengklaim realtime jika belum realtime

[ ] Hilangkan informasi pribadi pelapor

[ ] Hapus innerHTML untuk data dinamis

[ ] Firestore error mengubah status dashboard
```

---

# 63. PRIORITAS P1

```text
[ ] Metadata sumber setiap KPI

[ ] Periode setiap KPI yang membutuhkan periode

[ ] Freshness policy

[ ] Cache metadata

[ ] Harga current vs history

[ ] Batasi query Firestore

[ ] Dynamic slide duration

[ ] Pause slide saat tab hidden

[ ] Responsive berdasarkan tinggi

[ ] clamp typography

[ ] theme persistence

[ ] loading state

[ ] error state

[ ] empty state

[ ] ticker dinamis
```

---

# 64. PRIORITAS P2

```text
[ ] Refactor CSS

[ ] Refactor JavaScript secara aman

[ ] Utility validator

[ ] Utility formatter

[ ] Accessibility dasar

[ ] Reduced motion

[ ] Kurangi inline styles
```

---

# 65. TEST WAJIB SEBELUM DEPLOY

Test:

```text
Firestore normal

Firestore gagal

Internet mati

Internet kembali

Weather API gagal

Weather API kembali

Firestore kosong

Data null

Data string tidak valid

Persentase negatif

Persentase >100

Harga 0

Harga sangat besar

Tidak ada data kecamatan

Tidak ada laporan

Cache tersedia

Cache expired/stale
```

---

# 66. REGRESSION TEST

Karena jam/tanggal sudah diperbaiki, setelah developer melakukan perubahan lain pastikan:

```text
Jam existing tetap berjalan

Tanggal existing tetap benar

Tidak terjadi double interval

Tidak terjadi perubahan format

Tidak terjadi perubahan timezone

Tidak terjadi regression
```

**Tidak perlu mengubah implementasinya. Hanya pastikan tetap bekerja setelah file lain direvisi.**

---

# 67. TEST WALLBOARD JANGKA PANJANG

Jalankan dalam penggunaan panjang.

Periksa:

```text
memory leak

CPU usage

realtime listener

duplicate listener

auto-slide

ticker animation

weather refresh

fullscreen

network reconnect

cache recovery
```

Targetnya Command Center aman digunakan terus menerus pada TV/monitor.

---

# 68. KONDISI HEADER YANG DIHARAPKAN

Ketika normal:

```text
COMMAND CENTER
DISPERINDAG ESDM PINRANG

● LIVE

DATA TERBARU
28 AGU 2026 • 13:38 WITA

[CUACA]

[JAM/TANGGAL EXISTING]
```

Ketika Firestore bermasalah:

```text
● OFFLINE / CACHE

DATA TERAKHIR
28 AGU 2026 • 13:20 WITA
```

Ketika data sudah terlalu lama:

```text
● DATA STALE
```

Ketika tidak ada data:

```text
● DATA TIDAK TERSEDIA
```

---

# 69. PRINSIP FINAL

Developer harus mengikuti prinsip:

**1. Jangan mengubah modul jam/tanggal yang sudah selesai diperbaiki.**

**2. Setiap angka harus mempunyai sumber yang jelas.**

**3. Setiap data operasional harus mempunyai timestamp.**

**4. Angka dummy tidak boleh terlihat sebagai data aktual.**

**5. Cache tidak boleh diberi status LIVE.**

**6. Data lama harus diberi status STALE.**

**7. Data kosong harus menampilkan empty state.**

**8. Status kecamatan harus mempunyai dasar data.**

**9. Status pasokan tidak boleh hardcode.**

**10. Data Firestore tidak boleh langsung dirender sebagai HTML.**

**11. Semua angka dan percentage harus divalidasi.**

**12. Error Firestore harus terlihat pada UI.**

**13. Realtime hanya boleh disebut LIVE jika koneksi dan freshness data memang mendukung.**

**14. Command Center harus tetap ringan dan stabil untuk penggunaan TV jangka panjang.**

**15. Jangan melakukan redesign besar.**

---

# OUTPUT AKHIR YANG DIHARAPKAN

Command Center setelah pembenahan harus memiliki karakter:

```text
DATA VALID
+
SUMBER JELAS
+
TIMESTAMP DATA
+
REALTIME TERUKUR
+
STATUS LIVE
+
STATUS CACHE
+
STATUS STALE
+
EMPTY STATE
+
ERROR STATE
+
CUACA TERKONTROL
+
HARGA DINAMIS
+
STATUS KECAMATAN BERBASIS DATA
+
FIRESTORE EFISIEN
+
RENDER DATA AMAN
+
RESPONSIVE TV
+
STABIL UNTUK WALLBOARD 24/7
```

## BATAS PEKERJAAN

**Kerjakan hanya Command Center.**

Jangan menambahkan pengembangan halaman atau sistem lain pada tahap ini.

Jangan melakukan perubahan pada jam/tanggal existing selain regression test.

Fokus menyempurnakan:

```text
command-center.html

CSS yang digunakan Command Center

JavaScript yang digunakan Command Center

Data Firestore yang langsung digunakan Command Center

Cache Command Center

Weather Command Center
```

sampai halaman stabil, valid, aman, dan dapat dipercaya sebagai TV Wallboard Command Center Disperindag ESDM Kabupaten Pinrang.