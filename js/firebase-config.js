/**
 * KONFIGURASI DAN SERVICE CLOUD FIRESTORE RESMI (FIREBASE SPARK PLAN - 100% GRATIS)
 * Proyek: disperindagesdm-pinrang (Google Cloud / Firebase)
 */

// 1. Kredensial Firebase Proyek Resmi Disperindag ESDM Kabupaten Pinrang
const firebaseConfig = {
  apiKey: "AIzaSyD4J1kidUcBcz7EdmYRIY66YR5jOEO477I",
  authDomain: "disperindagesdm-pinrang.firebaseapp.com",
  projectId: "disperindagesdm-pinrang",
  storageBucket: "disperindagesdm-pinrang.firebasestorage.app",
  messagingSenderId: "765525972049",
  appId: "1:765525972049:web:5f6f8684c9f9685fa61470"
};

let isFirebaseReady = false;
let db = null;
let auth = null;

// 2. Inisialisasi Firebase jika library dan kredensial valid
try {
  if (typeof firebase !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY") {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    auth = typeof firebase.auth === 'function' ? firebase.auth() : null;
    // Persistence offline sengaja tidak diaktifkan: data operasional hanya
    // ditampilkan atau dinyatakan tersimpan setelah berasal dari server.
    isFirebaseReady = true;
    console.log("[+] Firebase Cloud Firestore disperindagesdm-pinrang BERHASIL TERHUBUNG!");
  } else {
    console.log("[*] Berjalan dalam Mode Hybrid Offline (LocalStorage Sync).");
  }
} catch (e) {
  console.warn("[-] Gagal inisialisasi Firebase:", e);
}

// 3. Database Service Terpadu (Cloud Firestore + LocalStorage Fallback)
const DBService = {
  // --- A. SEMBAKO HARIAN ---
  async getSembako(callback) {
    if (isFirebaseReady) {
      db.collection("sembako").orderBy("name").onSnapshot(snapshot => {
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        if (items.length > 0) {
          if (callback) callback(items);
        } else if (callback) callback([]);
      });
    } else {
      if (callback) callback([]);
    }
  },

  async updateSembakoPrice(id, newPrice, prevPrice) {
    let trend = 'stable';
    if (newPrice > prevPrice) trend = 'up';
    else if (newPrice < prevPrice) trend = 'down';

    if (isFirebaseReady) {
      await db.collection("sembako").doc(id).update({
        price: newPrice,
        prevPrice: prevPrice,
        trend: trend,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else throw new Error('Firestore tidak tersedia; perubahan harga tidak disimpan.');
  },

  async addSembako(item) {
    if (isFirebaseReady) {
      const docRef = await db.collection("sembako").add({
        ...item,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } else throw new Error('Firestore tidak tersedia; komoditas tidak disimpan.');
  },

  // --- B. BERITA & PUBLIKASI ---
  async getNews(callback) {
    if (isFirebaseReady) {
      db.collection("news").where("status", "==", "published").onSnapshot(snapshot => {
        const newsList = [];
        snapshot.forEach(doc => newsList.push({ id: doc.id, ...doc.data() }));
        if (newsList.length > 0) {
          if (callback) callback(newsList);
        } else if (callback) callback([]);
      });
    } else {
      if (callback) callback([]);
    }
  },

  async addNews(newsItem) {
    if (isFirebaseReady) {
      const docRef = await db.collection("news").add({
        ...newsItem,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } else throw new Error('Firestore tidak tersedia; berita tidak disimpan.');
  },

  // --- C. ADUAN MASYARAKAT ---
  async sendComplaint(complaint) {
    if (isFirebaseReady) {
      await db.collection("reports").doc(complaint.id).set({
        ...complaint,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return complaint.id;
    }
    throw new Error('Firestore tidak tersedia; laporan tidak dikirim.');
  }
};

window.DBService = DBService;
window.isFirebaseReady = isFirebaseReady;
