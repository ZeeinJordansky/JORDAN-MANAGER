import { getFirestoreWrapper, FieldValue } from './firestore-wrapper';
const db = getFirestoreWrapper();
async function run() {
  await db.collection("users").doc("test_user_123").set({ name: "Oleg", score: FieldValue.increment(1) }, { merge: true });
  const d = await db.collection("users").doc("test_user_123").get();
  console.log(d.data());
  const all = await db.collection("users").where("name", "==", "Oleg").get();
  console.log(all.size);
  process.exit(0);
}
run();
