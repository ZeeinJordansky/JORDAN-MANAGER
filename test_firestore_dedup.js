import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

async function test() {
  const ref = db.collection("test_dedup").doc("key2");
  try {
    await ref.create({ ts: Date.now() });
    console.log("Created!");
    
    // try again
    await ref.create({ ts: Date.now() });
    console.log("Created again!");
  } catch (e) {
    console.log("Error:", e.code, e.message);
  }
}
test();
