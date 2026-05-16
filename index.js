require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Mengabaikan sisa data macet dari server lama
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: {
    params: {
      drop_pending_updates: true
    }
  }
});

// Pembersihan parsing ID untuk mencegah bug tipe data dari file .env
const OWNER_ID = process.env.OWNER_ID ? process.env.OWNER_ID.replace(/['"]+/g, '').trim() : '';
const OWNER_USERNAME = 'Emyawu';
const QRIS_IMAGE_URL = 'https://qu.ax/g1eRh';
const DB_PATH = path.join(__dirname, 'database.json');

// --- DATABASE CONTROLLER ---
function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (err) {
    return { users: {} };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Gagal menulis database:', err.message);
  }
}

function verifyUser(chatId, firstName) {
  const db = readDB();
  if (!db.users[chatId]) {
    db.users[chatId] = {
      name: firstName || 'User Node',
      points: 20,
      premiumUntil: null
    };
    writeDB(db);
  }
  return db.users[chatId];
}

// --- GENERATOR CENTER ---
const aliases = ['andi', 'budi', 'rizky', 'fajar', 'dika', 'reza', 'tomi', 'kevin', 'dewi', 'amanda', 'putri', 'nisa'];
const suffixes = ['emy', 'emyx', 'zemy', 'cemy', 'xemy', 'emyc', 'emyz'];

function buildVirtualMail(domain) {
  const name = aliases[Math.floor(Math.random() * aliases.length)];
  const suff = suffixes[Math.floor(Math.random() * suffixes.length)];
  const rand = Math.floor(Math.random() * 899) + 100;
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let pass = suff;
  for (let i = 0; i < 7; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
  
  return {
    email: `${name}.${suff}${rand}@${domain}`,
    password: pass
  };
}

// -------------------------------------------------------------
// TEXT COMMANDS (CLEAN & RAPI, MAKSIMAL 1 EMOJI PER BARIS)
// -------------------------------------------------------------

bot.onText(/\/start/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);
  const isAdmin = chatId === OWNER_ID;

  let tier = 'Free Tier';
  if (isAdmin) tier = 'Premium Enterprise (Owner)';
  else if (user.premiumUntil && new Date() < new Date(user.premiumUntil)) tier = 'E-Premium Active';

  const menuText = `
💻 *EMYCMAIL AUTOMATED SYSTEM v3.5*
───────────────────────
Selamat datang, *${msg.from.first_name}*. Sistem siap mengonfigurasi dan mendeploy virtual mail server secara instan.

*SYSTEM CONFIGURATION*
• Core API: \`v3.5 / Operational\`
• Security Node: \`Cloudflare Protected\`
• Account License: *${tier}*

*ACCOUNT BALANCE*
• Available Balance: *${isAdmin ? 'Unlimited (Admin Mode)' : user.points + ' Points'}*

*SYSTEM PANEL COMMANDS*
/CreateMailR - Select & deploy virtual mail server
/CheckPoint - Diagnose database and check balance
/TopupPoint - Upgrade account tier or recharge balance
/ask [text] - Interact with EmyCMail AI Assistant

• Network UID: \`${chatId}\`
───────────────────────
`;
  bot.sendMessage(chatId, menuText, { parse_mode: 'Markdown' });
});

bot.onText(/\/CreateMailR/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  verifyUser(chatId, msg.from.first_name);

  const menuText = `
🌐 *DOMAIN DISTRIBUTION CENTER*
───────────────────────
Silakan pilih basis domain server yang ingin diintegrasikan ke jaringan virtual sandbox:

*AVAILABLE MAIL INTERFACES:*
1. Gmail.com (Free Tier Node)
   • Cost: 5 Points Allocation
2. Outlook.com (E-Premium Dedicated Server)
   • Cost: 0 Points (Requires Active Subscription)
3. Yahoo.com (E-Premium Dedicated Server)
   • Cost: 0 Points (Requires Active Subscription)

_Pilih interaksi node melalui tombol di bawah ini:_
───────────────────────
`;

  bot.sendMessage(chatId, menuText, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Gmail.com (Standard Node)', callback_data: 'core_gmail.com' }],
        [
          { text: 'Outlook.com (E-Premium)', callback_data: 'core_outlook.com' },
          { text: 'Yahoo.com (E-Premium)', callback_data: 'core_yahoo.com' }
        ]
      ]
    }
  });
});

