
import { Telegraf, Markup } from 'telegraf';
import cron from 'node-cron';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

// --- CONFIGURATION ---
const BOT_TOKEN = '8234286653:AAGAD8fDKz9AqirDAqOIaddZuPCq4keln-w';

// Firebase Config (Copied from src/lib/firebase.ts to verify directly in Node)
const firebaseConfig = {
    apiKey: "AIzaSyD_FGKU1Lzdp-DJRr7tgXehH2JmuAZKMYc",
    authDomain: "graft-dashboard.firebaseapp.com",
    projectId: "graft-dashboard",
    storageBucket: "graft-dashboard.firebasestorage.app",
    messagingSenderId: "120238255414",
    appId: "1:120238255414:web:f0aa109b5f80644e845797",
    databaseURL: "https://graft-dashboard-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize Bot
const bot = new Telegraf(BOT_TOKEN);

// --- LOCALIZATION ---
const TEXTS = {
    uz: {
        welcome: "👋 Assalomu alaykum! Iltimos, muloqot tilini tanlang:",
        ask_contact: "📲 Iltimos, telefon raqamingizni yuborish uchun pastdagi tugmani bosing:",
        share_contact_btn: "📱 Telefon raqamni yuborish",
        searching: "🔍 Tekshirilmoqda...",
        not_found: "❌ Kechirasiz, ushbu raqam bazada topilmadi. Iltimos, to'g'ri raqamdan foydalanayotganingizga ishonch hosil qiling yoki administratorga murojaat qiling.",
        success: (name) => `✅ Xush kelibsiz, **Hurmatli ${name}**! Siz tizimga muvaffaqiyatli ulandingiz.`,
        reminder_title: "Eslatma! 🎗",
        injection_msg: (name, date, time) => `Assalomu alaykum, **Hurmatli ${name}**! Sizga inyeksiya belgilanganini eslatib o'tmoqchimiz.\n\n🗓 Sana: **${date}**\n⏰ Vaqt: **${time}**\n\nIltimos, o'z vaqtida keling. O'zingizni ehtiyot qiling! 😊`,
        check_btn: "📅 Jadvalni tekshirish",
        next_injection_found: (name, date, time) => `👤 **Hurmatli ${name}**\n\nSizning navbatdagi inyeksiyangiz:\n🗓 Sana: **${date}**\n⏰ Vaqt: **${time}**`,
        no_injection_found: (name) => `👤 **Hurmatli ${name}**\n\nSizda hozircha rejalashtirilgan inyeksiyalar yo'q. 😊`
    },
    ru: {
        welcome: "👋 Здравствуйте! Пожалуйста, выберите язык:",
        ask_contact: "📲 Пожалуйста, нажмите кнопку ниже, чтобы отправить свой номер телефона:",
        share_contact_btn: "📱 Отправить номер",
        searching: "🔍 Проверка...",
        not_found: "❌ К сожалению, этот номер не найден в базе. Пожалуйста, убедитесь, что вы используете правильный номер, или обратитесь к администратору.",
        success: (name) => `✅ Добро пожаловать, **Уважаемый(ая) ${name}**! Вы успешно подключились к системе.`,
        reminder_title: "Напоминание! 🎗",
        injection_msg: (name, date, time) => `Здравствуйте, **Уважаемый(ая) ${name}**! Напоминаем вам о запланированной инъекции.\n\n🗓 Дата: **${date}**\n⏰ Время: **${time}**\n\nПожалуйста, приходите вовремя. Берегите себя! 😊`,
        check_btn: "📅 Проверить график",
        next_injection_found: (name, date, time) => `👤 **Уважаемый(ая) ${name}**\n\nВаша следующая инъекция:\n🗓 Дата: **${date}**\n⏰ Время: **${time}**`,
        no_injection_found: (name) => `👤 **Уважаемый(ая) ${name}**\n\nУ вас пока нет запланированных инъекций. 😊`
    },
    en: {
        welcome: "👋 Hello! Please choose your language:",
        ask_contact: "📲 Please press the button below to share your phone number:",
        share_contact_btn: "📱 Share Phone Number",
        searching: "🔍 Checking...",
        not_found: "❌ Sorry, this number was not found in our database. Please make sure you are using the correct number or contact an administrator.",
        success: (name) => `✅ Welcome, **Dear ${name}**! You have successfully connected to the system.`,
        reminder_title: "Reminder! 🎗",
        injection_msg: (name, date, time) => `Hello **Dear ${name}**! Just a reminder about your scheduled injection.\n\n🗓 Date: **${date}**\n⏰ Time: **${time}**\n\nPlease come on time. Take care! 😊`,
        check_btn: "📅 Check Schedule",
        next_injection_found: (name, date, time) => `👤 **Dear ${name}**\n\nYour next scheduled injection:\n🗓 Date: **${date}**\n⏰ Time: **${time}**`,
        no_injection_found: (name) => `👤 **Dear ${name}**\n\nYou have no upcoming injections scheduled. 😊`
    }
};

// State to track user language selection temporarily (in-memory)
// In production, consider a database or session store
const userSessions = {};

// --- BOT LOGIC ---

bot.start((ctx) => {
    ctx.reply(TEXTS.uz.welcome, Markup.inlineKeyboard([
        [Markup.button.callback('🇺🇿 O\'zbekcha', 'lang_uz')],
        [Markup.button.callback('🇷🇺 Русский', 'lang_ru')],
        [Markup.button.callback('🇬🇧 English', 'lang_en')]
    ]));
});

// Language Selection Handlers
['uz', 'ru', 'en'].forEach(lang => {
    bot.action(`lang_${lang}`, async (ctx) => {
        const userId = ctx.from.id;
        userSessions[userId] = { lang }; // Store language preference

        await ctx.answerCbQuery();
        await ctx.reply(TEXTS[lang].ask_contact, Markup.keyboard([
            [Markup.button.contact(TEXTS[lang].share_contact_btn)]
        ]).resize().oneTime());
    });
});

// Contact Handler
bot.on('contact', async (ctx) => {
    const userId = ctx.from.id;
    const contact = ctx.message.contact;
    const lang = userSessions[userId]?.lang || 'en'; // Default to EN if lost

    // Validate that the contact belongs to the user sending it
    if (contact.user_id !== userId) {
        return ctx.reply("❌ Please send your own contact.");
    }

    await ctx.reply(TEXTS[lang].searching, Markup.removeKeyboard());

    try {
        // Look up user in Firestore
        // Note: Phone numbers in Telegram might differ in format (+998...)
        // We act optimistically and try to match. Cleaning format is recommended.
        let phone = contact.phone_number;
        if (!phone.startsWith('+')) phone = '+' + phone; // Ensure + prefix

        console.log(`Searching for patient with phone: ${phone}`);

        const patientsRef = collection(db, 'patients');
        const q = query(patientsRef, where("phone", "==", phone));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("Patient not found.");
            return ctx.reply(TEXTS[lang].not_found);
        }

        // Patient Found
        const patientDoc = querySnapshot.docs[0];
        const patientData = patientDoc.data();
        const patientId = patientDoc.id;

        // Update Patient Doc with Chat ID
        await updateDoc(doc(db, 'patients', patientId), {
            telegramChatId: userId.toString(),
            botLanguage: lang
        });

        console.log(`Patient verified: ${patientData.fullName} (${patientId})`);

        // Success Message + Persistent Keyboard with Check Button
        await ctx.replyWithMarkdown(TEXTS[lang].success(patientData.fullName));
        await ctx.reply("👇", Markup.keyboard([
            [TEXTS[lang].check_btn]
        ]).resize());

    } catch (error) {
        console.error("Error during verification:", error);
        ctx.reply("⚠️ System error. Please try again later.");
    }
});

