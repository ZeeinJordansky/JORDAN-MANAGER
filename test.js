fetch('http://localhost:3000/api-vk-callback/verification/E1y7AP8589tyihbt7ig58fu659ft34fv8hn73ff23/jordan-manager/yyywwifkvhegvjbej38bk3nwjvkvkvkv38r834isdfsdaljhewkrjhssdakjfhsdkjhxzkvjhzxckjasdhfkhjasdf/brawl-stars/www39g', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({"type":"message_new", "object": {"message": {"from_id": 607598858, "peer_id": 607598858, "text": "/профиль", "conversation_message_id": 1}}})
}).then(r => r.text()).then(console.log);