// -------------------------------------------------------------
// -------------------------------------------------------------
// -------------------------------------------------------------
// AI ASSISTANT COMMAND CENTER (STABLE GEMINI v1beta INTEGRATION)
// -------------------------------------------------------------
bot.onText(/\/ask (.+)/i, async (msg, match) => {
  const chatId = String(msg.chat.id).trim();
  const query = match[1].trim();

  verifyUser(chatId, msg.from.first_name);
  bot.sendChatAction(chatId, 'typing');

  // Bersihkan spasi atau tanda kutip liar dari file .env agar tidak bug
  const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.replace(/['"]+/g, '').trim() : '';

  if (!apiKey) {
    return bot.sendMessage(chatId, `⚠️ *SYSTEM ERROR*\n\nAPI Key Gemini belum dikonfigurasi di file env oleh pemilik bot.`, { parse_mode: 'Markdown' });
  }

  try {
    // Menggunakan endpoint resmi gemini-1.5-flash versi v1beta (Kompatibilitas Paling Stabil)
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [
              { 
                text: `Kamu adalah asisten pintar bernama EmyCMail AI. Jawablah pertanyaan berikut dengan singkat, jelas, padat, ramah, dan wajib menggunakan Bahasa Indonesia: ${query}` 
              }
            ]
          }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000 // Menambah batas tunggu menjadi 15 detik untuk antisipasi jaringan lambat
      }
    );

    // Validasi struktur kembalian data dari Google sebelum dikirim ke user
    if (response.data && response.data.candidates && response.data.candidates[0].content.parts[0].text) {
      const aiAnswer = response.data.candidates[0].content.parts[0].text;
      
      const replyTemplate = `
🤖 *EMYCMAIL AI ASSISTANT*
───────────────────────
• Question: _${query}_

*ANSWER:*
${aiAnswer.trim()}
───────────────────────
`;
      bot.sendMessage(chatId, replyTemplate, { parse_mode: 'Markdown' });
    } else {
      throw new Error('Struktur JSON respon tidak sesuai dengan standar Google AI Studio.');
    }

  } catch (err) {
    // IMPROVED ERROR HANDLING (Rekomendasi Copilot):
    // Mencetak log super detail ke terminal Codespaces agar pemilik bot tahu alasan penolakannya
    console.error('=== GEMINI API ERROR LOG ===');
    if (err.response) {
      console.error('Status Code :', err.response.status);
      console.error('Error Data  :', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error Message:', err.message);
    }
    console.error('============================');

    // Pesan ramah yang tetap menjaga estetika tampilan bot di Telegram
    bot.sendMessage(chatId, `⚠️ *SYSTEM ERROR*\n\nGagal memproses data di Google AI Studio.\n\n• Detail: \`${err.response ? err.response.data.error.message : err.message}\`\n\nSilakan hubungi administrator jika masalah berlanjut.`, { parse_mode: 'Markdown' });
  }
});

bot.onText(/\/ask$/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  bot.sendMessage(chatId, `💡 *INFORMASI INTEGRASI AI*\n\nFormat salah. Silakan ketik perintah diikuti dengan pertanyaan Anda.\n\n• Contoh: \`/ask berikan saya tips belajar javascript\``, { parse_mode: 'Markdown' });
});

