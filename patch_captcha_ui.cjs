const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldCaptcha = `async function triggerCaptcha(userId: number, peerId: number, triggerMessage: any) {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const imageBuf = await generateCaptchaImage(code);
  const photoAttachment = await uploadCaptchaPhoto(peerId, imageBuf);
  
  const text = \`Уважаемый пользователь, мы заметили что вы стали слишком часто вводить команды.\\nДля того, что бы подтвердить что вы человек, напишите текст с картинки (ответом на это сообщение).\`;
  
  const res = await sendVkMessage(VK_TOKEN, peerId, text, {
    attachment: photoAttachment || "",
    forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [triggerMessage.conversation_message_id], is_reply: true })
  });
  
  let cmid = 0;
  if (res && res.response && res.response.length > 0) {
    cmid = res.response[0].conversation_message_id || res.response[0].message_id;
  }
  
  const timeout = setTimeout(async () => {
    activeCaptchas.delete(userId);
    const user = await getOrCreateUser(userId);
    const expireDate = new Date(Date.now() + 120 * 60000);
    await updateUser(userId, {
      mute: true,
      muteAdminId: 0,
      muteReason: "Не прошёл капчу",
      muteExpires: expireDate.toISOString()
    });
    userCache.delete(userId);
    const fullName = user.fullName || user.nick || "Пользователь";
    const muteMsg = \`[id\${userId}|\${fullName}] получил(-а) блокировку чата на 120 минут из-за непрохождения капчи. (#CAPTCHA)\`;
    await sendVkMessage(VK_TOKEN, peerId, muteMsg);
  }, 30 * 60 * 1000);
  
  activeCaptchas.set(userId, { code, peerId, cmid, timeout });
}`;

const newCaptcha = `async function triggerCaptcha(userId: number, peerId: number, triggerMessage: any): Promise<boolean> {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const imageBuf = await generateCaptchaImage(code);
  const photoAttachment = await uploadCaptchaPhoto(peerId, imageBuf);
  
  if (!photoAttachment) {
    console.error("Failed to upload captcha photo, bypassing captcha.");
    return false;
  }

  const fakeCodes = [
    Math.random().toString(36).substring(2, 8).toUpperCase(),
    Math.random().toString(36).substring(2, 8).toUpperCase(),
    Math.random().toString(36).substring(2, 8).toUpperCase()
  ];
  const allCodes = [code, ...fakeCodes].sort(() => Math.random() - 0.5);

  const keyboard = {
    inline: true,
    buttons: [
      [
        { action: { type: "callback", label: allCodes[0], payload: JSON.stringify({ cmd: "captcha", code: allCodes[0] }) }, color: "secondary" },
        { action: { type: "callback", label: allCodes[1], payload: JSON.stringify({ cmd: "captcha", code: allCodes[1] }) }, color: "secondary" }
      ],
      [
        { action: { type: "callback", label: allCodes[2], payload: JSON.stringify({ cmd: "captcha", code: allCodes[2] }) }, color: "secondary" },
        { action: { type: "callback", label: allCodes[3], payload: JSON.stringify({ cmd: "captcha", code: allCodes[3] }) }, color: "secondary" }
      ]
    ]
  };
  
  const text = \`Уважаемый пользователь, мы заметили что вы стали слишком часто вводить команды.\\nДля того, что бы подтвердить что вы человек, нажмите на кнопку с кодом, который изображен на картинке.\`;
  
  const res = await sendVkMessage(VK_TOKEN, peerId, text, {
    attachment: photoAttachment || "",
    forward: JSON.stringify({ peer_id: peerId, conversation_message_ids: [triggerMessage.conversation_message_id], is_reply: true }),
    keyboard: JSON.stringify(keyboard)
  });
  
  let cmid = 0;
  if (res && res.response && res.response.length > 0) {
    cmid = res.response[0].conversation_message_id || res.response[0].message_id;
  }
  
  const timeout = setTimeout(async () => {
    activeCaptchas.delete(userId);
    const user = await getOrCreateUser(userId);
    const expireDate = new Date(Date.now() + 120 * 60000);
    await updateUser(userId, {
      mute: true,
      muteAdminId: 0,
      muteReason: "Не прошёл капчу",
      muteExpires: expireDate.toISOString()
    });
    userCache.delete(userId);
    const fullName = user.fullName || user.nick || "Пользователь";
    const muteMsg = \`[id\${userId}|\${fullName}] получил(-а) блокировку чата на 120 минут из-за непрохождения капчи. (#CAPTCHA)\`;
    await sendVkMessage(VK_TOKEN, peerId, muteMsg);
  }, 30 * 60 * 1000);
  
  activeCaptchas.set(userId, { code, peerId, cmid, timeout });
  return true;
}`;

code = code.replace(oldCaptcha, newCaptcha);
fs.writeFileSync('server.ts', code);
