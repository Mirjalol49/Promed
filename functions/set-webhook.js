
const { Telegraf } = require("telegraf");

// CONFIGURATION
const BOT_TOKEN = '8685148431:AAGtGgLjltefGoA2sc5AA8ZQZ28pfZ6hQ1I';
// This is the URL from your recent deployment log
const WEBHOOK_URL = 'https://bothandler-5groksfpjq-uc.a.run.app';

const bot = new Telegraf(BOT_TOKEN);

console.log(`🔗 Setting webhook to: ${WEBHOOK_URL}`);

bot.telegram.setWebhook(WEBHOOK_URL)
    .then((success) => {
        if (success) {
            console.log("✅ Webhook successfully set!");
            console.log("Test by sending a message to the bot now.");
        } else {
            console.error("❌ Failed to set webhook (API returned false).");
        }
    })
    .catch((err) => {
        console.error("❌ Error setting webhook:", err);
    });