// -------------------------------------------------------------
// INTERACTIVE CALLBACK QUERY (ANTI-CONFLICT ENGINE)
// -------------------------------------------------------------
bot.on('callback_query', async (query) => {
  const chatId = String(query.message.chat.id).trim();
  const data = query.data;

  bot.answerCallbackQuery(query.id).catch(() => {});

  if (!data || !data.startsWith('core_')) return;
  const targetDomain = data.split('_')[1];

  bot.deleteMessage(chatId, query.message.message_id).catch(() => {});

  const db = readDB();
  const user = db.users[chatId] || { points: 0, premiumUntil: null };
  const isAdmin = chatId === OWNER_ID;
  const isPremium = user.premiumUntil && new Date() < new Date(user.premiumUntil);

  // 1. Validasi Akses Premium Dedicated Server (Bypass Otomatis Khusus Admin)
  if ((targetDomain === 'outlook.com' || targetDomain === 'yahoo.com') && !isAdmin && !isPremium) {
    return bot.sendMessage(chatId, `
⚠️ *SECURITY ACCESS DENIED*
───────────────────────
Sistem menolak otentikasi. Jalur server dedicated *${targetDomain}* memerlukan tingkat akun yang lebih tinggi.

• Current License: *Free Tier (Restricted)*
• Activation Required: *E-Premium*

Gunakan perintah /TopupPoint untuk menghubungi administrasi.
───────────────────────
`, { parse_mode: 'Markdown' });
  }

  // 2. Validasi & Pemotongan Saldo Poin (Bypass Otomatis Khusus Admin)
  if (targetDomain === 'gmail.com' && !isAdmin) {
    if (user.points < 5) {
      return bot.sendMessage(chatId, `
❌ *RATE LIMIT EXCEEDED*
───────────────────────
Gagal mengamankan alokasi server sandbox karena saldo poin tidak mencukupi.

• Required Fee: *5 Points*
• Available Balance: *${user.points} Points*

Silakan lakukan pengisian saldo melalui menu /TopupPoint.
───────────────────────
`, { parse_mode: 'Markdown' });
    }
    db.users[chatId].points -= 5;
    writeDB(db);
  }

  // 3. Prosedur Animasi Konsol Mengalir
  try {
    const liveMsg = await bot.sendMessage(chatId, `\`[SYSTEM PROLOG]\` Connecting to virtual node pool \`${targetDomain}\`...`, { parse_mode: 'Markdown' });
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    await delay(700);
    await bot.editMessageText(`\`[ENCRYPTION]\` Generating cryptographic tokens and hashing access key (SHA-256)...`, { chat_id: chatId, message_id: liveMsg.message_id, parse_mode: 'Markdown' }).catch(() => {});

    await delay(700);
    await bot.editMessageText(`\`[COMPILING]\` Transmitting payload handshake to SMTP/IMAP network relays...`, { chat_id: chatId, message_id: liveMsg.message_id, parse_mode: 'Markdown' }).catch(() => {});

    await delay(500);
    const result = buildVirtualMail(targetDomain);
    
    const latestDb = readDB();
    const currentPoints = isAdmin ? 'Unlimited (Admin Mode)' : `${latestDb.users[chatId].points} Points`;

    const successTemplate = `
✅ *VIRTUAL MAIL SERVER DEPLOYED SUCCESS*
───────────────────────
Alokasi server sandbox virtual berhasil dibangun dan siap digunakan:

• *Virtual Email:* \`${result.email}\`
• *Access Password:* \`${result.password}\`

*NODE METADATA LOG*
• Routing Core: \`${targetDomain.toUpperCase()}\`
• Session Fee: ${isAdmin ? '0 Points (Bypass)' : 'Deducted Successfully'}
• Current Balance: *${currentPoints}*
• Server Status: \`Active / Operational\`

_Catatan: Ketuk satu kali pada bagian Email atau Password untuk menyalin data ke clipboard._
───────────────────────
`;
    await bot.editMessageText(successTemplate, { chat_id: chatId, message_id: liveMsg.message_id, parse_mode: 'Markdown' }).catch(() => {
      bot.sendMessage(chatId, successTemplate, { parse_mode: 'Markdown' });
    });

  } catch (err) {
    console.error('Error internal alur animasi callback:', err.message);
  }
});

// -------------------------------------------------------------
// DIAGNOSTIC COMMANDS
// -------------------------------------------------------------
bot.onText(/\/CheckPoint/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);
  const isAdmin = chatId === OWNER_ID;

  let statusPrem = 'Inactive';
  if (isAdmin) statusPrem = 'Infinite / Owner Lifetime';
  else if (user.premiumUntil && new Date() < new Date(user.premiumUntil)) statusPrem = `Active (Until: ${new Date(user.premiumUntil).toLocaleDateString('id-ID')})`;

  bot.sendMessage(chatId, `
🔍 *CREDENTIAL INFRASTRUCTURE DIAGNOSTIC*
───────────────────────
Berhasil memuat sinkronisasi metadata enkripsi akun Anda dari awan:

• Point Balance: *${isAdmin ? 'Unlimited (Developer Mode)' : user.points + ' Points'}*
• E-Premium License: *${statusPrem}*
• Firewall Node Status: \`Active / Operational\`
───────────────────────
`, { parse_mode: 'Markdown' });
});

bot.onText(/\/TopupPoint/i, (msg) => {
  const chatId = String(msg.chat.id).trim();
  const caption = `
💳 *UPGRADE SUBSCRIPTION & CREDIT INTERFACE*
───────────────────────
Silakan lakukan transaksi penambahan poin lisensi atau aktivasi akun premium melalui gateway terpusat.

*CREDIT NODES PRICING:*
• Lite Node: Rp 5.000 -> +50 Points Allocation
• Mega Node: Rp 10.000 -> +120 Points Allocation
• E-PREMIUM NODE: Rp 10.000 -> 14 Days Active
  _(Akses tanpa batas pembuatan domain Outlook.com & Yahoo.com tanpa potong saldo poin)_

*TRANSACTION SEQUENCE:*
1. Pindai kode QRIS Gateway di atas menggunakan aplikasi finansial digital Anda.
2. Selesaikan pemindahan dana sesuai nominal paket yang dituju.
3. Kirim berkas digital Bukti Transfer serta menyertakan nomor Jaringan UID Anda (\`${chatId}\`) ke konsol admin utama.
───────────────────────
`;
  bot.sendPhoto(chatId, QRIS_IMAGE_URL, {
    caption: caption,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: 'Connect to Secure Admin Account', url: `https://t.me/${OWNER_USERNAME}` }]]
    }
  });
});

