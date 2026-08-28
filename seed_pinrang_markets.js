/**
 * Seed Master Data Direktori 17 Pasar Kabupaten Pinrang ke Firebase Firestore
 * Collection: markets/{marketId}
 */

const fs = require('fs');
const path = require('path');

const marketsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'data', 'markets.json'), 'utf8'));

async function seedMarketsToFirestore(db) {
  if (!db) {
    console.error("Firestore instance required!");
    return;
  }

  console.log(`Starting seed of ${marketsData.length} markets to Firestore...`);
  const batch = db.batch();

  marketsData.forEach(market => {
    const docRef = db.collection('markets').doc(market.id);
    batch.set(docRef, {
      ...market,
      updated_at: new Date().toISOString(),
      updated_by: "administrator_disperindag"
    }, { merge: true });
  });

  await batch.commit();
  console.log("Successfully seeded 17 markets to Firestore collection 'markets'!");
}

if (typeof module !== 'undefined') {
  module.exports = { seedMarketsToFirestore, marketsData };
}
