const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const search = `      // /stats /стата
      if (["/stats", "/стата", "/статистика", "/stata", "/статс", "/си", "/систата", "/я"].includes(rawCmd)) {
        const parsed = await parseTargetUser(message, args.slice(1));
        const targetId = parsed.targetId || userId;
        const resData = await getStatsMainPage(targetId, peerId, userId);
        return await sendResponse(resData.text, { keyboard: JSON.stringify(resData.keyboard) });
      }`;

const replace = `      // /stats /стата
      if (["/stats", "/стата", "/статистика", "/stata", "/статс", "/си", "/систата", "/я"].includes(rawCmd)) {
        const parsed = await parseTargetUser(message, args.slice(1));
        const targetId = parsed.targetId || userId;
        const resData = await getStatsMainPage(targetId, peerId, userId);
        
        // send without chart first
        const initialRes = await sendResponse(resData.text, { keyboard: JSON.stringify(resData.keyboard) });
        
        // Generate and append chart
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
            const cmIdToEdit = initialRes?.response?.conversation_message_id || initialRes?.response?.message_id || initialRes?.response;
            if (cmIdToEdit) {
              await editVkMessage(VK_TOKEN, peerId, cmIdToEdit, resData.text, { 
                keyboard: JSON.stringify(resData.keyboard),
                attachment: upRes.attachment,
                disable_mentions: 1
              });
            }
          }
        } catch(e) {}
        return;
      }`;

if (code.includes(search)) {
  code = code.replace(search, replace);
  fs.writeFileSync('server.ts', code);
  console.log("Patched stats command successfully!");
} else {
  console.log("Could not find stats command!");
}
