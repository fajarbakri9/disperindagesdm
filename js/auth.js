// ==============================================================================
// AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC) - PRODUCTION READY
// ==============================================================================

const AUTH_STORE_KEY = "disperindag_users_db_v2";
const SESSION_AUTH_KEY = "disperindag_current_session";
const APP_ENV_KEY = "disperindag_app_env";

// Environment Mode: 'production' (default) | 'development'
function getAppEnv() {
  // Hosting publik selalu production. Nilai localStorage tidak boleh dapat
  // mengaktifkan mode developer pada origin produksi.
  if (window.location.hostname === 'disperindagesdm-pinrang.web.app' || window.location.hostname === 'disperindagesdm-pinrang.firebaseapp.com') {
    return 'production';
  }
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
    password: "",
    name: "Muhammad Yusuf Nur, S.STP",
    nip: "19800326 200003 1 001",
    position: "Kepala Dinas",
    unit: "Pimpinan Dinas",
    role: "super_admin",
    roleLabel: "Kepala Dinas (Super Admin)",
    roleIcon: "👑",
    phone: "0823 1600 2226",
    avatar: "assets/officials/kadis_muhammad_yusuf_nur_2026.jpg",
    bio: "Kepala Dinas Perindustrian, Perdagangan, Energi dan Sumber Daya Mineral Kabupaten Pinrang.",
    canAccessAdmin: true,
    canAccessPetugas: true,
    canManageUsers: true,
    canPublishDirectly: true,
    permissions: ["all"]
  },
  {
    username: "sekretaris_dinas",
    password: "",
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
    password: "",
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
    password: "",
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
    password: "",
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
    password: "",
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
    password: "",
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
    canAccessLpgAgen: false,
    canManageUsers: false,
    canPublishDirectly: false,
    permissions: ["pasar", "prices"]
  },
  // 8 AKUN RESMI AGEN LPG 3 KG KABUPATEN PINRANG (BASELINE MIGAS ESDM Q1 2026)
  {
    username: "agen_gasifa",
    password: "",
    name: "Operator PT. Gasifa Mulya Persada",
    position: "Admin Penyalur LPG",
    unit: "Agen LPG 3 Kg",
    agentId: "AG-001",
    agentName: "PT. GASIFA MULYA PERSADA",
    role: "LPG_AGENT_ADMIN",
    roleLabel: "Agen PT. Gasifa Mulya Persada",
    roleIcon: "🔥",
    phone: "0812 4292 1215",
    avatar: "assets/brand/logo_pinrang_opt.png",
    bio: "Penyalur resmi gas elpiji 3 kg bersubsidi PT. Gasifa Mulya Persada Kabupaten Pinrang.",
    canAccessAdmin: false,
    canAccessPetugas: false,
    canAccessLpgAgen: true,
    canManageUsers: false,
    canPublishDirectly: false,
    permissions: ["lpg_agent"]
  },
  {
    username: "agen_hamisa",
    password: "",
    name: "Operator PT. Hamisa Sukrah Mulya",
    position: "Admin Penyalur LPG",
    unit: "Agen LPG 3 Kg",
    agentId: "AG-002",
    agentName: "PT. HAMISA SUKRAH MULYA",
    role: "LPG_AGENT_ADMIN",
    roleLabel: "Agen PT. Hamisa Sukrah Mulya",
    roleIcon: "🔥",
    phone: "0812 4292 1215",
    avatar: "assets/brand/logo_pinrang_opt.png",
    bio: "Penyalur resmi gas elpiji 3 kg bersubsidi PT. Hamisa Sukrah Mulya Kabupaten Pinrang.",
    canAccessAdmin: false,
    canAccessPetugas: false,
    canAccessLpgAgen: true,
    canManageUsers: false,
    canPublishDirectly: false,
    permissions: ["lpg_agent"]
  },
  {
    username: "agen_hasyim",
    password: "",
    name: "Operator PT. H. Abd Rahman Hasyim",
    position: "Admin Penyalur LPG",
    unit: "Agen LPG 3 Kg",
    agentId: "AG-003",
    agentName: "PT. H. ABD RAHMAN HASYIM",
    role: "LPG_AGENT_ADMIN",
    roleLabel: "Agen PT. H. Abd Rahman Hasyim",
    roleIcon: "🔥",
    phone: "0812 4292 1215",
    avatar: "assets/brand/logo_pinrang_opt.png",
    bio: "Penyalur resmi gas elpiji 3 kg bersubsidi PT. H. Abd Rahman Hasyim Kabupaten Pinrang.",
    canAccessAdmin: false,
    canAccessPetugas: false,
    canAccessLpgAgen: true,
    canManageUsers: false,
    canPublishDirectly: false,
    permissions: ["lpg_agent"]
  },
  {
    username: "agen_nurcahaya",
    password: "",
    name: "Operator PT. Nurcahaya Energi Abadi",
    position: "Admin Penyalur LPG",
    unit: "Agen LPG 3 Kg",
    agentId: "AG-004",
    agentName: "PT. NURCAHAYA ENERGI ABADI",
    role: "LPG_AGENT_ADMIN",
    roleLabel: "Agen PT. Nurcahaya Energi Abadi",
    roleIcon: "🔥",
    phone: "0812 4292 1215",
    avatar: "assets/brand/logo_pinrang_opt.png",
    bio: "Penyalur resmi gas elpiji 3 kg bersubsidi PT. Nurcahaya Energi Abadi Kabupaten Pinrang.",
    canAccessAdmin: false,
    canAccessPetugas: false,
    canAccessLpgAgen: true,
    canManageUsers: false,
    canPublishDirectly: false,
    permissions: ["lpg_agent"]
  },
  {
    username: "agen_wahyu",
    password: "",
    name: "Operator PT. Wahyu Dwi Kencana Mandiri",
    position: "Admin Penyalur LPG",
    unit: "Agen LPG 3 Kg",
    agentId: "AG-005",
    agentName: "PT. WAHYU DWI KENCANA MANDIRI",
    role: "LPG_AGENT_ADMIN",
    roleLabel: "Agen PT. Wahyu Dwi Kencana Mandiri",
    roleIcon: "🔥",
    phone: "0812 4292 1215",
    avatar: "assets/brand/logo_pinrang_opt.png",
    bio: "Penyalur resmi gas elpiji 3 kg bersubsidi PT. Wahyu Dwi Kencana Mandiri Kabupaten Pinrang.",
    canAccessAdmin: false,
    canAccessPetugas: false,
    canAccessLpgAgen: true,
    canManageUsers: false,
    canPublishDirectly: false,
    permissions: ["lpg_agent"]
  },
  {
    username: "agen_nasman",
    password: "",
    name: "Operator PT. Nasman Hafid Mandiri",
    position: "Admin Penyalur LPG",
    unit: "Agen LPG 3 Kg",
    agentId: "AG-006",
    agentName: "PT. NASMAN HAFID MANDIRI",
    role: "LPG_AGENT_ADMIN",
    roleLabel: "Agen PT. Nasman Hafid Mandiri",
    roleIcon: "🔥",
    phone: "0812 4292 1215",
    avatar: "assets/brand/logo_pinrang_opt.png",
    bio: "Penyalur resmi gas elpiji 3 kg bersubsidi PT. Nasman Hafid Mandiri Kabupaten Pinrang.",
    canAccessAdmin: false,
    canAccessPetugas: false,
    canAccessLpgAgen: true,
    canManageUsers: false,
    canPublishDirectly: false,
    permissions: ["lpg_agent"]
  },
  {
    username: "agen_amiruddin",
    password: "",
    name: "Operator PT. H. Amiruddin Rahman",
    position: "Admin Penyalur LPG",
    unit: "Agen LPG 3 Kg",
    agentId: "AG-007",
    agentName: "PT. H. AMIRUDDIN RAHMAN",
    role: "LPG_AGENT_ADMIN",
    roleLabel: "Agen PT. H. Amiruddin Rahman",
    roleIcon: "🔥",
    phone: "0812 4292 1215",
    avatar: "assets/brand/logo_pinrang_opt.png",
    bio: "Penyalur resmi gas elpiji 3 kg bersubsidi PT. H. Amiruddin Rahman Kabupaten Pinrang.",
    canAccessAdmin: false,
    canAccessPetugas: false,
    canAccessLpgAgen: true,
    canManageUsers: false,
    canPublishDirectly: false,
    permissions: ["lpg_agent"]
  },
  {
    username: "agen_kaka",
    password: "",
    name: "Operator PT. Kaka Migas Utama",
    position: "Admin Penyalur LPG",
    unit: "Agen LPG 3 Kg",
    agentId: "AG-008",
    agentName: "PT. KAKA MIGAS UTAMA",
    role: "LPG_AGENT_ADMIN",
    roleLabel: "Agen PT. Kaka Migas Utama",
    roleIcon: "🔥",
    phone: "0812 4292 1215",
    avatar: "assets/brand/logo_pinrang_opt.png",
    bio: "Penyalur resmi gas elpiji 3 kg bersubsidi PT. Kaka Migas Utama Kabupaten Pinrang.",
    canAccessAdmin: false,
    canAccessPetugas: false,
    canAccessLpgAgen: true,
    canManageUsers: false,
    canPublishDirectly: false,
    permissions: ["lpg_agent"]
  }
];

