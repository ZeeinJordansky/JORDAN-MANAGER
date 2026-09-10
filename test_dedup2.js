function test() {
  const processed = new Set();
  const k1 = "msg_123_456";
  
  if (processed.has(k1)) {
    console.log("duplicate!");
    return;
  }
  processed.add(k1);
  console.log("added.");
  
  if (processed.has(k1)) {
    console.log("duplicate 2!");
    return;
  }
}
test();
