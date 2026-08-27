const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const handlers = [
    'if (cmd === "activate_chat") {',
    '    const u = await getOrCreateUser(userId);',
    '    const uRole = await getRole(peerId, userId);',
    '    const isAdm = await checkIsAdmin(userId, peerId, u.role);',
    '    if (uRole < 1 && !isAdm) return await showVkSnackbar(VK_TOKEN, eventId, "У вас недостаточно прав для активации беседы!");',
    '    await updateChat(peerId, { welcometext_enabled: true });',
    '    await answerVkEvent(VK_TOKEN, eventId, userId, peerId);',
    '    eventAnsweredMap.set(eventId, true);',
    '    return await sendVkMessage(VK_TOKEN, peerId, "Беседа была успешно активирована.\\n\\nТеперь вы можете настраивать чат-менеджера под себя!");',
    '}',
    'if (cmd === "mod_kick_btn") {',
    '    const targetId = Number(payloadObj.targetId);',
    '    const reason = payloadObj.reason || "блокировка чата";',
    '    const uRole = await getRole(peerId, userId);',
    '    if (uRole < 1) return await showVkSnackbar(VK_TOKEN, eventId, "Недостаточно прав!");',
    '    try {',
    '        await axios.get("https://api.vk.com/method/messages.removeChatUser", { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: targetId } });',
    '        await answerVkEvent(VK_TOKEN, eventId, userId, peerId);',
    '        eventAnsweredMap.set(eventId, true);',
    '        const targetU = await getOrCreateUser(targetId);',
    '        const targetFullName = targetU.fullName || targetU.nick || "User" + targetId;',
    '        return await sendVkMessage(VK_TOKEN, peerId, "[id" + targetId + "|" + targetFullName + "] был(-а) исключён из беседы по причине: " + reason + "\\n\\n| Модератор - [id" + userId + "|" + fullName + "]");',
    '    } catch (e) { return await showVkSnackbar(VK_TOKEN, eventId, "Ошибка при исключении!"); }',
    '}',
    'if (cmd === "confirm_giveowner") {',
    '    const targetId = Number(payloadObj.targetId);',
    '    if (userId !== Number(payloadObj.fromId)) return await showVkSnackbar(VK_TOKEN, eventId, "Эту кнопку может нажать только тот, кто инициировал передачу!");',
    '    await updateUser(targetId, { role: 8 });',
    '    await answerVkEvent(VK_TOKEN, eventId, userId, peerId);',
    '    eventAnsweredMap.set(eventId, true);',
    '    const targetU = await getOrCreateUser(targetId);',
    '    const targetFullName = targetU.fullName || targetU.nick || "User" + targetId;',
    '    await sendVkMessage(VK_TOKEN, peerId, "[id" + userId + "|" + fullName + "] передал(-а) права владельца беседы [id" + targetId + "|" + targetFullName + "]");',
    '    try { await axios.get("https://api.vk.com/method/messages.send", { params: { access_token: VK_TOKEN, v: "5.199", peer_id: targetId, random_id: Math.floor(Math.random() * 1000000), message: "Вам были переданы права «Владелец Беседы» в беседе №" + peerId + "\\n\\nТеперь вы являетесь полноценным владельцем чат-менеджера в этой беседе!" } }); } catch (e) {}',
    '    return;',
    '}',
    'if (cmd === "cancel_giveowner") {',
    '    await answerVkEvent(VK_TOKEN, eventId, userId, peerId);',
    '    eventAnsweredMap.set(eventId, true);',
    '    return await sendVkMessage(VK_TOKEN, peerId, "Передача прав владельца была отменена.");',
    '}',
    'if (cmd === "leave_kick") {',
    '    const targetId = Number(payloadObj.targetId);',
    '    const uRole = await getRole(peerId, userId);',
    '    if (uRole < 1) return await showVkSnackbar(VK_TOKEN, eventId, "Недостаточно прав!");',
    '    try {',
    '        await axios.get("https://api.vk.com/method/messages.removeChatUser", { params: { access_token: VK_TOKEN, v: "5.199", chat_id: peerId - 2000000000, member_id: targetId } });',
    '        await answerVkEvent(VK_TOKEN, eventId, userId, peerId);',
    '        eventAnsweredMap.set(eventId, true);',
    '        return await sendVkMessage(VK_TOKEN, peerId, "[id" + userId + "|" + fullName + "] исключил(-а) вышедшего пользователя из беседы.");',
    '    } catch (e) { return await showVkSnackbar(VK_TOKEN, eventId, "Ошибка при исключении!"); }',
    '}',
    'if (cmd === "leave_removerole") {',
    '    const targetId = Number(payloadObj.targetId);',
    '    const uRole = await getRole(peerId, userId);',
    '    if (uRole < 1) return await showVkSnackbar(VK_TOKEN, eventId, "Недостаточно прав!");',
    '    await updateUser(targetId, { role: 0, chatRoles: {} });',
    '    await answerVkEvent(VK_TOKEN, eventId, userId, peerId);',
    '    eventAnsweredMap.set(eventId, true);',
    '    return await sendVkMessage(VK_TOKEN, peerId, "[id" + userId + "|" + fullName + "] аннулировал(-а) роли вышедшего пользователя.");',
    '}'
].join('\\n');

const insertPoint = /logButtonAction\(\{[\s\S]*?eventId\s*\}\)\.catch\(\(\) => \{\}\);/;
if (insertPoint.test(content)) {
    content = content.replace(insertPoint, (match) => match + '\\n' + handlers);
    console.log('Handlers added');
}

fs.writeFileSync('server.ts', content, 'utf8');
