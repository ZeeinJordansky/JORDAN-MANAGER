const fs = require('fs');
const curr = fs.readFileSync('server.ts', 'utf8');
const clean = fs.readFileSync('server.ts.clean_real', 'utf8');

console.log('Current length:', curr.length);
console.log('Clean length:', clean.length);

// Let's find where message_new starts and ends in both
const currMsgNewStart = curr.indexOf('if (type === "message_new") {');
const cleanMsgNewStart = clean.indexOf('if (type === "message_new") {');

console.log('currMsgNewStart:', currMsgNewStart);
console.log('cleanMsgNewStart:', cleanMsgNewStart);

// Let's see what is in message_event in both
const currMsgEventStart = curr.indexOf('if (type === "message_event") {');
const cleanMsgEventStart = clean.indexOf('if (type === "message_event") {');

console.log('currMsgEventStart:', currMsgEventStart);
console.log('cleanMsgEventStart:', cleanMsgEventStart);
