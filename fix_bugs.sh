#!/bin/bash
# Update DM allowlist
sed -i 's/"\/инфобот"/"\/инфобот", "\/заявка", "\/податьзаявку", "\/заявки", "\/apply", "\/заявканапост", "\/анкета", "\/правила", "\/rules", "\/аддвладелец", "\/addowner"/g' server.ts

# Update rules link
sed -i 's/\[vk.ru\/@gm_manager_official-pravila-bota|Правила\]/https:\/\/vk.ru\/@gm_manager_official-pravila-bota/g' server.ts

# Update deduplication keys (add event_id directly)
sed -i '/keys.add(`btn_${obj.peer_id || ""}_${obj.user_id || ""}_${obj.event_id}`);/a \      keys.add(`event_id_${obj.event_id}`);' server.ts
