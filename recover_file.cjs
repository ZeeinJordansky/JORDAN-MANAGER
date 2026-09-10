const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

const lines = content.split('\n');
const truncatedLines = lines.slice(0, 9100);
let truncatedContent = truncatedLines.join('\n');

// Balance it
let balance = 0;
for (const line of truncatedLines) {
    balance += (line.match(/\{/g) || []).length;
    balance -= (line.match(/\}/g) || []).length;
}

console.log("Balance after truncation:", balance);

if (balance > 0) {
    truncatedContent += '\n' + '}'.repeat(balance) + '\n';
}

// Add startup
truncatedContent += `
app.post(["/api/vk-callback", "/callback", "/vk-callback"], async (req, res) => {
  const { type, object, group_id, secret } = req.body || {};
  if (type === "confirmation") {
    return res.status(200).send(process.env.VK_CONFIRMATION || "ok");
  }
  res.status(200).send("ok");
  if (type) {
    try {
      await handleVkEvent(req.body);
    } catch (e) {
      console.error("Error processing callback:", e);
    }
  }
});

async function startServer() {
  const PORT = 3000;
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port 3000");
  });
}

startServer();
`;

fs.writeFileSync('server.ts', truncatedContent);
console.log("File recovered and balanced!");