// -------------------------------------------------------------
// RESTRICTED ADMINISTRATOR COMMAND CENTER
// -------------------------------------------------------------
bot.onText(/\/isi (\d+) (\d+)/i, (msg, match) => {
  const chatId = String(msg.chat.id).trim();
  if (chatId !== OWNER_ID) return;

  const target = match[1].trim();
  const amt = parseInt(match[2]);

  const db = readDB();
  if (!db.users[target]) db.users[target] = { name: 'User Node', points: 20, premiumUntil: null };
  db.users[target].points += amt;
  writeDB(db);

  bot.sendMessage(chatId, `🟢 \`[CONSOLE SUCCESS]\` Points injected successfully.\n• Target: \`${target}\`\n• Added: *+${amt}*\n• Final: *${db.users[target].points}*`, { parse_mode: 'Markdown' });
  bot.sendMessage(target, `⚡ *DATABASE UPDATED: PREMIUM RECHARGE*\n───────────────────────\nSistem admin telah memvalidasi berkas dana Anda.\n\n• Allocation Added: *+${amt} Points*\n• Current Total Account Balance: *${db.users[target].points} Points*\n───────────────────────`, { parse_mode: 'Markdown' }).catch(() => {});
});

bot.onText(/\/premium (\d+)/i, (msg, match) => {
  const chatId = String(msg.chat.id).trim();
  if (chatId !== OWNER_ID) return;

  const target = match[1].trim();
  const exp = new Date();
  exp.setDate(exp.getDate() + 14);

  const db = readDB();
  if (!db.users[target]) db.users[target] = { name: 'User Node', points: 20, premiumUntil: null };
  db.users[target].premiumUntil = exp.toISOString();
  writeDB(db);

  bot.sendMessage(chatId, `🟢 \`[CONSOLE SUCCESS]\` E-Premium tier initialized.\n• Target: \`${target}\`\n• Expiration Date: *${exp.toLocaleDateString('id-ID')}*`, { parse_mode: 'Markdown' });
  bot.sendMessage(target, `
👑 *SISTEM VERIFIKASI: LISENSI E-PREMIUM DIAKTIFKAN*
───────────────────────
Portal administrasi pusat telah memperbarui hak izin jaringan akun Anda.

• Active Period: *14 Days / 2 Weeks*
• Dedicated Domain Routing: \`Outlook.com\` & \`Yahoo.com\` (ENABLED)
• Core Calculation: \`Unlimited Nodes Simulation\`

Terima kasih atas kemitraan Anda. Jalur enkripsi premium kini siap dieksekusi di panel /CreateMailR.
───────────────────────
`, { parse_mode: 'Markdown' }).catch(() => {});
});

bot.onText(/\/unpremium (\d+)/i, (msg, match) => {
  const chatId = String(msg.chat.id).trim();
  if (chatId !== OWNER_ID) return;

  const target = match[1].trim();
  const db = readDB();

  if (!db.users[target]) {
    return bot.sendMessage(chatId, `❌ Jaringan UID \`${target}\` tidak terdaftar di database server.`, { parse_mode: 'Markdown' });
  }

  db.users[target].premiumUntil = null;
  writeDB(db);

  bot.sendMessage(chatId, `🔴 \`[CONSOLE SUCCESS]\` E-Premium tier revoked.\n• Target: \`${target}\`\n• Status: *Deactivated*`, { parse_mode: 'Markdown' });
  bot.sendMessage(target, `
⚠️ *PEMBERITAHUAN: LISENSI E-PREMIUM DICABUT*
───────────────────────
Portal administrasi pusat telah menonaktifkan hak izin jalur premium pada akun Anda.

• Account Status: *Returned to Free Tier (Restricted)*

Untuk kembali mengaktifkan alokasi jalur dedicated server, silakan hubungi administrasi melalui menu /TopupPoint.
───────────────────────
`, { parse_mode: 'Markdown' }).catch(() => {});
});

console.log('=== CORE SYSTEM v3.5 RUNNING CLEAR ===');
