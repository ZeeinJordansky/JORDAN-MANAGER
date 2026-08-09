import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

// Fix in /бизнес
const oldBizCode = `        let photoAttachment;
        if (bizInfo && bizInfo.img) {
           photoAttachment = await uploadPhoto(peerId, bizInfo.img);
        }

        const options: any = {};
        if (keyboard.buttons.length > 0) options.keyboard = JSON.stringify(keyboard);
        if (photoAttachment) options.attachment = photoAttachment;`;

const newBizCode = `        let photoAttachment: string | null = null;
        if (bizInfo && bizInfo.img) {
           const uploadRes = await uploadPhoto(peerId, bizInfo.img);
           if (uploadRes.attachment) photoAttachment = uploadRes.attachment;
        }

        const options: any = {};
        if (keyboard.buttons.length > 0) options.keyboard = JSON.stringify(keyboard);
        if (photoAttachment) options.attachment = photoAttachment;`;

code = code.replace(oldBizCode, newBizCode);

// Fix in biz_my_list callback
const oldBizListCode = `         if (bizInfo.img) {
            const photoAttachment = await uploadPhoto(peerId, bizInfo.img);
            sendVkMessage(VK_TOKEN, peerId, txt, { attachment: photoAttachment });
         } else {
            sendVkMessage(VK_TOKEN, peerId, txt);
         }`;

const newBizListCode = `         if (bizInfo.img) {
            const uploadRes = await uploadPhoto(peerId, bizInfo.img);
            if (uploadRes.attachment) {
               sendVkMessage(VK_TOKEN, peerId, txt, { attachment: uploadRes.attachment });
            } else {
               sendVkMessage(VK_TOKEN, peerId, txt);
            }
         } else {
            sendVkMessage(VK_TOKEN, peerId, txt);
         }`;

code = code.replace(oldBizListCode, newBizListCode);

fs.writeFileSync('server.ts', code);
