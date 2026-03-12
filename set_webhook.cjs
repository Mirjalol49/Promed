const https = require('https');

const BOT_TOKEN = '8685148431:AAGtGgLjltefGoA2sc5AA8ZQZ28pfZ6hQ1I';
const WEBHOOK_URL = 'https://bothandler-5groksfpjq-uc.a.run.app';

function setWebhook() {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${WEBHOOK_URL}`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log("Set Webhook Response:", JSON.parse(data));
        });
    }).on('error', (err) => {
        console.error("Error setting webhook:", err.message);
    });
}

setWebhook();
