const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `      if (cmd === "stats_main") {
         resData = await getStatsMainPage(payloadTargetId, peerId, userId);
         let attachmentStr = undefined;
         try {
           const dayLabels: string[] = [];
           const dayCounts: number[] = [];
           const todayCount = resData.todayMsgs || 0;
           const now = new Date();
           const targetU = await getOrCreateUser(payloadTargetId);
           
           for (let i = 6; i >= 0; i--) {
             const d = new Date(now.getTime() - i * 86400000);
             const dayStr = String(d.getDate()).padStart(2, "0");
             const monthStr = String(d.getMonth() + 1).padStart(2, "0");
             dayLabels.push(\`\${dayStr}.\${monthStr}\`);
             if (i === 0) {
               dayCounts.push(todayCount);
             } else {
               const histVal = targetU?.chatDailyMsgs?.[peerId]?.[d.toISOString().slice(0, 10)];
               dayCounts.push(typeof histVal === "number" ? histVal : 0);
             }
           }

           const chartBuf = await generateUserDailyStatsChartBuffer(dayLabels, dayCounts, {
             todayMsgs: resData.todayMsgs || 0,
             totalMsgs: resData.totalMsgs || 0
           }, resData.userInfo);
           const upRes = await uploadPhoto(peerId, chartBuf, 2);
           if (upRes?.attachment) attachmentStr = upRes.attachment;
         } catch (e) {
           console.error("[stats_main] Error generating chart:", e);
         }
         
         await editVkMessage(VK_TOKEN, peerId, cmId, resData.text, { 
           keyboard: JSON.stringify(resData.keyboard), 
           disable_mentions: 1,
           attachment: attachmentStr,
           preserveAttachment: attachmentStr ? false : true
         });
         return;`;

const replacement = `      if (cmd === "stats_main") {
         resData = await getStatsMainPage(payloadTargetId, peerId, userId);
         await editVkMessage(VK_TOKEN, peerId, cmId, resData.text, { 
           keyboard: JSON.stringify(resData.keyboard), 
           disable_mentions: 1,
           preserveAttachment: false
         });
         
         (async () => {
           try {
             const dayLabels: string[] = [];
             const dayCounts: number[] = [];
             const todayCount = resData.todayMsgs || 0;
             const now = new Date();
             const targetU = await getOrCreateUser(payloadTargetId);
             
             for (let i = 6; i >= 0; i--) {
               const d = new Date(now.getTime() - i * 86400000);
               const dayStr = String(d.getDate()).padStart(2, "0");
               const monthStr = String(d.getMonth() + 1).padStart(2, "0");
               dayLabels.push(\`\${dayStr}.\${monthStr}\`);
               if (i === 0) {
                 dayCounts.push(todayCount);
               } else {
                 const histVal = targetU?.chatDailyMsgs?.[peerId]?.[d.toISOString().slice(0, 10)];
                 dayCounts.push(typeof histVal === "number" ? histVal : 0);
               }
             }

             const chartBuf = await generateUserDailyStatsChartBuffer(dayLabels, dayCounts, {
               todayMsgs: resData.todayMsgs || 0,
               totalMsgs: resData.totalMsgs || 0
             }, resData.userInfo);
             const upRes = await uploadPhoto(peerId, chartBuf, 2);
             if (upRes?.attachment) {
               await editVkMessage(VK_TOKEN, peerId, cmId, resData.text, { 
                 keyboard: JSON.stringify(resData.keyboard), 
                 disable_mentions: 1,
                 attachment: upRes.attachment
               });
             }
           } catch (e) {
             console.error("[stats_main] Error generating chart:", e);
           }
         })();
         return;`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Patched stats_main callback logic");
} else {
  console.error("Could not find stats_main logic");
}
