require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Mengamankan library axios untuk mengambil data email asli
let axios;
try {
  axios = require('axios');
} catch (e) {
  console.error('⚠️ [CRITICAL] Library axios belum terinstal. Jalankan: npm install axios');
}

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: {
    params: {
      drop_pending_updates: true
    }
  }
});

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
      premiumUntil: null,
      activeEmail: null // Tempat menyimpan session email aktif pengguna
    };
    writeDB(db);
  }
  return db.users[chatId];
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
Selamat datang, *${msg.from.first_name}*. Jaringan siap mendeploy alamat email sementara nyata secara instan.

*SYSTEM CONFIGURATION*
• Core Mail: \`SecMail API Protected\`
• Gateway Status: \`Active / Operational\`
• Account License: *${tier}*

*ACCOUNT BALANCE*
• Available Balance: *${isAdmin ? 'Unlimited (Admin Mode)' : user.points + ' Points'}*

*SYSTEM PANEL COMMANDS*
/CreateMailR - Generate temporary email address
/CheckInbox - Fetch verification codes & OTP messages
/CheckPoint - Diagnose database and check balance
/TopupPoint - Upgrade account tier or recharge balance

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
Silakan pilih basis domain server mail sementara yang ingin diintegrasikan ke akun Anda:

*AVAILABLE MAIL INTERFACES:*
1. Secmail.com (Free Tier Node)
   • Cost: 5 Points Allocation
2. Secmail.net (E-Premium Dedicated Server)
   • Cost: 0 Points (Requires Active Subscription)
3. Directmail.top (E-Premium Dedicated Server)
   • Cost: 0 Points (Requires Active Subscription)

_Pilih interaksi node melalui tombol di bawah ini:_
───────────────────────
`;

  bot.sendMessage(chatId, menuText, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Secmail.com (Standard Node)', callback_data: 'core_secmail.com' }],
        [
          { text: 'Secmail.net (E-Premium)', callback_data: 'core_secmail.net' },
          { text: 'Directmail.top (E-Premium)', callback_data: 'core_directmail.top' }
        ]
      ]
    }
  });
});

