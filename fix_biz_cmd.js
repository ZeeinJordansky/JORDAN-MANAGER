import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

// Update uploadPhoto function to have timeout and strict error handling
const oldUploadPhoto = `// Helper for photo upload with retry
async function uploadPhoto(peerId: number, source: string | Buffer, retries = 2): Promise<{ attachment: string | null; error: string | null }> {
  let lastError = "";
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const serverRes = await axios.get("https://api.vk.com/method/photos.getMessagesUploadServer", {
        params: { access_token: VK_TOKEN, v: "5.131", peer_id: peerId }
      });
      if (serverRes.data.error) {
        lastError = \`VK Server Error: \${serverRes.data.error.error_msg}\`;
        continue;
      }
      const uploadUrl = serverRes.data.response.upload_url;
      let buffer: Buffer = typeof source === "string" ? Buffer.from((await axios.get(source, { responseType: "arraybuffer" })).data) : source;
      
      const form = new FormData();
      form.append("photo", buffer, { filename: "quote.jpg", contentType: "image/jpeg" });
      
      const uploadRes = await axios.post(uploadUrl, form, { headers: { ...form.getHeaders() } });
      if (!uploadRes.data.photo || uploadRes.data.photo === "[]" || uploadRes.data.photo === "") {
        lastError = \`VK Upload empty data\`;
        continue;
      }
      const saveRes = await axios.get("https://api.vk.com/method/photos.saveMessagesPhoto", {
        params: {
          access_token: VK_TOKEN,
          v: "5.131",
          photo: uploadRes.data.photo,
          server: uploadRes.data.server,
          hash: uploadRes.data.hash
        }
      });
      if (saveRes.data.error) {
        lastError = \`VK Save Error: \${saveRes.data.error.error_msg}\`;
        continue;
      }
      const photo = saveRes.data.response[0];
      return { attachment: \`photo\${photo.owner_id}_\${photo.id}\`, error: null };
    } catch (error: any) {
      lastError = error.message;
    }
  }
  return { attachment: null, error: lastError || "Unknown upload error" };
}`;

const newUploadPhoto = `// Helper for photo upload with retry
async function uploadPhoto(peerId: number, source: string | Buffer, retries = 1): Promise<{ attachment: string | null; error: string | null }> {
  let lastError = "";
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const serverRes = await axios.get("https://api.vk.com/method/photos.getMessagesUploadServer", {
        params: { access_token: VK_TOKEN, v: "5.131", peer_id: peerId },
        timeout: 3000
      });
      if (serverRes.data.error) {
        lastError = \`VK Server Error: \${serverRes.data.error.error_msg}\`;
        continue;
      }
      const uploadUrl = serverRes.data.response.upload_url;
      let buffer: Buffer;
      if (typeof source === "string") {
        const imgRes = await axios.get(source, { responseType: "arraybuffer", timeout: 3000, headers: { "User-Agent": "Mozilla/5.0" } });
        buffer = Buffer.from(imgRes.data);
      } else {
        buffer = source;
      }
      
      const form = new FormData();
      form.append("photo", buffer, { filename: "photo.jpg", contentType: "image/jpeg" });
      
      const uploadRes = await axios.post(uploadUrl, form, { headers: { ...form.getHeaders() }, timeout: 4000 });
      if (!uploadRes.data || !uploadRes.data.photo || uploadRes.data.photo === "[]" || uploadRes.data.photo === "") {
        lastError = \`VK Upload empty data\`;
        continue;
      }
      const saveRes = await axios.get("https://api.vk.com/method/photos.saveMessagesPhoto", {
        params: {
          access_token: VK_TOKEN,
          v: "5.131",
          photo: uploadRes.data.photo,
          server: uploadRes.data.server,
          hash: uploadRes.data.hash
        },
        timeout: 3000
      });
      if (saveRes.data.error) {
        lastError = \`VK Save Error: \${saveRes.data.error.error_msg}\`;
        continue;
      }
      const photo = saveRes.data.response?.[0];
      if (!photo) {
        lastError = "No photo response";
        continue;
      }
      return { attachment: \`photo\${photo.owner_id}_\${photo.id}\`, error: null };
    } catch (error: any) {
      lastError = error.message;
    }
  }
  return { attachment: null, error: lastError || "Unknown upload error" };
}`;

code = code.replace(oldUploadPhoto, newUploadPhoto);

// Wrap uploadPhoto call in /бизнес inside try-catch block safely
const oldBizPhotoCall = `        let photoAttachment: string | null = null;
        if (bizInfo && bizInfo.img) {
           const uploadRes = await uploadPhoto(peerId, bizInfo.img);
           if (uploadRes.attachment) photoAttachment = uploadRes.attachment;
        }`;

const newBizPhotoCall = `        let photoAttachment: string | null = null;
        if (bizInfo && bizInfo.img) {
           try {
             const uploadRes = await uploadPhoto(peerId, bizInfo.img, 1);
             if (uploadRes && uploadRes.attachment) photoAttachment = uploadRes.attachment;
           } catch (e) {
             console.error("Error attaching biz photo:", e);
           }
        }`;

code = code.replace(oldBizPhotoCall, newBizPhotoCall);

fs.writeFileSync('server.ts', code);
