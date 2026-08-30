import re

with open("server.ts", "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

# 1. Update formatMskDateAmPm and related date functions
date_replacement = """export const formatMskDateAmPm = (ms?: number | null) => {
  if (!ms || ms <= 0) return "Отсутствует.";
  const d = new Date(ms + (new Date().getTimezoneOffset() * 60 * 1000) + (3 * 3600 * 1000));
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  let hourNum = d.getHours();
  const ampm = hourNum >= 12 ? "PM" : "AM";
  const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
  const hours = String(displayHour).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  const secs = String(d.getSeconds()).padStart(2, "0");
  return `${hours}:${mins}:${secs} ${ampm} | ${day}.${month}.${year}`;
};
export const fmtD = formatMskDateAmPm;
export const formatDateRstats = formatMskDateAmPm;
export const formatMskDate = formatMskDateAmPm;
"""

# Let's inspect where fmtD is in lines 841-870
content = re.sub(
    r'const fmtD = \(ms\?: number\) => \{[\s\S]*?const formatDateRstats = \(ms\?: number\) => \{[\s\S]*?return `\$\{day\}\.\$\{month\}\.\$\{year\} \$\{hours\}:\$\{mins\}`;[\s\S]*?\};',
    date_replacement,
    content,
    count=1
)

# And replace formatMskDateAmPm / formatMskDate around line 3183
content = re.sub(
    r'const formatMskDateAmPm = \(timestamp: number\) => \{[\s\S]*?function formatMskDate\(timestamp: number\): string \{[\s\S]*?return `\$\{day\}\.\$\{month\}\.\$\{year\} \$\{hours\}:\$\{mins\}:\$\{secs\} МСК \(UTC \+3\)`;[\s\S]*?\}',
    '// Date formatting helpers are defined globally above',
    content,
    count=1
)

print("Date formatting functions updated.")
with open("server.ts", "w", encoding="utf-8") as f:
    f.write(content)