// Inisialisasi Database Pengguna (Versi Terkini 2026)
function initAuthStore() {
  if (isProduction()) return;
  const targetAuthVer = "2026_08_30_auth_nondestructive_v2";
  const currentVer = localStorage.getItem("disperindag_users_version");
  if (currentVer !== targetAuthVer) {
    // Jangan reset akun/perubahan profil setiap deploy. Default hanya untuk
    // instalasi kosong sampai migrasi Firebase Authentication diselesaikan.
    if (!localStorage.getItem(AUTH_STORE_KEY)) {
      localStorage.setItem(AUTH_STORE_KEY, JSON.stringify(DEFAULT_SYSTEM_USERS));
    }
    localStorage.setItem("disperindag_users_version", targetAuthVer);
  }

  // Perbarui juga sesi yang sudah aktif agar avatar lama tidak bertahan di browser.
  try {
    const currentSession = JSON.parse(localStorage.getItem(SESSION_AUTH_KEY));
    if (currentSession && currentSession.username === "kadis_pinrang") {
      currentSession.avatar = "assets/officials/kadis_muhammad_yusuf_nur_2026.jpg";
      localStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(currentSession));
    }
  } catch (e) {}
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
  if (isProduction()) {
    return { success: false, message: "Login username lama telah dinonaktifkan. Gunakan akun email Firebase resmi." };
  }
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
    nip: found.nip || null,
    position: found.position,
    unit: found.unit,
    agentId: found.agentId || null,
    agentName: found.agentName || null,
    role: found.role,
    roleLabel: found.roleLabel,
    roleIcon: found.roleIcon,
    phone: found.phone,
    avatar: found.avatar,
    bio: found.bio,
    canAccessAdmin: found.canAccessAdmin || false,
    canAccessPetugas: found.canAccessPetugas || false,
    canAccessLpgAgen: found.canAccessLpgAgen || false,
    permissions: found.permissions || [],
    loginAt: new Date().toISOString()
  };

  localStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(sessionUser));
  return { success: true, user: sessionUser };
}

