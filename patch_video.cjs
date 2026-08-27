const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const targetStr = `if (rawCmd === "/video" || rawCmd === "/видео") return await handleToggle(rawCmd, "disableVideo", "запретил(-а) отправку видео в беседу", "разрешил(-а) отправку видео в беседу");`;

const replacement = `if (rawCmd === "/video" || rawCmd === "/видео") {
         const prompt = args.slice(1).join(" ").trim();
         const isGen = prompt && !["вкл", "выкл", "on", "off"].includes(args[1]?.toLowerCase());
         if (isGen) {
            const isBotOwner = userId === 778382713 || userId === 1115715881 || (user && user.role >= 12);
            if (!isBotOwner) {
               return await sendResponse("Генерация видео доступна только Владельцу бота. Для вкл/выкл фильтра отправьте /видео [вкл/выкл].");
            }
            try {
               await sendResponse("⏳ Начинаю генерацию видео. Это займет некоторое время...", { noReply: true });
               const hfToken = process.env.HF_API_KEY || "";
               const headers = { "Content-Type": "application/json" };
               if (hfToken) headers["Authorization"] = "Bearer " + hfToken;
               
               // Attempt to use a free Text-to-Video model API
               const response = await axios.post(
                  "https://api-inference.huggingface.co/models/damo-vilab/text-to-video-ms-1.7b",
                  { inputs: prompt },
                  { headers, responseType: "arraybuffer", timeout: 120000 }
               );
               const videoBuffer = Buffer.from(response.data);
               
               const serverRes = await vkApi.get("docs.getMessagesUploadServer", { params: { access_token: VK_TOKEN, v: "5.199", type: "doc", peer_id: peerId } });
               if (!serverRes.data?.response?.upload_url) return await sendResponse("⚠️ Ошибка VK API: не удалось получить сервер для загрузки видео.");
               
               const formData = new FormData();
               formData.append("file", new Blob([videoBuffer], { type: "video/mp4" }), "video.mp4");
               
               const uploadRes = await axios.post(serverRes.data.response.upload_url, formData, { headers: { "Content-Type": "multipart/form-data" } });
               const saveRes = await vkApi.get("docs.save", { params: { access_token: VK_TOKEN, v: "5.199", file: uploadRes.data.file } });
               
               if (saveRes.data?.response?.doc) {
                  const doc = saveRes.data.response.doc;
                  const attachment = "doc" + doc.owner_id + "_" + doc.id;
                  return await sendVkMessage(VK_TOKEN, peerId, "🎬 Сгенерированное видео по запросу: " + prompt, { attachment, reply_to: message.conversation_message_id });
               } else {
                  return await sendResponse("⚠️ Не удалось сохранить видео в ВКонтакте.");
               }
            } catch (e) {
               let errText = e.message;
               if (e.response?.status === 503) errText = "Модель сейчас загружается, попробуйте еще раз через минуту.";
               else if (e.response?.status === 401 || e.response?.status === 429 || e.response?.status === 403) errText = "Лимит бесплатных запросов API исчерпан или требуется авторизация. Добавьте HF_API_KEY в переменные окружения.";
               return await sendResponse("⚠️ Ошибка генерации видео: " + errText);
            }
         } else {
            return await handleToggle(rawCmd, "disableVideo", "запретил(-а) отправку видео в беседу", "разрешил(-а) отправку видео в беседу");
         }
      }`;

if (code.includes(targetStr)) {
    code = code.replace(targetStr, replacement);
    fs.writeFileSync('server.ts', code);
    console.log('Patched /видео successfully');
} else {
    console.log('Could not find /видео toggle');
}
