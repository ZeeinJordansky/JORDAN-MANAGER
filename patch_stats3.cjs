const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const search = `    if (cmd === "stats_main" || cmd === "stats_warns" || cmd === "stats_bans") {
      const payloadTargetId = payloadObj.targetId;
      if (!payloadTargetId) return await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Ошибка: цель не указана" });
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      
      let resData;
      if (cmd === "stats_main") {
         resData = await getStatsMainPage(payloadTargetId, peerId, userId);
      } else if (cmd === "stats_warns") {
         resData = await getStatsWarnsPage(payloadTargetId);
      } else {
         resData = await getStatsBansPage(payloadTargetId);
      }

      await editVkMessage(VK_TOKEN, peerId, cmId, resData.text, { keyboard: JSON.stringify(resData.keyboard), disable_mentions: 1 });
      return;
    }`;

const replace = `    if (cmd === "stats_main" || cmd === "stats_warns" || cmd === "stats_bans" || cmd === "stats_mute" || cmd === "stats_game") {
      const payloadTargetId = payloadObj.targetId;
      if (!payloadTargetId) return await answerVkEvent(VK_TOKEN, eventId, userId, peerId, { text: "Ошибка: цель не указана" });
      await answerVkEvent(VK_TOKEN, eventId, userId, peerId);
      
      let resData: any;
      if (cmd === "stats_main") {
         resData = await getStatsMainPage(payloadTargetId, peerId, userId);
      } else if (cmd === "stats_warns") {
         resData = await getStatsWarnsPage(payloadTargetId);
      } else if (cmd === "stats_mute") {
         resData = await getStatsMutePage(payloadTargetId);
      } else if (cmd === "stats_game") {
         const tu = await getOrCreateUser(payloadTargetId);
         const tn = tu.fullName || tu.nick || \`id\${payloadTargetId}\`;
         const gt = \`Игровой Профиль [id\${payloadTargetId}|\${tn}]\\n\\n| Баланс: \${tu.balance || 0} коинов\\n| В банке: \${tu.bank || 0} коинов\\n| Пивозавры: \${tu.beer || 0}\\n| JC: \${tu.jc || 0}\\n| Репутация: \${tu.rep || 0}\`;
         resData = {
           text: gt,
           keyboard: {
             inline: true,
             buttons: [
               [ { action: { type: "callback", label: "Общая Информация", payload: JSON.stringify({ cmd: "stats_main", targetId: payloadTargetId }) }, color: "secondary" } ]
             ]
           }
         };
      } else {
         resData = await getStatsBansPage(payloadTargetId);
      }

      if (cmd === "stats_main") {
        // Send first without chart to update fast
        await editVkMessage(VK_TOKEN, peerId, cmId, resData.text, { keyboard: JSON.stringify(resData.keyboard), disable_mentions: 1 });
        
        // Then generate and append chart
        const chartUrl = \`https://quickchart.io/chart?c=\${encodeURIComponent(JSON.stringify({
          type: 'bar',
          data: {
            labels: ['Сегодня', 'Всё время'],
            datasets: [{
              label: 'Сообщения',
              data: [resData.todayMsgs || 0, resData.totalMsgs || 0],
              backgroundColor: ['rgba(54, 162, 235, 0.5)', 'rgba(255, 99, 132, 0.5)']
            }]
          },
          options: {
            legend: { display: false },
            title: { display: true, text: 'Статистика сообщений' }
          }
        }))}\`;
        
        try {
          const upRes = await uploadPhoto(peerId, chartUrl);
          if (upRes.attachment) {
            await editVkMessage(VK_TOKEN, peerId, cmId, resData.text, { 
              keyboard: JSON.stringify(resData.keyboard),
              attachment: upRes.attachment,
              disable_mentions: 1
            });
          }
        } catch(e) {}
      } else {
        // Remove attachment
        await editVkMessage(VK_TOKEN, peerId, cmId, resData.text, { keyboard: JSON.stringify(resData.keyboard), disable_mentions: 1, attachment: "" });
      }
      return;
    }`;

if (code.includes(search)) {
  code = code.replace(search, replace);
  fs.writeFileSync('server.ts', code);
  console.log("Patched stats payload handlers successfully!");
} else {
  console.log("Could not find stats payload handler!");
}
