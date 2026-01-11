const https = require('https');

const BOT_TOKEN = '8234286653:AAGAD8fDKz9AqirDAqOIaddZuPCq4keln-w';

function getWebhookInfo() {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log("Webhook Info:", JSON.parse(data));
        });
    }).on('error', (err) => {
        console.error("Error checking webhook:", err.message);
    });
}

getWebhookInfo();
