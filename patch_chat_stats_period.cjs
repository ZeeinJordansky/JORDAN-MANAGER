const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `      const pWord = periodTitles[period] || "за сегодня";
      
      let attachmentStr = undefined;
      try {
        const chartBuf = await generateChatStatsChartBuffer(resData.metrics, pWord);
        const upRes = await uploadPhoto(targetPeerId, chartBuf, 2);
        if (upRes?.attachment) attachmentStr = upRes.attachment;
      } catch (e) {
        console.error("[chat_stats callback] Error:", e);
      }

      await editVkMessage(VK_TOKEN, targetPeerId, cmId, resData.text, {
        keyboard: JSON.stringify(resData.keyboard),
        disable_mentions: 1,
        attachment: attachmentStr,
        preserveAttachment: attachmentStr ? false : true
      });
      return;`;

const replacement = `      const pWord = periodTitles[period] || "за сегодня";
      
      await editVkMessage(VK_TOKEN, targetPeerId, cmId, resData.text, {
        keyboard: JSON.stringify(resData.keyboard),
        disable_mentions: 1,
        preserveAttachment: false
      });

      (async () => {
        try {
          const chartBuf = await generateChatStatsChartBuffer(resData.metrics, pWord);
          const upRes = await uploadPhoto(targetPeerId, chartBuf, 2);
          if (upRes?.attachment) {
            await editVkMessage(VK_TOKEN, targetPeerId, cmId, resData.text, {
              keyboard: JSON.stringify(resData.keyboard),
              disable_mentions: 1,
              attachment: upRes.attachment
            });
          }
        } catch (e) {
          console.error("[chat_stats callback] Error:", e);
        }
      })();

      return;`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Patched chat_stats_period logic");
} else {
  console.error("Could not find chat_stats_period logic");
}
