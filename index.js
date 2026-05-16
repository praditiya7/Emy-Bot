require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Inisialisasi Bot dengan Proteksi Arus Ganda
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: {
    params: {
      drop_pending_updates: true
    }
  }
});

const OWNER_ID = process.env.OWNER_ID;
const OWNER_USERNAME = 'Emyawu';
const QRIS_IMAGE_URL = 'https://picsum.photos/500/500';
const DB_PATH = path.join(__dirname, 'database.json');

// --- DATABASE UTILITY FUNCTIONS ---
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { users: {} };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Gagal menulis ke database:', err.message);
  }
}

function verifyUserInDB(chatId, username) {
  const db = readDB();
  if (!db.users[chatId]) {
    db.users[chatId] = {
      username: username || 'User Node',
      points: 20,
      premiumUntil: null,
      lastDailyReset: null
    };
    writeDB(db);
  }
  return db.users[chatId];
}

// --- GENERATOR UTILITY ---
const firstNames = ['andi', 'budi', 'rizky', 'fajar', 'dika', 'reza', 'tomi', 'kevin', 'putra', 'ari', 'siti', 'dewi', 'amanda', 'putri', 'santi'];
const emyLastNames = ['emy', 'emyx', 'zemy', 'cemy', 'xemy', 'emyc', 'emyz', 'vemy', 'lemy'];

function generateSecureMail(domain) {
  const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lName = emyLastNames[Math.floor(Math.random() * emyLastNames.length)];
  const randNum = Math.floor(Math.random() * 899) + 100;
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let pass = lName;
  for (let i = 0; i < 7; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
  
  return {
    email: `${fName}.${lName}${randNum}@${domain}`,
    password: pass
  };
}

// -------------------------------------------------------------
// MAIN COMMAND INTERFACE (CASE-INSENSITIVE + LIVE TEXT)
// -------------------------------------------------------------

bot.onText(/\/start/i, (msg) => {
  const chatId = msg.chat.id;
  const user = verifyUserInDB(chatId, msg.from.first_name);
  const isAdmin = String(chatId) === String(OWNER_ID);

  let licenseType = '🔴 FREE TIER INTEGRATION';
  if (isAdmin) {
    licenseType = '👑 DEVELOPER LIFE-TIME';
  } else if (user.premiumUntil && new Date() < new Date(user.premiumUntil)) {
    licenseType = `⚡ E-PREMIUM (Exp: ${new Date(user.premiumUntil).toLocaleDateString('id-ID')})`;
  }

  const response = `
*📡 EMYXML V3.5 SECURITY PROTOCOL INITIALIZED*
───────────────────────────────────
Halo, *${msg.from.first_name}*. Otentikasi enkode terminal Anda berhasil diverifikasi oleh pangkalan awan.

*SYSTEM ACCOUNT TELEMETRY:*
• Node User ID : \`${chatId}\`
• License Pool : *${licenseType}*
• Core Points  : *${isAdmin ? '💎 UNLIMITED' : user.points + ' Points'}*

*CONNECTED NETWORK COMMANDS:*
/CreateMailR - Hubungkan ke gerbang distribusi domain
/CheckPoint  - Sinkronisasi instan status penyimpanan poin
/TopupPoint  - Jalur peningkatan enkripsi & pembelian saldo
───────────────────────────────────
`;
  bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
});

bot.onText(/\/CreateMailR/i, (msg) => {
  const chatId = msg.chat.id;
  verifyUserInDB(chatId, msg.from.first_name);

  const menuText = `
*🌐 DOMAIN DISTRIBUTION ROUTER CENTRAL*
───────────────────────────────────
Pilih basis emulasi server mailbox sandbox virtual yang ingin Anda deploy ke dalam jaringan:

*AVAILABLE MAIL INTERFACES:*
1. *Gmail.com* (Standard Node)
   • Biaya: Alokasi 5 Poin Saldo
2. *Outlook.com* (E-Premium Only)
   • Biaya: Dedicated / Tanpa Potong Poin
3. *Yahoo.com* (E-Premium Only)
   • Biaya: Dedicated / Tanpa Potong Poin

_Silakan gunakan panel enkripsi tombol di bawah ini:_
───────────────────────────────────
`;

  bot.sendMessage(chatId, menuText, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔴 Deploy Gmail.com Server Node', callback_data: 'action_gmail.com' }],
        [
          { text: '🔵 Outlook.com (Premium)', callback_data: 'action_outlook.com' },
          { text: '🟣 Yahoo.com (Premium)', callback_data: 'action_yahoo.com' }
        ]
      ]
    }
  });
});

