// ==============================================================================
// AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC) - PRODUCTION READY
// ==============================================================================

const AUTH_STORE_KEY = "disperindag_users_db_v2";
const SESSION_AUTH_KEY = "disperindag_current_session";
const APP_ENV_KEY = "disperindag_app_env";

// Environment Mode: 'production' (default) | 'development'
function getAppEnv() {
  return localStorage.getItem(APP_ENV_KEY) || 'production';
}

function setAppEnv(env) {
  localStorage.setItem(APP_ENV_KEY, env);
}

function isProduction() {
  return getAppEnv() === 'production';
}

// STRUKTUR PENGGUNA BERBASIS ROLE RESMI DINAS (SINKRON PERBUP 35/2023 & MASTER DATA 2026)
const DEFAULT_SYSTEM_USERS = [
  {
    username: "kadis_pinrang",
    password: "pinrang2026!",
    name: "Muhammad Yusuf Nur, S.STP",
    nip: "19800326 200003 1 001",
    position: "Kepala Dinas",
    unit: "Pimpinan Dinas",
    role: "super_admin",
    roleLabel: "Kepala Dinas (Super Admin)",
    roleIcon: "👑",
    phone: "0823 1600 2226",
    avatar: "assets/officials/kadis_pinrang_opt.jpg",
    bio: "Kepala Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang.",
    canAccessAdmin: true,
    canAccessPetugas: true,
    canManageUsers: true,
    canPublishDirectly: true,
    permissions: ["all"]
  },
  {
    username: "sekretaris_dinas",
    password: "sekretariat2026!",
    name: "Hj. Ratnah, ST, M.Si",
    nip: "19770816 200903 2 004",
    position: "Sekretaris Dinas",
    unit: "Sekretariat",
    role: "sekretariat_admin",
    roleLabel: "Sekretaris Dinas (Admin PPID & Organisasi)",
    roleIcon: "📋",
    phone: "0823 1600 2226",
    avatar: "assets/officials/sekretaris_dinas_opt.jpg",
    bio: "Sekretaris Dinas dan PPID Pelaksana Disperindag ESDM Pinrang.",
    canAccessAdmin: true,
    canAccessPetugas: true,
    canManageUsers: true,
    canPublishDirectly: true,
    permissions: ["ppid", "documents", "organization", "officials", "news", "reports"]
  },
  {
    username: "editor_perdagangan",
    password: "dagang2026!",
    name: "Rusdi, S.Sos",
    nip: "19820112 200212 1 002",
    position: "Kepala Bidang Pengembangan Perdagangan",
    unit: "Bidang Pengembangan Perdagangan",
    role: "perdagangan_editor",
    roleLabel: "Kabid Perdagangan & Tim TPID",
    roleIcon: "🛒",
    phone: "0823 1600 2226",
    avatar: "assets/brand/logo_pinrang_opt.png",
    bio: "Pengendalian stabilitas pasokan, pemantauan harga 12 bapokting, dan operasi pasar.",
    canAccessAdmin: true,
    canAccessPetugas: true,
    canManageUsers: false,
    canPublishDirectly: true,
    permissions: ["prices", "markets", "news"]
  },
  {
    username: "editor_esdm_industri",
    password: "esdm2026!",
    name: "Nasrawianty Vetraniwati Nasri, S.AP",
    nip: "19780921 200212 2 005",
    position: "Kepala Bidang Perindustrian, Energi dan SDM",
    unit: "Bidang Perindustrian, Energi dan SDM",
    role: "industri_esdm_editor",
    roleLabel: "Kabid Perindustrian, ESDM & Pengawas LPG",
    roleIcon: "⚡",
    phone: "0823 1600 2226",
    avatar: "assets/brand/logo_pinrang_opt.png",
    bio: "Pengawasan distribusi elpiji 3 kg bersubsidi dan fasilitasi klinik sertifikasi IKM Pinrang.",
    canAccessAdmin: true,
    canAccessPetugas: true,
    canManageUsers: false,
    canPublishDirectly: true,
    permissions: ["ikm", "lpg", "news", "reports"]
  },
  {
    username: "editor_kemetrologian",
    password: "metrologi2026!",
    name: "Arhan Razak, S.IP",
    nip: "19700823 200212 1 003",
    position: "Kepala Bidang Kemetrologian",
    unit: "Bidang Kemetrologian",
    role: "kemetrologian_editor",
    roleLabel: "Kabid Kemetrologian (Metrologi Legal)",
    roleIcon: "⚖️",
    phone: "0823 1600 2226",
    avatar: "assets/brand/logo_pinrang_opt.png",
    bio: "Pelayanan sidang tera dan pengawasan akurasi UTTP timbangan pasar serta nozzle SPBU.",
    canAccessAdmin: true,
    canAccessPetugas: true,
    canManageUsers: false,
    canPublishDirectly: true,
    permissions: ["tera", "services", "news", "reports"]
  },
  {
    username: "editor_distribusi",
    password: "distribusi2026!",
    name: "Abdul Rauf, S.E",
    nip: "19700622 200212 1 003",
    position: "Kepala Bidang Sarana & Pelaku Distribusi",
    unit: "Bidang Sarana dan Pelaku Distribusi",
    role: "distribusi_editor",
    roleLabel: "Kabid Sarana Pasar & Distribusi",
    roleIcon: "🏪",
    phone: "0823 1600 2226",
    avatar: "assets/brand/logo_pinrang_opt.png",
    bio: "Pengelolaan sarana pasar rakyat, penataan kios/lapak, dan pembinaan distributor pupuk.",
    canAccessAdmin: true,
    canAccessPetugas: true,
    canManageUsers: false,
    canPublishDirectly: true,
    permissions: ["pasar", "distribution", "news"]
  },
  {
    username: "petugas_pasar_sentral",
    password: "pasar2026!",
    name: "Eka Raharja, SH",
    nip: "19830414 200801 1 011",
    position: "Kepala UPTD Pasar Wilayah I (Pasar Sentral)",
    unit: "UPTD Pasar Wilayah I",
    role: "pasar_petugas",
    roleLabel: "Kepala UPTD Pasar Wilayah I",
    roleIcon: "🏬",
    phone: "0823 1600 2226",
    avatar: "assets/brand/logo_pinrang_opt.png",
    bio: "Operasional pengelolaan dan ketertiban 786 lapak aktif di Pasar Sentral Pinrang.",
    canAccessAdmin: false,
    canAccessPetugas: true,
    canManageUsers: false,
    canPublishDirectly: false,
    permissions: ["pasar", "prices"]
  }
];