async function authenticateFirebaseUser(email, password) {
  if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db) {
    return { success: false, message: "Layanan Firebase Authentication belum tersedia." };
  }

  try {
    const credential = await auth.signInWithEmailAndPassword(email.trim().toLowerCase(), password);
    const profileSnapshot = await db.collection('users').doc(credential.user.uid).get({ source: 'server' });
    if (!profileSnapshot.exists) {
      await auth.signOut();
      return { success: false, message: "Akun berhasil diautentikasi tetapi belum mempunyai profil akses Disperindag." };
    }

    const profile = profileSnapshot.data();
    if (profile.status !== 'ACTIVE') {
      await auth.signOut();
      return { success: false, message: "Akun Firebase tidak aktif. Hubungi administrator." };
    }

    const adminRoles = [
      'SUPER_ADMIN', 'DISPERINDAG_ADMIN', 'SECRETARIAT_ADMIN',
      'TRADE_EDITOR', 'INDUSTRY_ESDM_EDITOR', 'METROLOGY_EDITOR',
      'DISTRIBUTION_EDITOR', 'PUBLIC_RELATIONS_EDITOR', 'LPG_ADMIN'
    ];
    const lpgAgentRoles = ['LPG_AGENT_ADMIN', 'LPG_AGENT_OPERATOR'];
    const sessionUser = {
      uid: credential.user.uid,
      email: credential.user.email,
      authProvider: 'FIREBASE',
      username: profile.username || credential.user.email,
      name: profile.name || credential.user.displayName || credential.user.email,
      position: profile.position || null,
      unit: profile.unit || null,
      agentId: profile.agentId || null,
      agentName: profile.agentName || null,
      role: profile.role,
      roleLabel: profile.roleLabel || profile.role,
      roleIcon: profile.roleIcon || '🔐',
      canAccessAdmin: adminRoles.includes(profile.role),
      canAccessPetugas: profile.canAccessPetugas === true,
      canAccessLpgAgen: lpgAgentRoles.includes(profile.role),
      permissions: Array.isArray(profile.permissions) ? profile.permissions : [],
      loginAt: new Date().toISOString()
    };
    localStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(sessionUser));
    return { success: true, user: sessionUser };
  } catch (error) {
    const friendly = {
      'auth/invalid-credential': 'Email atau kata sandi Firebase tidak sesuai.',
      'auth/user-disabled': 'Akun Firebase telah dinonaktifkan.',
      'auth/too-many-requests': 'Terlalu banyak percobaan login. Silakan coba beberapa saat lagi.',
      'auth/network-request-failed': 'Koneksi ke layanan login gagal. Periksa internet atau domain Firebase.',
      'auth/operation-not-allowed': 'Metode login Email/Password belum diaktifkan di Firebase.',
      'auth/invalid-api-key': 'Konfigurasi Firebase tidak valid. Hubungi administrator.'
    };
    return { success: false, message: friendly[error.code] || (error.code === 'permission-denied' ? 'Login berhasil, tetapi profil akses tidak dapat dibaca. Periksa aturan akses Firebase.' : 'Login Firebase gagal. Periksa koneksi dan kredensial Anda.') };
  }
}

