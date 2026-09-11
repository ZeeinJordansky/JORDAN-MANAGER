const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target1 = `            let attachmentStr = undefined;
            try {
              const chartBuf = await generateChatStatsChartBuffer(resData.metrics, "за сегодня");
              const upRes = await uploadPhoto(peerId, chartBuf, 2);
              if (upRes?.attachment) attachmentStr = upRes.attachment;
            } catch (e) {
              console.error("[/chatstats] Chart error:", e);
            }

            return await sendResponse(resData.text, {
              keyboard: JSON.stringify(resData.keyboard),
              attachment: attachmentStr
            });`;

const replacement1 = `            const sentMsg = await sendResponse(resData.text, {
              keyboard: JSON.stringify(resData.keyboard)
            });

            if (sentMsg) {
              (async () => {
                try {
                  const chartBuf = await generateChatStatsChartBuffer(resData.metrics, "за сегодня");
                  const upRes = await uploadPhoto(peerId, chartBuf, 2);
                  if (upRes?.attachment) {
                    await editVkMessage(VK_TOKEN, peerId, sentMsg, resData.text, {
                      keyboard: JSON.stringify(resData.keyboard),
                      attachment: upRes.attachment,
                      disable_mentions: 1
                    });
                  }
                } catch (e) {
                  console.error("[/chatstats] Background upload error:", e);
                }
              })();
            }
            return sentMsg;`;

if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
  console.log("Patched chat stats response");
}

const target2 = `          let attachmentStr = undefined;
          try {
            const dayLabels: string[] = [];
            const dayCounts: number[] = [];
            const todayCount = resData.todayMsgs || 0;
            const now = new Date();
            const targetU = await getOrCreateUser(targetId);
            
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
            console.error("[/stats] Chart error:", e);
          }

          return await sendResponse(resData.text, {
            keyboard: JSON.stringify(resData.keyboard),
            attachment: attachmentStr
          });`;

const replacement2 = `          const sentMsg = await sendResponse(resData.text, {
            keyboard: JSON.stringify(resData.keyboard)
          });

          if (sentMsg) {
            (async () => {
              try {
                const dayLabels: string[] = [];
                const dayCounts: number[] = [];
                const todayCount = resData.todayMsgs || 0;
                const now = new Date();
                const targetU = await getOrCreateUser(targetId);
                
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
                  await editVkMessage(VK_TOKEN, peerId, sentMsg, resData.text, {
                    keyboard: JSON.stringify(resData.keyboard),
                    attachment: upRes.attachment,
                    disable_mentions: 1
                  });
                }
              } catch (e) {
                console.error("[/stats] Background upload error:", e);
              }
            })();
          }
          return sentMsg;`;

if (code.includes(target2)) {
  code = code.replace(target2, replacement2);
  console.log("Patched user stats response");
}

fs.writeFileSync('server.ts', code);
