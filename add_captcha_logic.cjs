const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const captchaLogic = `
const userCommandTimestamps = new Map<number, number[]>();
interface CaptchaState {
  code: string;
  peerId: number;
  cmid: number;
  timeout: NodeJS.Timeout;
}
const activeCaptchas = new Map<number, CaptchaState>();

async function generateCaptchaImage(text: string): Promise<Buffer> {
  const canvas = createCanvas(200, 100);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 200, 100);
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = '#cccccc';
    ctx.beginPath();
    ctx.moveTo(Math.random() * 200, Math.random() * 100);
    ctx.lineTo(Math.random() * 200, Math.random() * 100);
    ctx.stroke();
  }
  ctx.font = 'bold 40px sans-serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.translate(100, 50);
  ctx.rotate((Math.random() - 0.5) * 0.2);
  ctx.fillText(text, 0, 0);
  ctx.restore();
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#888888' : '#bbbbbb';
    ctx.beginPath();
    ctx.arc(Math.random() * 200, Math.random() * 100, Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas.toBuffer('image/jpeg');
}

async function uploadCaptchaPhoto(peerId: number, imageBuffer: Buffer): Promise<string | null> {
  try {
    const serverRes = await axios.get(\`https://api.vk.com/method/photos.getMessagesUploadServer\`, {
      params: { access_token: VK_TOKEN, v: "5.199", peer_id: peerId }
    });
    if (!serverRes.data.response) return null;
    const uploadUrl = serverRes.data.response.upload_url;
    const form = new FormData();
    form.append("photo", imageBuffer, { filename: "captcha.jpg", contentType: "image/jpeg" });
    const uploadRes = await axios.post(uploadUrl, form, { headers: form.getHeaders() });
    const saveRes = await axios.get(\`https://api.vk.com/method/photos.saveMessagesPhoto\`, {
      params: {
        access_token: VK_TOKEN,
        v: "5.199",
        server: uploadRes.data.server,
        photo: uploadRes.data.photo,
        hash: uploadRes.data.hash
      }
    });
    const photo = saveRes.data.response[0];
    return \`photo\${photo.owner_id}_\${photo.id}\`;
  } catch (e: any) {
    console.error("Captcha upload error:", e.response?.data || e.message);
    return null;
  }
}

async function triggerCaptcha(userId: number, peerId: number, triggerMessage: any) {
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
}
`;

code = code.replace(
  'const commandHistory = new Map<number, { timestamps: number[] }>();',
  'const commandHistory = new Map<number, { timestamps: number[] }>();\n' + captchaLogic
);

fs.writeFileSync('server.ts', code);
console.log("Injected Captcha Logic.");
