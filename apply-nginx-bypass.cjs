const fs = require('fs');
const { execSync } = require('child_process');

const NGINX_CONF_PATH = '/etc/nginx/nginx.conf';

try {
  if (!fs.existsSync(NGINX_CONF_PATH)) {
    console.log('Nginx config not found at ' + NGINX_CONF_PATH + ', skipping bypass.');
    process.exit(0);
  }

  let content = fs.readFileSync(NGINX_CONF_PATH, 'utf8');

  const bypassBlock = `        # Bypass auth bridge for VK Callback API webhooks
        location /api-vk-callback/ {
            proxy_pass http://localhost:3000;
            proxy_set_header Host localhost:3000;
            proxy_set_header X-Forwarded-Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_intercept_errors on;
        }

`;

  if (!content.includes('location /api-vk-callback/')) {
    console.log('Applying Nginx auth bridge bypass for VK Callback API...');
    content = content.replace('        # Serve the app for all other paths.', bypassBlock + '        # Serve the app for all other paths.');
    fs.writeFileSync(NGINX_CONF_PATH, content, 'utf8');
    
    // Reload Nginx
    try {
      execSync('nginx -t');
      execSync('nginx -s reload');
      console.log('Nginx reloaded successfully with VK Callback bypass.');
    } catch (err) {
      console.error('Error reloading Nginx:', err.message);
    }
  } else {
    console.log('Nginx VK Callback bypass is already applied.');
  }
} catch (error) {
  console.error('Failed to apply Nginx bypass:', error.message);
}
