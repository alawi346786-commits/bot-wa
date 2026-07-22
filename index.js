// MEMANGGIL SEMUA MODUL YANG DIBUTUHKAN
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js'); // INI WAJIB ADA
const qrcodeTerminal = require('qrcode-terminal'); // Untuk login bot
const QRCode = require('qrcode'); // Untuk fitur pembuat QR Code
const { createCanvas } = require('canvas');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ==========================================
// INISIALISASI WHATSAPP CLIENT (STANDAR RAILWAY)
// ==========================================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    qrcodeTerminal.generate(qr, { small: true });
    console.log('\n=> Silakan SCAN QR Code di atas menggunakan WA kamu!\n');
});

client.on('ready', () => {
    console.log('✅ Bot sudah siap dan online!');
});

client.on('message', async msg => {
    console.log(`📩 Pesan dari [${msg.from.replace('@c.us', '')}]: ${msg.body}`);

    const textMessage = msg.body || ''; 
    const command = textMessage.split(' ')[0].toLowerCase();
    const args = textMessage.slice(command.length).trim();

    // ==========================================
    // 1. FITUR MENU (TAMPILAN BARU LEBIH SIMPEL)
    // ==========================================
    if (command === '/menu' || command === '/help') {
        const menuText = `*🤖 MENU BOT ALWI 🤖*

*🎨 GAMBAR & STIKER*
*/ss* ➭ Foto jadi stiker (balas foto)
*/s [teks]* ➭ Teks jadi stiker
*/qr [teks/link]* ➭ Buat gambar QR Code

*📥 DOWNLOADER*
*/tt [link]* ➭ Video TikTok
*/ig [link]* ➭ Video Instagram
*/yt [link]* ➭ Video YouTube

*📚 BAHASA & KAMUS*
*/kbbi [kata]* ➭ Cari arti kata
*/t [kode] [teks]* ➭ Terjemah (cth: /t id-en Hai)
*/tts [kode] [teks]* ➭ Suara MP3 (cth: /tts id Halo)

*⚙️ LAINNYA*
*/kirim [nomor] [pesan]* ➭ Chat ke nomor lain
*/ping* ➭ Cek status bot`;
        
        msg.reply(menuText);
    }
    
    else if (command === '/ping') {
        msg.reply('Pong! Bot sedang aktif 🟢');
    }

    // ==========================================
    // 2. FITUR BUAT QR CODE (LOKAL)
    // ==========================================
    else if (command === '/qr' || command === '/qrcode') {
        if (!args) {
            msg.reply('❌ Masukkan teks atau link!\nContoh: */qr https://google.com*');
            return;
        }

        msg.reply('⏳ Sedang membuat QR Code...');

        try {
            // Membuat QR code berukuran 512x512
            const qrDataURL = await QRCode.toDataURL(args, { width: 512, margin: 2 });
            
            // Mengambil data mentah (base64) dari gambar tersebut
            const base64Data = qrDataURL.replace(/^data:image\/png;base64,/, "");
            const media = new MessageMedia('image/png', base64Data, 'qrcode.png');
            
            await client.sendMessage(msg.from, media, { caption: `✅ QR Code berhasil dibuat!` });
        } catch (error) {
            console.error('Error QR:', error);
            msg.reply('❌ Gagal membuat QR Code.');
        }
    }

    // ==========================================
    // 3. FITUR KBBI (KAMUS)
    // ==========================================
    else if (command === '/kbbi') {
        if (!args) return msg.reply('❌ Masukkan kata! Contoh: */kbbi teknologi*');
        msg.reply(`⏳ Mencari arti "${args}"...`);
        try {
            const response = await axios.get(`https://services.x-labs.my.id/kbbi/search?word=${encodeURIComponent(args)}`);
            if (response.data && response.data.status && response.data.data) {
                const item = response.data.data;
                let replyMessage = `📖 *KBBI: ${item.lema}*\n\n`;
                if (item.arti && item.arti.length > 0) {
                    item.arti.forEach((a, i) => replyMessage += `${i + 1}. ${a}\n`);
                } else {
                    replyMessage += `Arti spesifik tidak ditemukan.`;
                }
                msg.reply(replyMessage);
            } else {
                msg.reply(`❌ "${args}" tidak ditemukan di KBBI.`);
            }
        } catch (error) {
            msg.reply('❌ Gagal terhubung ke KBBI.');
        }
    }

    // ==========================================
    // 4. FITUR TRANSLATE
    // ==========================================
    else if (command === '/t' || command === '/translate') {
        const firstSpace = args.indexOf(' ');
        if (firstSpace === -1) return msg.reply('❌ Format salah! Contoh: */t en Halo*');
        const langParams = args.substring(0, firstSpace).toLowerCase();
        const textToTranslate = args.substring(firstSpace + 1).trim();
        let sl = 'auto', tl = langParams; 
        if (langParams.includes('-')) {
            const parts = langParams.split('-');
            sl = parts[0]; tl = parts[1];
        }
        if (!textToTranslate) return;
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(textToTranslate)}`;
            const response = await axios.get(url);
            if (response.data && response.data[0]) {
                const translated = response.data[0].map(item => item[0]).join('');
                msg.reply(`*🌐 Terjemahan (${tl}):*\n${translated}`);
            } else msg.reply('❌ Gagal menerjemahkan.');
        } catch (error) {
            msg.reply('❌ Terjadi kesalahan sistem.');
        }
    }

    // ==========================================
    // 5. FITUR TEXT TO SPEECH (MP3)
    // ==========================================
    else if (command === '/tts') {
        const firstSpace = args.indexOf(' ');
        if (firstSpace === -1) return msg.reply('❌ Format salah! Contoh: */tts id Halo*');
        const lang = args.substring(0, firstSpace).toLowerCase(); 
        const textToSpeech = args.substring(firstSpace + 1).trim();
        if (!textToSpeech) return;
        msg.reply('⏳ Memproses suara...');
        try {
            const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToSpeech)}&tl=${lang}&client=tw-ob`;
            const response = await axios.get(ttsUrl, { responseType: 'arraybuffer' });
            const base64 = Buffer.from(response.data, 'binary').toString('base64');
            const media = new MessageMedia('audio/mp3', base64, 'suara.mp3');
            await client.sendMessage(msg.from, media);
        } catch (error) {
            msg.reply('❌ Gagal menghasilkan suara.');
        }
    }

    // ==========================================
    // 6. FITUR KIRIM PESAN
    // ==========================================
    else if (command === '/kirim') {
        const firstSpace = args.indexOf(' ');
        if (firstSpace === -1) return msg.reply('❌ Format salah! Contoh: */kirim 0812... Halo*');
        let rawNumber = args.substring(0, firstSpace).replace(/[^0-9]/g, '');
        const messageText = args.substring(firstSpace + 1).trim();
        if (rawNumber.startsWith('0')) rawNumber = '62' + rawNumber.substring(1);
        if (!rawNumber || !messageText) return;
        try {
            await client.sendMessage(`${rawNumber}@c.us`, messageText);
            msg.reply(`✅ Sukses mengirim pesan ke ${rawNumber}`);
        } catch (error) {
            msg.reply('❌ Gagal mengirim pesan.');
        }
    }

    // ==========================================
    // 7. FITUR FOTO KE STIKER (/ss)
    // ==========================================
    else if (command === '/ss') {
        let media = null;
        try {
            if (msg.hasMedia) {
                msg.reply('⏳ Memproses stiker...');
                media = await msg.downloadMedia();
            } else if (msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                if (quotedMsg.hasMedia) {
                    msg.reply('⏳ Memproses stiker...');
                    media = await quotedMsg.downloadMedia();
                }
            }
            if (media) {
                await client.sendMessage(msg.from, media, { sendMediaAsSticker: true, stickerName: 'Stiker', stickerAuthor: 'Bot Alwi' });
            } else {
                msg.reply('📸 Mana fotonya? Balas foto dengan */ss*');
            }
        } catch (error) {
            msg.reply('❌ Gagal membuat stiker.');
        }
    }

    // ==========================================
    // 8. FITUR TEKS KE STIKER (/s)
    // ==========================================
    else if (command === '/s') {
        if (!args) return msg.reply('❌ Teksnya kosong!');
        try {
            const canvas = createCanvas(512, 512);
            const ctx = canvas.getContext('2d');
            
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 512, 512);
            
            // PENGATURAN BARU SESUAI PERMINTAAN
            ctx.font = 'bold 90px Arial';
            ctx.fillStyle = 'black';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';

            const paragraphs = args.split('\n');
            const lines = [];
            const maxWidth = 490; // Disesuaikan karena font membesar
            const lineHeight = 100; // Sesuai permintaan
            const startX = 10;      // Sesuai permintaan
            let startY = 10;        // Sesuai permintaan

            for (let p = 0; p < paragraphs.length; p++) {
                const words = paragraphs[p].split(' ');
                let line = '';
                for (let i = 0; i < words.length; i++) {
                    const testLine = line + words[i] + ' ';
                    const metrics = ctx.measureText(testLine);
                    if (metrics.width > maxWidth && i > 0) {
                        lines.push(line);
                        line = words[i] + ' ';
                    } else {
                        line = testLine;
                    }
                }
                lines.push(line);
            }

            for (let i = 0; i < lines.length; i++) {
                ctx.fillText(lines[i].trim(), startX, startY + (i * lineHeight));
            }

            const buffer = canvas.toBuffer('image/png');
            const media = new MessageMedia('image/png', buffer.toString('base64'), 'stiker.png');
            await client.sendMessage(msg.from, media, { sendMediaAsSticker: true, stickerName: 'Stiker Teks', stickerAuthor: 'Bot Alwi' });
        } catch (error) {
            msg.reply('❌ Gagal memproses stiker teks.');
        }
    }

    // ==========================================
    // 9. FITUR DOWNLOADER (Tiktok, IG, YT)
    // ==========================================
    else if (command === '/tt' || command === '/tiktok') {
        if (!args) return msg.reply('Mana link TikToknya?');
        msg.reply('⏳ Mengunduh...');
        try {
            const res = await axios.post('https://www.tikwm.com/api/', { url: args });
            if (res.data.code === 0) {
                const media = await MessageMedia.fromUrl(res.data.data.play, { unsafeMime: true });
                await client.sendMessage(msg.from, media, { caption: '🎥 Video TikTok' });
            } else msg.reply('❌ Gagal.');
        } catch (e) { msg.reply('❌ Error.'); }
    }
    
    else if (command === '/ig' || command === '/instagram') {
        if (!args) return msg.reply('Mana link IG-nya?');
        msg.reply('⏳ Mengunduh...');
        try {
            const res = await axios.get(`https://aemt.me/download/igdl?url=${args}`);
            if (res.data && res.data.status) {
                const media = await MessageMedia.fromUrl(res.data.result[0].url, { unsafeMime: true });
                await client.sendMessage(msg.from, media, { caption: '🎥 Video Instagram' });
            } else msg.reply('❌ Gagal.');
        } catch (e) { msg.reply('❌ Error.'); }
    }
    
    else if (command === '/yt' || command === '/youtube') {
        if (!args) return msg.reply('Mana link YouTube-nya?');
        msg.reply('⏳ Mengunduh...');
        try {
            const res = await axios.get(`https://aemt.me/youtube?url=${args}`);
            if (res.data && res.data.status) {
                const media = await MessageMedia.fromUrl(res.data.result.mp4, { unsafeMime: true });
                await client.sendMessage(msg.from, media, { caption: '🎥 Video YouTube' });
            } else msg.reply('❌ Gagal.');
        } catch (e) { msg.reply('❌ Error.'); }
    }
});

client.initialize();