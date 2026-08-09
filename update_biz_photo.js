import fs from 'fs';

let code = fs.readFileSync('server.ts', 'utf8');

const oldBizCmd = `        if (keyboard.buttons.length === 0) {
           return await sendResponse(txt);
        } else {
           return await sendResponse(txt, { keyboard: JSON.stringify(keyboard) });
        }`;

const newBizCmd = `        let photoAttachment;
        if (bizInfo && bizInfo.img) {
           photoAttachment = await uploadPhoto(peerId, bizInfo.img);
        }

        const options: any = {};
        if (keyboard.buttons.length > 0) options.keyboard = JSON.stringify(keyboard);
        if (photoAttachment) options.attachment = photoAttachment;

        return await sendResponse(txt, Object.keys(options).length > 0 ? options : undefined);`;

code = code.replace(oldBizCmd, newBizCmd);
fs.writeFileSync('server.ts', code);