// -------------------------------------------------------------
// REAL-TIME INBOX FETCHER (FITUR UTAMA CEK OTP NYATA)
// -------------------------------------------------------------
bot.onText(/\/CheckInbox/i, async (msg) => {
  const chatId = String(msg.chat.id).trim();
  const user = verifyUser(chatId, msg.from.first_name);

  if (!user.activeEmail) {
    return bot.sendMessage(chatId, `❌ *INBOX EMPTY*\n\nAnda belum membuat email sementara aktif. Silakan buat terlebih dahulu melalui menu /CreateMailR`, { parse_mode: 'Markdown' });
  }

  bot.sendChatAction(chatId, 'typing');
  const [login, domain] = user.activeEmail.split('@');

  try {
    // Meminta daftar surat masuk dari API SecMail asli
    const response = await axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${login}&domain=${domain}`);
    const messages = response.data;

    if (!messages || messages.length === 0) {
      return bot.sendMessage(chatId, `📥 *MAILBOX MONITORING*\n\nEmail: \`${user.activeEmail}\`\nStatus: \`Waiting for incoming OTP/Messages...\`\n\n_Belum ada pesan baru masuk. Silakan kirimkan OTP dari aplikasi tujuan lalu klik /CheckInbox kembali._`, { parse_mode: 'Markdown' });
    }

    // Mengambil pesan terbaru yang masuk (Paling Atas)
    const latestMail = messages[0];
    
    // Menarik detail isi pesan (body text) berdasarkan ID surat
    const detailResponse = await axios.get(`https://www.1secmail.com/api/v1/?action=readMessage&login=${login}&domain=${domain}&id=${latestMail.id}`);
    const mailContent = detailResponse.data;

    // Menghapus tag HTML bawaan email agar rapi saat dibaca di Telegram
    const cleanText = mailContent.textBody ? mailContent.textBody.replace(/<\/?[^>]+(>|$)/g, "").substring(0, 500) : 'Pesan teks tidak dapat dimuat.';

    const inboxTemplate = `
📩 *NEW EMAIL ARRIVED SUCCESS*
───────────────────────
• *Active Mail:* \`${user.activeEmail}\`
• *From Sender:* \`${mailContent.from}\`
• *Subject:* *${mailContent.subject || 'No Subject'}*
• *Date Received:* \`${mailContent.date}\`

*MESSAGE BODY / OTP CODE:*
\`\`\`text
${cleanText.trim()}
\`\`\`
───────────────────────
`;
    bot.sendMessage(chatId, inboxTemplate, { parse_mode: 'Markdown' });

  } catch (err) {
    console.error('Gagal mengambil data inbox:', err.message);
    bot.sendMessage(chatId, `⚠️ *SYSTEM ERROR*\n\nGagal terhubung ke Mail Server Cloud Node. Silakan coba beberapa saat lagi.`, { parse_mode: 'Markdown' });
  }
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

  // 1. Validasi Akses Premium Dedicated Server
  if ((targetDomain === 'secmail.net' || targetDomain === 'directmail.top') && !isAdmin && !isPremium) {
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

  // 2. Validasi & Pemotongan Saldo Poin
  if (targetDomain === 'secmail.com' && !isAdmin) {
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
  }

  // 3. Prosedur Pembuatan Email Sementara Nyata Langsung Dari API
  try {
    const liveMsg = await bot.sendMessage(chatId, `\`[SYSTEM PROLOG]\` Fetching active node pool \`${targetDomain}\`...`, { parse_mode: 'Markdown' });
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    await delay(600);
    
    // Request nama email acak yang valid dari server SecMail
    const response = await axios.get(`https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1`);
    const originalEmail = response.data[0]; // Format asli: xxxx@1secmail.com
    
    // Menyesuaikan domain dengan yang dipilih pengguna di tombol keyboard
    const prefix = originalEmail.split('@')[0];
    const realGeneratedEmail = `${prefix}@${targetDomain}`;

    // Simpan email baru ke session aktif user di database
    db.users[chatId].activeEmail = realGeneratedEmail;
    writeDB(db);

    const latestDb = readDB();
    const currentPoints = isAdmin ? 'Unlimited (Admin Mode)' : `${latestDb.users[chatId].points} Points`;

    const successTemplate = `
✅ *TEMP MAIL SERVER DEPLOYED SUCCESS*
───────────────────────
Alamat email sementara nyata berhasil dikonfigurasi dan aktif:

• *Temporary Email:* \`${realGeneratedEmail}\`

*NODE METADATA LOG*
• Mail Core: \`SECMAIL INTERFACE\`
• Session Fee: ${isAdmin ? '0 Points (Bypass)' : '5 Points Deducted'}
• Current Balance: *${currentPoints}*
• Inbox Status: \`Listening / Listening for OTP\`

_Salin alamat email di atas, gunakan untuk mendaftar aplikasi, lalu ketik perintah /CheckInbox untuk melihat kode verifikasi yang masuk._
───────────────────────
`;
    await bot.editMessageText(successTemplate, { chat_id: chatId, message_id: liveMsg.message_id, parse_mode: 'Markdown' }).catch(() => {
      bot.sendMessage(chatId, successTemplate, { parse_mode: 'Markdown' });
    });

  } catch (err) {
    console.error('Error internal alur API email:', err.message);
    bot.sendMessage(chatId, `❌ Gagal memproses request pembuatan email ke server pusat. Silakan coba lagi.`, { parse_mode: 'Markdown' });
  }
});

// -------------------------------------------------------------
// DIAGNOSTIC & ADMIN COMMANDS (TETAP DIJAGA)
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
• Active Mail Session: \`${user.activeEmail || 'None Active'}\`
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
  _(Akses tanpa batas pembuatan domain Premium tanpa potong saldo poin)_

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

bot.onText(/\/isi (\d+) (\d+)/i, (msg, match) => {
  const chatId = String(msg.chat.id).trim();
  if (chatId !== OWNER_ID) return;

  const target = match[1].trim();
  const amt = parseInt(match[2]);

  const db = readDB();
  if (!db.users[target]) db.users[target] = { name: 'User Node', points: 20, premiumUntil: null, activeEmail: null };
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
  if (!db.users[target]) db.users[target] = { name: 'User Node', points: 20, premiumUntil: null, activeEmail: null };
  db.users[target].premiumUntil = exp.toISOString();
  writeDB(db);

  bot.sendMessage(chatId, `🟢 \`[CONSOLE SUCCESS]\` E-Premium tier initialized.\n• Target: \`${target}\`\n• Expiration Date: *${exp.toLocaleDateString('id-ID')}*`, { parse_mode: 'Markdown' });
  bot.sendMessage(target, `
👑 *SISTEM VERIFIKASI: LISENSI E-PREMIUM DIAKTIFKAN*
───────────────────────
Portal administrasi pusat telah memperbarui hak izin jaringan akun Anda.

• Active Period: *14 Days / 2 Weeks*
• Dedicated Domain Routing: \`Secmail.net\` & \`Directmail.top\` (ENABLED)
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