// -------------------------------------------------------------
// INTERACTIVE ENGINE CALLBACK (DENGAN PENANGANAN EROR MANDIRI)
// -------------------------------------------------------------
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // Sinyal balik instan agar Telegram tidak mengalami timeout/loading di HP
  bot.answerCallbackQuery(query.id).catch(() => {});

  if (!data || !data.startsWith('action_')) return;
  const selectedDomain = data.split('_')[1];

  // Hapus panel tombol lama agar chat terlihat hidup dan bergerak maju
  bot.deleteMessage(chatId, query.message.message_id).catch(() => {});

  // Ambil state data terbaru dari database lokal
  const db = readDB();
  const user = db.users[chatId] || { points: 20, premiumUntil: null };
  const isAdmin = String(chatId) === String(OWNER_ID);
  const isPremium = user.premiumUntil && new Date() < new Date(user.premiumUntil);

  // 1. Validasi Akses Jalur Premium
  if ((selectedDomain === 'outlook.com' || selectedDomain === 'yahoo.com') && !isAdmin && !isPremium) {
    return bot.sendMessage(chatId, `
*⚠️ SECURITY BREACH DETECTED*
───────────────────────────────────
Akses ditolak. Node dedicated *${selectedDomain}* memerlukan otentikasi lisensi tingkat tinggi.

• Status Akun: *FREE LITE INTERFACE*
• Kebutuhan Akses: *E-PREMIUM LICENSE*

Ketik /TopupPoint untuk mengajukan peningkatan node server.
───────────────────────────────────
`, { parse_mode: 'Markdown' });
  }

  // 2. Validasi & Pengurangan Saldo Poin Akun Standard
  if (selectedDomain === 'gmail.com' && !isAdmin) {
    if (user.points < 5) {
      return bot.sendMessage(chatId, `
*❌ POIN TRANSAKSI TIDAK MENCUKUPI*
───────────────────────────────────
Gagal mengamankan alokasi server sandbox.

• Biaya Node  : *5 Points*
• Saldo Anda  : *${user.points} Points*

Gunakan /TopupPoint untuk mengisi ulang daya enkripsi bot Anda.
───────────────────────────────────
`, { parse_mode: 'Markdown' });
    }
    // Kurangi poin secara permanen di database
    db.users[chatId].points -= 5;
    writeDB(db);
  }

  // 3. Efek Animasi Konsol Mengalir (Membuat Bot Lebih Terasa "Hidup")
  try {
    const liveMsg = await bot.sendMessage(chatId, `\`[📡 TERMINAL POOL]\` Mencoba melakukan jabat tangan (handshake) dengan server \`${selectedDomain}\`...`, { parse_mode: 'Markdown' });
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    await delay(900);
    await bot.editMessageText(`\`[🔐 CRYPTO ENGINE]\` Menghasilkan sertifikasi kunci publik dan hashing SHA-256...`, { chat_id: chatId, message_id: liveMsg.message_id, parse_mode: 'Markdown' }).catch(() => {});
    
    await delay(900);
    await bot.editMessageText(`\`[🧬 COMPILING]\` Memasukkan identitas virtual ke relai SMTP/IMAP sandbox...`, { chat_id: chatId, message_id: liveMsg.message_id, parse_mode: 'Markdown' }).catch(() => {});

    await delay(700);
    const resultMail = generateSecureMail(selectedDomain);
    const updatedDb = readDB();
    const currentPoints = isAdmin ? '💎 INFINITE' : `${updatedDb.users[chatId].points} Points`;

    const finalSuccessTemplate = `
*✅ VIRTUAL NODE DEPLOYED SUCCESSFULLY*
───────────────────────────────────
Server sandbox terkonfigurasi dengan sukses. Data kredensial siap digunakan:

• *Virtual Mail :* \`${resultMail.email}\`
• *Access Pass  :* \`${resultMail.password}\`

*SYSTEM METADATA LOGS:*
• Router Core  : \`${selectedDomain.toUpperCase()}\`
• Token Status : \`Active / Operational\`
• Sisa Saldo   : *${currentPoints}*

_Catatan: Ketuk sekali pada box data untuk menyalin teks secara otomatis._
───────────────────────────────────
`;
    await bot.editMessageText(finalSuccessTemplate, { chat_id: chatId, message_id: liveMsg.message_id, parse_mode: 'Markdown' }).catch(() => {
      bot.sendMessage(chatId, finalSuccessTemplate, { parse_mode: 'Markdown' });
    });

  } catch (error) {
    console.error('Sistem error internal animasi:', error.message);
  }
});

