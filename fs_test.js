import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const firebaseApp = admin.initializeApp({
  projectId: firebaseConfig.projectId,
});
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || "(default)");

async function test() {
  try {
    const doc = await db.collection("users").doc("test_non_existent").get();
    console.log("Exists:", doc.exists);
  } catch (e) {
    console.log("Error querying non-existent doc:", e.message);
  }
}
test();
