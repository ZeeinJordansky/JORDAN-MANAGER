
import re

with open('server.ts', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 1. Fix the broken statsStr block around 2171
# It looks like:
#   if (userStatus) {
#     statsStr += `| Статус: ${userStatus}\n`;
#   }
#   \n`;
#     } else if (targetUser.profileAudio.artist && targetUser.profileAudio.title) {
#       statsStr += `| Музыка в профиле: ${targetUser.profileAudio.artist} - ${targetUser.profileAudio.title}\n`;
#     }
#   }
#   statsStr += `\n| Активная глобальная блокировка: ...`

pattern_stats = r'if \(userStatus\) \{.*?statsStr \+= `\| Статус: \$\{userStatus\}\\n`;\s*\}\s*\\n`;\s*\} else if \(targetUser\.profileAudio\.artist && targetUser\.profileAudio\.title\) \{.*?statsStr \+= `\| Музыка в профиле: \$\{targetUser\.profileAudio\.artist\} - \$\{targetUser\.profileAudio\.title\}\\n`;\s*\}\s*\}'

# Let's use a simpler match for the junk
junk_stats = r'\}\s*\\n`;\s*\} else if \(targetUser\.profileAudio\.artist && targetUser\.profileAudio\.title\) \{.*?statsStr \+= `\| Музыка в профиле:.*?\}\s*\}'
content = re.sub(junk_stats, '}', content, flags=re.DOTALL)

# Also fix the specific lines I saw in cat -n
content = content.replace('  \\n`;\n    } else if (targetUser.profileAudio.artist && targetUser.profileAudio.title) {\n      statsStr += `| Музыка в профиле: ${targetUser.profileAudio.artist} - ${targetUser.profileAudio.title}\\n`;\n    }\n  }', '')

# 2. Fix the extra braces in the gban/chatBans blocks
# Find the specific pattern:
#   return;\n             }\n          }\n          }
content = content.replace('return;\n             }\n          }\n          }', 'return;\n             }\n          }')

# 3. Check for any other } } } } that look like they were over-added
# I'll specifically look for the blocks around 7417, 7431, 7445
for _ in range(3):
    content = content.replace('return;\n               }\n             }\n          }\n          }', 'return;\n               }\n             }\n          }')

# 4. Fix the handlePromotion removal if it left a mess
# It seems it was removed but maybe some code was left before it or after it that broke the flow.
# I'll look for any "try {" that doesn't have a matching "catch" or "finally" within a reasonable distance (e.g. 1000 chars)

# 5. Fix the 12608 catch block
# If there's an extra } before the catch, it will break.
# cat -n 12580,12615 showed:
# 12607:        return await sendResponse(wakeText);
# 12608:      }
# 12609:    } catch (error) {
# 12610:      console.error("Error processing message:", error); ...
# 12611:     }
# 12612:  }}

# If there is a missing try, that's the problem.
# But actually, looking at 7475, a try { starts there.

# Let's check if there's any code between 8400 and 8806 that has unbalanced braces.
# I'll use a more surgical approach for the 7475 try block.

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(content)