// Inisialisasi Database Pengguna (Versi Terkini 2026)
function initAuthStore() {
  const targetAuthVer = "2026_08_28_users_v3";
  const currentVer = localStorage.getItem("disperindag_users_version");
  if (currentVer !== targetAuthVer) {
    localStorage.setItem(AUTH_STORE_KEY, JSON.stringify(DEFAULT_SYSTEM_USERS));
    localStorage.setItem("disperindag_users_version", targetAuthVer);
  }
}
initAuthStore();

function getAllUsers() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORE_KEY)) || DEFAULT_SYSTEM_USERS;
  } catch (e) {
    return DEFAULT_SYSTEM_USERS;
  }
}

function saveAllUsers(users) {
  localStorage.setItem(AUTH_STORE_KEY, JSON.stringify(users));
}

// Autentikasi Login Resmi
function authenticateUser(username, password) {
  const users = getAllUsers();
  const found = users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());
  if (!found) {
    return { success: false, message: "Nama Pengguna (Username) tidak terdaftar dalam sistem." };
  }
  if (found.password !== password) {
    return { success: false, message: "Kata sandi yang Anda masukkan salah. Silakan coba kembali." };
  }

  // Set Session Aktif
  const sessionUser = {
    username: found.username,
    name: found.name,
    nip: found.nip,
    position: found.position,
    unit: found.unit,
    role: found.role,
    roleLabel: found.roleLabel,
    roleIcon: found.roleIcon,
    phone: found.phone,
    avatar: found.avatar,
    bio: found.bio,
    canAccessAdmin: found.canAccessAdmin,
    canAccessPetugas: found.canAccessPetugas,
    permissions: found.permissions,
    loginAt: new Date().toISOString()
  };

  localStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(sessionUser));
  return { success: true, user: sessionUser };
}

function getCurrentSession() {
  try {
    const raw = localStorage.getItem(SESSION_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function logoutUser() {
  localStorage.removeItem(SESSION_AUTH_KEY);
  window.location.href = "login.html";
}

// Guard Akses Halaman (RBAC Enforcement)
function requireAuth(allowedTypes = ['admin', 'petugas']) {
  const session = getCurrentSession();
  if (!session) {
    window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    return null;
  }

  if (allowedTypes.includes('admin') && !session.canAccessAdmin) {
    CustomModal.alert({
      title: "Akses Terbatas",
      message: `Akun Anda dengan peran <strong>${session.roleLabel}</strong> tidak memiliki izin akses ke Panel CMS Administrator. Anda akan dialihkan ke Aplikasi Petugas.`,
      icon: "🚫",
      type: "error",
      onClose: () => {
        window.location.href = "petugas.html";
      }
    });
    return null;
  }

  return session;
}

// Pembaruan Profil Mandiri ASN (Hanya Foto, Nomor Kontak, Bio, dan Password)
function updateSelfProfile(updateData) {
  const session = getCurrentSession();
  if (!session) return { success: false, message: "Sesi telah berakhir." };

  const users = getAllUsers();
  const idx = users.findIndex(u => u.username === session.username);
  if (idx === -1) return { success: false, message: "Pengguna tidak ditemukan." };

  if (updateData.phone) users[idx].phone = updateData.phone;
  if (updateData.avatar) users[idx].avatar = updateData.avatar;
  if (updateData.bio) users[idx].bio = updateData.bio;

  if (updateData.newPassword) {
    if (updateData.currentPassword !== users[idx].password) {
      return { success: false, message: "Kata sandi lama Anda tidak sesuai." };
    }
    users[idx].password = updateData.newPassword;
  }

  saveAllUsers(users);

  // Sync session
  session.phone = users[idx].phone;
  session.avatar = users[idx].avatar;
  session.bio = users[idx].bio;
  localStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(session));

  return { success: true, message: "Profil dan kredensial Anda berhasil diperbarui." };
}
