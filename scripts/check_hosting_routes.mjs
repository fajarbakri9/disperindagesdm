const base = process.env.HOSTING_TEST_ORIGIN || "http://127.0.0.1:5000";
const checks = [
  { path: "/berita", status: 200, contains: "Berita" },
  { path: "/berita/monitoring-harga-pangan", status: 200, contains: "Pantauan Harian Bapokting" },
  { path: "/profil", status: 200, contains: "Daftar Lengkap Pegawai" },
  { path: "/tidak-ada-xyz", status: 404, contains: "404" },
];

let failed = false;
for (const check of checks) {
  const response = await fetch(base + check.path);
  const body = await response.text();
  const ok = response.status === check.status && body.includes(check.contains);
  console.log(`${ok ? "PASS" : "FAIL"} ${check.path} HTTP ${response.status}`);
  failed ||= !ok;
}

if (failed) process.exitCode = 1;
