const admin = require("firebase-admin");
const serviceAccount = require("./firebase-applet-config.json");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function test() {
  const docId = "test_event_id_" + Date.now();
  try {
    await db.collection("test_dedup").doc(docId).create({ time: Date.now() });
    console.log("First create succeeded");
  } catch (e) {
    console.log("First create failed", e.code);
  }
  
  try {
    await db.collection("test_dedup").doc(docId).create({ time: Date.now() });
    console.log("Second create succeeded");
  } catch (e) {
    console.log("Second create failed with code:", e.code);
  }
}
test().then(() => process.exit(0));