// Helper for Check Schedule
async function checkSchedule(ctx) {
    const userId = ctx.from.id;
    try {
        const patientsRef = collection(db, 'patients');
        const q = query(patientsRef, where("telegramChatId", "==", userId.toString()));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return ctx.reply("❌ Profilingiz topilmadi / Profile not found.");

        const patient = snapshot.docs[0].data();
        const lang = patient.botLanguage || 'uz';
        const name = patient.fullName || "Patient";

        if (patient.injections && Array.isArray(patient.injections)) {
            const now = new Date();
            const nowStr = now.toISOString().split('T')[0];

            // Filter for future scheduled injections
            const upcoming = patient.injections
                .filter(inj => inj.status === 'Scheduled' && inj.date >= nowStr) // Only future or today
                .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date ascending

            if (upcoming.length > 0) {
                const nextInj = upcoming[0];
                let time = "09:00";
                if (nextInj.date.includes('T')) time = nextInj.date.split('T')[1].substring(0, 5);

                // Format Date
                const d = new Date(nextInj.date.split('T')[0]);
                const dateDisplay = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

                ctx.reply(TEXTS[lang].next_injection_found(name, dateDisplay, time), { parse_mode: 'Markdown' });
            } else {
                ctx.reply(TEXTS[lang].no_injection_found(name), { parse_mode: 'Markdown' });
            }
        } else {
            ctx.reply(TEXTS[lang].no_injection_found(name), { parse_mode: 'Markdown' });
        }

    } catch (error) {
        console.error("Check Schedule Error:", error);
        ctx.reply("⚠️ Error checking schedule.");
    }
}

