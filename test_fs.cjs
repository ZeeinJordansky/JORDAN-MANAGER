const admin = require("firebase-admin");
const serviceAccount = require("./firebase-applet-config.json");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();
db.collection("vk_processed_events").doc("test_123").set({ time: Date.now() })
  .then(() => console.log("Firestore SUCCESS"))
  .catch((e) => console.error("Firestore ERROR:", e));
