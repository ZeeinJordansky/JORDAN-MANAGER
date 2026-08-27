const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const newFmtD = `const fmtD = (ms?: number) => {
  if (!ms || ms <= 0) return "Навсегда";
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  const h = String(hour12).padStart(2, "0");
  return \`\${day}.\${month}.\${year} \${h}:\${minutes}:\${seconds} \${ampm}\`;
};`;

const partialMatch = /const fmtD = \(ms\?: number\) => \{[\s\S]*?return \`\${day}\.\${month}\.\${year} \${hours}:\${mins}:\${secs} \${ampm}\`;\s*};/;

if (partialMatch.test(content)) {
    content = content.replace(partialMatch, newFmtD);
    fs.writeFileSync('server.ts', content, 'utf8');
    console.log('fmtD updated via regex');
} else {
    // Try even more flexible regex
    const flexibleRegex = /const fmtD = \(ms\?: number\) => \{[\s\S]*?return \`\${day}\.\${month}\.\${year} [\s\S]*? \${ampm}\`;\s*};/;
    if (flexibleRegex.test(content)) {
        content = content.replace(flexibleRegex, newFmtD);
        fs.writeFileSync('server.ts', content, 'utf8');
        console.log('fmtD updated via flexible regex');
    } else {
        console.error('Could not find fmtD even with flexible regex');
        process.exit(1);
    }
}
