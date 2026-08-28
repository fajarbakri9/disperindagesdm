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
    auth = firebase.auth();
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
          setStorage('disperindag_sembako', items);
          if (callback) callback(items);
        } else {
          // Inisialisasi awal ke Firestore jika kosong
          DEFAULT_SEMBAKO.forEach(item => db.collection("sembako").doc(item.id).set(item));
          if (callback) callback(DEFAULT_SEMBAKO);
        }
      });
    } else {
      const local = getStorage('disperindag_sembako', DEFAULT_SEMBAKO);
      if (callback) callback(local);
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
    } else {
      let list = getStorage('disperindag_sembako', DEFAULT_SEMBAKO);
      const item = list.find(s => s.id === id);
      if (item) {
        item.prevPrice = prevPrice;
        item.price = newPrice;
        item.trend = trend;
        setStorage('disperindag_sembako', list);
      }
    }
  },

  async addSembako(item) {
    if (isFirebaseReady) {
      const docRef = await db.collection("sembako").add({
        ...item,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } else {
      let list = getStorage('disperindag_sembako', DEFAULT_SEMBAKO);
      list.push(item);
      setStorage('disperindag_sembako', list);
      return item.id;
    }
  },

  // --- B. BERITA & PUBLIKASI ---
  async getNews(callback) {
    if (isFirebaseReady) {
      db.collection("news").orderBy("createdAt", "desc").onSnapshot(snapshot => {
        const newsList = [];
        snapshot.forEach(doc => newsList.push({ id: doc.id, ...doc.data() }));
        if (newsList.length > 0) {
          setStorage('disperindag_news', newsList);
          if (callback) callback(newsList);
        } else {
          DEFAULT_NEWS.forEach(item => db.collection("news").doc(item.id).set({
            ...item,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          }));
          if (callback) callback(DEFAULT_NEWS);
        }
      });
    } else {
      const local = getStorage('disperindag_news', DEFAULT_NEWS);
      if (callback) callback(local);
    }
  },

  async addNews(newsItem) {
    if (isFirebaseReady) {
      const docRef = await db.collection("news").add({
        ...newsItem,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } else {
      let newsList = getStorage('disperindag_news', DEFAULT_NEWS);
      newsList.unshift(newsItem);
      setStorage('disperindag_news', newsList);
      return newsItem.id;
    }
  },

  // --- C. ADUAN MASYARAKAT ---
  async sendComplaint(complaint) {
    if (isFirebaseReady) {
      await db.collection("reports").add({
        ...complaint,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      let reports = getStorage('disperindag_reports', DEFAULT_REPORTS);
      reports.unshift(complaint);
      setStorage('disperindag_reports', reports);
    }
  }
};

window.DBService = DBService;
window.isFirebaseReady = isFirebaseReady;