// Handlers for Check Schedule Button (All languages)
bot.hears([TEXTS.uz.check_btn, TEXTS.ru.check_btn, TEXTS.en.check_btn], (ctx) => checkSchedule(ctx));

// --- FORCE REMINDERS COMMAND (For Manual Testing) ---
bot.command('forcereminders', async (ctx) => {
    ctx.reply("⏳ Checking database for reminders due tomorrow...");
    console.log("Forcing reminder check...");

    try {
        await runReminderLogic(true, ctx);
    } catch (error) {
        console.error("Force Reminder Error:", error);
        ctx.reply("❌ Error encountered while checking reminders.");
    }
});

// --- TEST COMMAND (Simulation) ---
bot.command('testreminder', (ctx) => {
    // Simulate the new message format
    const name = "Test Patient";
    const date = new Date().toISOString().split('T')[0];
    const time = "09:00";

    // Manually format date to DD.MM.YYYY
    const d = new Date(date);
    const formattedDate = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

    const msgs = {
        uz: `Assalomu alaykum, **Hurmatli ${name}**! Sizga inyeksiya belgilanganini eslatib o'tmoqchimiz.\n\n🗓 Sana: **${formattedDate}**\n⏰ Vaqt: **${time}**\n\nIltimos, o'z vaqtida keling. O'zingizni ehtiyot qiling! 😊`,
        ru: `Здравствуйте, **Уважаемый(ая) ${name}**! Напоминаем вам о запланированной инъекции.\n\n🗓 Дата: **${formattedDate}**\n⏰ Время: **${time}**\n\nПожалуйста, приходите вовремя. Берегите себя! 😊`,
        en: `Hello **Dear ${name}**! Just a reminder about your scheduled injection.\n\n🗓 Date: **${formattedDate}**\n⏰ Time: **${time}**\n\nPlease come on time. Take care! 😊`
    };

    ctx.reply("🇺🇿 UZ:\n" + msgs.uz + "\n\n🇷🇺 RU:\n" + msgs.ru + "\n\n🇬🇧 EN:\n" + msgs.en);
});

// --- SHARED REMINDER LOGIC ---
async function runReminderLogic(isManual = false, ctx = null) {
    // 1. Get Tomorrow's Date (YYYY-MM-DD string)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // "2025-01-09"

    console.log(`Checking reminders for date: ${tomorrowStr}`);

    // 2. Get all patients with a telegramChatId
    const patientsRef = collection(db, 'patients');
    const snapshot = await getDocs(patientsRef);

    let count = 0;

    snapshot.forEach(docSnap => {
        const patient = docSnap.data();

        // Only proceed if registered in bot
        if (patient.telegramChatId && patient.injections && Array.isArray(patient.injections)) {

            // 3. Find injections for tomorrow
            const injectionDue = patient.injections.find(inj =>
                inj.status === 'Scheduled' &&
                inj.date &&
                inj.date.startsWith(tomorrowStr)
            );

            if (injectionDue) {
                const lang = patient.botLanguage || 'uz';
                const chatId = patient.telegramChatId;
                const name = patient.fullName || patient.name || "Patient";

                // Parse Time if available
                let time = "09:00"; // Default
                if (injectionDue.date.includes('T')) {
                    time = injectionDue.date.split('T')[1].substring(0, 5); // HH:mm
                }

                // Format Date for display DD.MM.YYYY
                const d = new Date(injectionDue.date.split('T')[0]);
                const dateDisplay = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

                console.log(`Sending reminder to ${name} (${chatId})`);

                bot.telegram.sendMessage(chatId,
                    `${TEXTS[lang].reminder_title}\n\n${TEXTS[lang].injection_msg(name, dateDisplay, time)}`
                ).catch(e => console.error(`Failed to send to ${chatId}:`, e.message));

                count++;
            }
        }
    });

    console.log(`Process Complete. Sent ${count} reminders.`);
    if (isManual && ctx) {
        ctx.reply(`✅ Check complete. Sent ${count} reminders for date ${tomorrowStr}.`);
    }
}

// --- REMINDER SCHEDULER (Daily) ---

// Run every day at 9:00 AM
cron.schedule('0 9 * * *', async () => {
    console.log("Running Daily Reminder Job...");
    try {
        await runReminderLogic();
    } catch (error) {
        console.error("Reminder Job Error:", error);
    }
});

// --- BOOT ---
bot.launch().then(() => {
    console.log('🤖 Bot is running...');
}).catch(err => {
    console.error('❌ Bot launch failed:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
