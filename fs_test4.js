import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  try {
    const d = await getDoc(doc(db, "users", "test_non_existent"));
    console.log("Exists:", d.exists());
    process.exit(0);
  } catch (e) {
    console.log("Error querying:", e);
    process.exit(1);
  }
}
test();