async function requireFirebaseLpgSession() {
  if (typeof auth === 'undefined' || !auth || typeof db === 'undefined' || !db) return null;
  const user = auth.currentUser || await new Promise(resolve => {
    const stop = auth.onAuthStateChanged(value => { stop(); resolve(value || null); });
  });
  if (!user || !navigator.onLine) return null;
  try {
    const snapshot = await db.collection('users').doc(user.uid).get({ source: 'server' });
    if (!snapshot.exists) return null;
    const profile = snapshot.data();
    const allowedRoles = ['LPG_AGENT_ADMIN', 'LPG_AGENT_OPERATOR'];
    if (profile.status !== 'ACTIVE' || !allowedRoles.includes(profile.role) || !profile.agentId) return null;
    return {
      uid: user.uid, email: user.email, authProvider: 'FIREBASE',
      username: profile.username || user.email, name: profile.name || user.displayName || user.email,
      agentId: profile.agentId, agentName: profile.agentName || profile.name,
      role: profile.role, roleLabel: profile.roleLabel || profile.role,
      canAccessAdmin: false, canAccessLpgAgen: true,
      permissions: Array.isArray(profile.permissions) ? profile.permissions : []
    };
  } catch (error) {
    console.error('[LPG][AUTH_SERVER_PROFILE_ERROR]', { code: error.code || 'unknown' });
    return null;
  }
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
  if (typeof auth !== 'undefined' && auth && auth.currentUser) {
    auth.signOut().finally(() => { window.location.href = "login.html"; });
    return;
  }
  window.location.href = "login.html";
}