// -------------------------------------------------------------
// DIAGNOSTIC COMMANDS
// -------------------------------------------------------------
bot.onText(/\/CheckPoint/i, (msg) => {
  const chatId = msg.chat.id;
  const user = verifyUserInDB(chatId, msg.from.first_name);
  const isAdmin = String(chatId) === String(OWNER_ID);

  let isPrem = 'NON-AKTIF';
  if (isAdmin) isPrem = 'OWNER LIFETIME PRIVILEGE';
  else if (user.premiumUntil && new Date() < new Date(user.premiumUntil)) isPrem = `AKTIF (Selesai pada: ${new Date(user.premiumUntil).toLocaleDateString('id-ID')})`;

  bot.sendMessage(chatId, `
*🖥️ CREDENTIAL DATABASE DIAGNOSTIC*
───────────────────────────────────
Sinkronisasi real-time berhasil diambil dari server internal:

• Total Poin Tersedia : *${isAdmin ? '💎 UNLIMITED' : user.points + ' Poin'}*
• Validasi E-Premium   : *${isPrem}*
• Status Firewall Node: \`SECURE / CLEAR\`
───────────────────────────────────
`, { parse_mode: 'Markdown' });
});

bot.onText(/\/TopupPoint/i, (msg) => {
  const chatId = msg.chat.id;
  const caption = `
*💳 UPGRADE SUBSCRIPTION GATEWAY CENTER*
───────────────────────────────────
Pilih paket peningkatan kapasitas server enkripsi Anda:

*LIST PRICING NODES:*
• *Lite Node:* Rp 5.000   -> +50 Alokasi Poin
• *Mega Node:* Rp 10.000  -> +120 Alokasi Poin
• *E-PREMIUM LISENSI:* Rp 10.000 -> Masa Aktif 14 Hari
  _(Bebas buat email Outlook & Yahoo tanpa batas potong saldo)_

*URUTAN EKSEKUSI:*
1. Pindai QRIS Gateway di atas menggunakan dompet digital Anda.
2. Kirim bukti transaksi beserta nomor UID Jaringan Anda (\`${chatId}\`) ke operator utama.
───────────────────────────────────
`;
  bot.sendPhoto(chatId, QRIS_IMAGE_URL, {
    caption: caption,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[{ text: 'Hubungi Pusat Administrasi Secure', url: `https://t.me/${OWNER_USERNAME}` }]]
    }
  });
});

// --- ADMIN COMMANDS ---
bot.onText(/\/isi (\d+) (\d+)/i, (msg, match) => {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(OWNER_ID)) return;

  const target = match[1];
  const count = parseInt(match[2]);

  const db = readDB();
  if (!db.users[target]) verifyUserInDB(target, 'User Node');
  
  db.users[target].points += count;
  writeDB(db);

  bot.sendMessage(chatId, `🟢 Poin berhasil ditambahkan ke UID \`${target}\`. Total sekarang: *${db.users[target].points}*`, { parse_mode: 'Markdown' });
  bot.sendMessage(target, `*⚡ AKUN POIN DIPERBARUI ADMIN*\nSaldo Anda bertambah *+${count} Poin*. Total saat ini: *${db.users[target].points} Poin*`, { parse_mode: 'Markdown' }).catch(() => {});
});

bot.onText(/\/premium (\d+)/i, (msg, match) => {
  const chatId = msg.chat.id;
  if (String(chatId) !== String(OWNER_ID)) return;

  const target = match[1];
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 14);

  const db = readDB();
  if (!db.users[target]) verifyUserInDB(target, 'User Node');

  db.users[target].premiumUntil = expiry.toISOString();
  writeDB(db);

  bot.sendMessage(chatId, `🟢 Akses E-Premium diaktifkan untuk UID \`${target}\` sampai *${expiry.toLocaleDateString('id-ID')}*`, { parse_mode: 'Markdown' });
  bot.sendMessage(target, `*👑 LISENSI PREMIUM DIAKTIFKAN ADMIN*\nHak jalur server dedicated Outlook & Yahoo kini terbuka penuh selama 14 hari kedepan!`, { parse_mode: 'Markdown' }).catch(() => {});
});

console.log('=== CORE ENGINE RUNNING CLEAR ===');
