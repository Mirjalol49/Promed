import { Telegraf } from 'telegraf';

const BOT_TOKEN = '8591992335:AAHzpuGzTHGvEHZgiQuH1-SgEZsf3l9w_GQ';
const bot = new Telegraf(BOT_TOKEN);

console.log("Testing token...");

bot.telegram.getMe().then((botInfo) => {
    console.log("✅ Token is VALID!");
    console.log("Bot Name:", botInfo.first_name);
    console.log("Bot Username:", botInfo.username);
    process.exit(0);
}).catch((err) => {
    console.error("❌ Token is INVALID or Error:", err.message);
    process.exit(1);
});