// Guard Akses Halaman (RBAC Enforcement)
function requireAuth(allowedTypes = ['admin', 'petugas', 'lpg_agen']) {
  const session = getCurrentSession();
  if (!session) {
    window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
    return null;
  }

  if (allowedTypes.includes('lpg_agen') && allowedTypes.length === 1 && !session.canAccessLpgAgen && !session.canAccessAdmin) {
    CustomModal.alert({
      title: "Akses Khusus Agen LPG",
      message: `Akun Anda tidak terdaftar sebagai perwakilan resmi Agen Penyalur LPG 3 Kg.`,
      icon: "🚫",
      type: "error",
      onClose: () => {
        window.location.href = session.canAccessAdmin ? "admin.html" : "petugas.html";
      }
    });
    return null;
  }

  if (allowedTypes.includes('admin') && !session.canAccessAdmin) {
    CustomModal.alert({
      title: "Akses Terbatas",
      message: `Akun Anda dengan peran <strong>${session.roleLabel}</strong> tidak memiliki izin akses ke Panel CMS Administrator.`,
      icon: "🚫",
      type: "error",
      onClose: () => {
        window.location.href = session.canAccessLpgAgen ? "lpg-agen.html" : "petugas.html";
      }
    });
    return null;
  }
  /* Legacy orphaned modal fragment disabled.
      icon: "🚫",
      type: "error",
      onClose: () => {
        window.location.href = "petugas.html";
      }
    });
    return null;
  }
  */

  if (allowedTypes.includes('petugas') && allowedTypes.length === 1 && !session.canAccessPetugas && !session.canAccessAdmin) {
    CustomModal.alert({
      title: "Akses Terbatas",
      message: "Akun Anda tidak memiliki izin mengakses Portal Petugas.",
      icon: "🚫",
      type: "error",
      onClose: () => {
        window.location.href = session.canAccessLpgAgen ? "lpg-agen.html" : "login.html";
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

async function updateFirebaseSelfProfile(updateData) {
  const session = getCurrentSession();
  if (!session || session.authProvider !== 'FIREBASE' || !session.uid || typeof db === 'undefined' || !db) {
    return { success: false, message: 'Sesi Firebase tidak tersedia.' };
  }
  try {
    const safeUpdate = {
      phone: (updateData.phone || '').trim(),
      bio: (updateData.bio || '').trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('users').doc(session.uid).update(safeUpdate);
    session.phone = safeUpdate.phone;
    session.bio = safeUpdate.bio;
    if (updateData.avatar) session.avatar = updateData.avatar;
    localStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(session));
    return { success: true, message: 'Profil Firebase berhasil diperbarui.' };
  } catch (error) {
    return { success: false, message: 'Profil Firebase gagal diperbarui.' };
  }
}

async function updateFirebasePassword(currentPassword, newPassword) {
  const session = getCurrentSession();
  const user = typeof auth !== 'undefined' && auth ? auth.currentUser : null;
  if (!session || session.authProvider !== 'FIREBASE' || !user || !user.email) {
    return { success: false, message: 'Sesi Firebase tidak tersedia. Silakan login ulang.' };
  }
  try {
    const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
    await user.reauthenticateWithCredential(credential);
    await user.updatePassword(newPassword);
    return { success: true, message: 'Kata sandi Firebase berhasil diperbarui.' };
  } catch (error) {
    const messages = {
      'auth/invalid-credential': 'Kata sandi lama tidak sesuai.',
      'auth/wrong-password': 'Kata sandi lama tidak sesuai.',
      'auth/weak-password': 'Kata sandi baru belum memenuhi persyaratan keamanan.',
      'auth/too-many-requests': 'Terlalu banyak percobaan. Silakan coba beberapa saat lagi.'
    };
    return { success: false, message: messages[error.code] || 'Kata sandi Firebase gagal diperbarui.' };
  }
}
