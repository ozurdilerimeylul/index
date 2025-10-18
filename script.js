// ============================================
// ANALYTICS SYSTEM - LocalStorage Based
// ============================================

console.log('🚀 Analytics System v15 Loaded! (LocalStorage - admin.html kullan)');

// LocalStorage key
const ANALYTICS_KEY = 'site_analytics';

// Analytics veriyi al
function getAnalytics() {
    const data = localStorage.getItem(ANALYTICS_KEY);
    return data ? JSON.parse(data) : { sessions: [] };
}

// Analytics veriyi kaydet
function saveAnalytics(data) {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
}

// Event kaydet
function logEvent(eventType, data) {
    console.log('📊 Event kaydediliyor:', eventType);
    
    const analytics = getAnalytics();
    const event = {
        type: eventType,
        timestamp: new Date().toISOString(),
        turkeyTime: new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
        ...data
    };
    
    // Son oturuma ekle
    if (analytics.sessions.length > 0) {
        const lastSession = analytics.sessions[analytics.sessions.length - 1];
        if (!lastSession.events) lastSession.events = [];
        lastSession.events.push(event);
    }
    
    saveAnalytics(analytics);
    console.log('✅ Event kaydedildi!');
}

// Admin dashboard için ayrı admin.html sayfası kullan

// Oturum ID'si oluştur (her ziyaretçi için unique)
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Cihaz ve tarayıcı bilgilerini topla
function getDeviceInfo() {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    let osName = 'Unknown';
    let deviceType = 'Desktop';
    
    // Tarayıcı tespiti
    if (userAgent.indexOf('Firefox') > -1) browserName = 'Firefox';
    else if (userAgent.indexOf('SamsungBrowser') > -1) browserName = 'Samsung Internet';
    else if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) browserName = 'Opera';
    else if (userAgent.indexOf('Trident') > -1) browserName = 'Internet Explorer';
    else if (userAgent.indexOf('Edge') > -1) browserName = 'Edge';
    else if (userAgent.indexOf('Chrome') > -1) browserName = 'Chrome';
    else if (userAgent.indexOf('Safari') > -1) browserName = 'Safari';
    
    // İşletim sistemi tespiti
    if (userAgent.indexOf('Windows NT 10.0') > -1) osName = 'Windows 10';
    else if (userAgent.indexOf('Windows NT 6.3') > -1) osName = 'Windows 8.1';
    else if (userAgent.indexOf('Windows NT 6.2') > -1) osName = 'Windows 8';
    else if (userAgent.indexOf('Windows NT 6.1') > -1) osName = 'Windows 7';
    else if (userAgent.indexOf('Windows NT 6.0') > -1) osName = 'Windows Vista';
    else if (userAgent.indexOf('Windows NT 5.1') > -1) osName = 'Windows XP';
    else if (userAgent.indexOf('Windows') > -1) osName = 'Windows';
    else if (userAgent.indexOf('Mac') > -1) osName = 'MacOS';
    else if (userAgent.indexOf('X11') > -1) osName = 'UNIX';
    else if (userAgent.indexOf('Linux') > -1) osName = 'Linux';
    else if (userAgent.indexOf('Android') > -1) osName = 'Android';
    else if (userAgent.indexOf('like Mac') > -1) osName = 'iOS';
    
    // Cihaz tipi tespiti
    if (/Mobile|Android|iPhone|iPad|iPod/i.test(userAgent)) {
        deviceType = 'Mobile';
        if (/iPad/i.test(userAgent)) deviceType = 'Tablet';
    }
    
    return {
        browser: browserName,
        os: osName,
        deviceType: deviceType,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        language: navigator.language,
        userAgent: userAgent
    };
}

// Konum bilgisini al (referrer)
function getReferrerInfo() {
    return {
        referrer: document.referrer || 'Direct',
        currentUrl: window.location.href,
        pathname: window.location.pathname
    };
}

// Basit event logger
function sendToWebhook(eventType, data) {
    logEvent(eventType, data);
}

// Oturum başlat
let sessionId = generateSessionId();
let sessionData = {
    sessionId: sessionId,
    deviceInfo: getDeviceInfo(),
    referrerInfo: getReferrerInfo(),
    startTime: new Date().toISOString(),
    events: []
};

// Sayfa yüklendiğinde oturum başlat
window.addEventListener('load', () => {
    // Yeni oturum kaydet
    const analytics = getAnalytics();
    analytics.sessions.push(sessionData);
    saveAnalytics(analytics);
    
    console.log('✅ Yeni oturum başlatıldı:', sessionData.sessionId);
    
    // İlk event
    sendToWebhook('🎉 YENİ ZİYARETÇİ', {
        sessionId: sessionData.sessionId,
        deviceInfo: sessionData.deviceInfo,
        referrerInfo: sessionData.referrerInfo,
        extraInfo: 'Kullanıcı siteye giriş yaptı'
    });
});

// Sayfa kapanma eventi (Mobil uyumlu - çoklu event dinle)
let exitEventSent = false;

function sendExitEvent() {
    if (exitEventSent) return; // Bir kez gönder
    exitEventSent = true;
    
    const timeSpent = Math.round((Date.now() - new Date(sessionData.startTime).getTime()) / 1000);
    const payload = JSON.stringify({
        content: `⏱️ **Oturum Sonu** - ${sessionData.sessionId} - ${timeSpent} saniye geçirdi`,
        embeds: [{
            color: 0x95a5a6,
            fields: [
                {
                    name: '⏱️ Süre',
                    value: `${timeSpent} saniye`,
                    inline: true
                },
                {
                    name: '💻 Cihaz',
                    value: sessionData.deviceInfo.deviceType,
                    inline: true
                }
            ]
        }]
    });
    
    // SendBeacon kullan (mobilde en güvenilir yöntem)
    if (navigator.sendBeacon && WEBHOOK_URL) {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(WEBHOOK_URL, blob);
        console.log('✅ Çıkış eventi gönderildi (SendBeacon)');
    }
}

// Desktop için beforeunload
window.addEventListener('beforeunload', sendExitEvent);

// Mobil için pagehide (iOS Safari'de daha güvenilir)
window.addEventListener('pagehide', sendExitEvent);

// Mobil için visibilitychange (sayfa background'a gittiğinde)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        sendExitEvent();
    }
});

// Frame görünürlük takibi
let viewedFrames = new Set();

// Scroll Animation for Frames
window.addEventListener('scroll', () => {
    // Update progress bar
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercentage = (scrollTop / scrollHeight) * 100;
    document.getElementById('progressBar').style.width = scrollPercentage + '%';

    // Animate frames on scroll
    const frames = document.querySelectorAll('.frame:not(.success-frame)');
    frames.forEach(frame => {
        const frameTop = frame.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        if (frameTop < windowHeight * 0.75) {
            frame.classList.add('visible');
            
            // Frame'in görüldüğünü logla (bir kez)
            const frameId = frame.id;
            if (frameId && !viewedFrames.has(frameId)) {
                viewedFrames.add(frameId);
                
                const frameNames = {
                    'frame0': 'Hikaye Başladı - "Bir zamanlar..."',
                    'frame1': 'Sorun Anlatılıyor - "Ne oldu?"',
                    'frame2': 'Düşünme Süreci - "Düşündü..."',
                    'frame3': 'Çözüm Arayışı - "Elinden geldiğince..."',
                    'frame4': 'Özür Dileme - "Beni affeder misin?"',
                    'finalFrame': 'Final Soru - "Sen de beni seviyor musun?"'
                };
                
                if (frameNames[frameId]) {
                    sendToWebhook('📖 YENİ FRAME GÖRÜNTÜLENDİ', {
                        sessionId: sessionData.sessionId,
                        deviceInfo: sessionData.deviceInfo,
                        referrerInfo: sessionData.referrerInfo,
                        extraInfo: `👀 Kullanıcı "${frameNames[frameId]}" bölümüne ulaştı`
                    });
                }
            }
        }
    });
});

// Initial check for visible frames
document.addEventListener('DOMContentLoaded', () => {
    const frames = document.querySelectorAll('.frame:not(.success-frame)');
    frames.forEach(frame => {
        const frameTop = frame.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        if (frameTop < windowHeight * 0.75) {
            frame.classList.add('visible');
        }
    });
});

// Button Logic
const btnYes = document.getElementById('btnYes');
const btnNo = document.getElementById('btnNo');
const finalFrame = document.getElementById('finalFrame');
const frame5 = document.getElementById('frame5');

// Yes Button - Shows success frame with animation
function handleYesClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // EVET butonuna basıldığını logla
    sendToWebhook('✅ EVET BUTONU BASILDI', {
        sessionId: sessionData.sessionId,
        deviceInfo: sessionData.deviceInfo,
        referrerInfo: sessionData.referrerInfo,
        extraInfo: '🎉 Kullanıcı "EVET" dedi! Özrü kabul etti! 💕'
    });
    
    // Hide final frame
    finalFrame.style.transition = 'opacity 0.5s ease';
    finalFrame.style.opacity = '0';
    
    setTimeout(() => {
        finalFrame.classList.add('hidden');
        frame5.classList.remove('hidden');
        frame5.style.opacity = '0';
        
        // Scroll to the success frame
        frame5.scrollIntoView({ behavior: 'smooth' });
        
        // Fade in the success frame
        setTimeout(() => {
            frame5.classList.add('visible');
            frame5.style.opacity = '1';
            
            // Confetti effect (using emojis)
            createConfetti();
        }, 300);
    }, 500);
}

btnYes.addEventListener('click', handleYesClick);
btnYes.addEventListener('touchstart', handleYesClick, { passive: false });

// No Button - Runs away when clicked
let noClickCount = 0;
const noMessages = [
    "Hayır butonuna mı basmaya çalışıyorsun? 🤔",
    "Ama... Ben çok üzgünüm... 😢",
    "Lütfen bir şans ver... 🥺",
    "Hayır butonu bozuk, evet'e bas! 😊",
    "Kaçmaya devam edeceğim! 😝"
];

// Function to move no button safely
function moveNoButton() {
    noClickCount++;
    
    // HAYIR butonuna tıklamayı logla
    sendToWebhook('❌ HAYIR BUTONUNA TIKLANDI', {
        sessionId: sessionData.sessionId,
        deviceInfo: sessionData.deviceInfo,
        referrerInfo: sessionData.referrerInfo,
        extraInfo: `😢 Kullanıcı "HAYIR" butonuna ${noClickCount}. kez tıkladı (veya üzerine geldi)`
    });
    
    // Get current viewport dimensions
    const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    
    // Get button dimensions (use current or default if not positioned yet)
    const btnWidth = btnNo.offsetWidth || 160;
    const btnHeight = btnNo.offsetHeight || 60;
    
    // Calculate safe boundaries with larger margin
    const margin = 50; // Daha büyük margin
    const minX = margin;
    const maxX = viewportWidth - btnWidth - margin;
    const minY = margin;
    const maxY = viewportHeight - btnHeight - margin;
    
    // Ensure max values are greater than min values
    if (maxX <= minX || maxY <= minY) {
        // If viewport is too small, just center the button somewhere safe
        const randomX = viewportWidth / 2 - btnWidth / 2;
        const randomY = viewportHeight / 2 - btnHeight / 2;
        
        btnNo.style.position = 'fixed';
        btnNo.style.left = randomX + 'px';
        btnNo.style.top = randomY + 'px';
        btnNo.style.zIndex = '1000';
        return;
    }
    
    // Generate random position within safe boundaries
    let randomX = Math.random() * (maxX - minX) + minX;
    let randomY = Math.random() * (maxY - minY) + minY;
    
    // Ensure minimum distance from current position (make it move noticeably)
    const currentRect = btnNo.getBoundingClientRect();
    const minDistance = 80; // Minimum pixels to move
    
    let attempts = 0;
    while (attempts < 15) {
        const distance = Math.sqrt(
            Math.pow(randomX - currentRect.left, 2) + 
            Math.pow(randomY - currentRect.top, 2)
        );
        
        if (distance > minDistance) {
            break;
        }
        
        randomX = Math.random() * (maxX - minX) + minX;
        randomY = Math.random() * (maxY - minY) + minY;
        attempts++;
    }
    
    // Double check and clamp values to ensure they're within bounds
    randomX = Math.max(minX, Math.min(maxX, randomX));
    randomY = Math.max(minY, Math.min(maxY, randomY));
    
    // Make button absolute positioned
    btnNo.style.position = 'fixed';
    btnNo.style.left = randomX + 'px';
    btnNo.style.top = randomY + 'px';
    btnNo.style.zIndex = '1000';
    btnNo.style.transition = 'all 0.3s ease';
    
    // Change button text
    const messageIndex = Math.min(noClickCount - 1, noMessages.length - 1);
    btnNo.textContent = noMessages[messageIndex];
    
    // Shake animation
    btnNo.style.animation = 'shake 0.5s';
    setTimeout(() => {
        btnNo.style.animation = '';
    }, 500);
    
    // After 5 clicks, make it even harder
    if (noClickCount >= 5) {
        btnNo.style.fontSize = '0.8rem';
        btnNo.style.padding = '10px 20px';
    }
    
    // After 10 clicks, make it tiny
    if (noClickCount >= 10) {
        btnNo.style.fontSize = '0.6rem';
        btnNo.style.padding = '8px 15px';
        btnNo.textContent = '🏃💨';
    }
}

// Handle both click and touch events
btnNo.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    moveNoButton();
});

btnNo.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    moveNoButton();
}, { passive: false });

// Hover effect for no button (also runs away) - only on desktop
btnNo.addEventListener('mouseenter', () => {
    // Only activate on desktop (not touch devices)
    if (noClickCount > 2 && window.innerWidth > 768) {
        moveNoButton();
    }
});

// Confetti effect function
function createConfetti() {
    const emojis = ['❤️', '💕', '💖', '💗', '💝', '💘', '💞', '💓', '💌', '🌹'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const emoji = document.createElement('div');
            emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            emoji.style.position = 'fixed';
            emoji.style.left = Math.random() * window.innerWidth + 'px';
            emoji.style.top = '-50px';
            emoji.style.fontSize = (Math.random() * 30 + 20) + 'px';
            emoji.style.zIndex = '9999';
            emoji.style.pointerEvents = 'none';
            emoji.style.transition = 'all 3s ease-in';
            
            document.body.appendChild(emoji);
            
            setTimeout(() => {
                emoji.style.top = window.innerHeight + 'px';
                emoji.style.transform = `rotate(${Math.random() * 360}deg)`;
                emoji.style.opacity = '0';
            }, 100);
            
            setTimeout(() => {
                emoji.remove();
            }, 3100);
        }, i * 50);
    }
}

// Scroll to next section function
function scrollToNext(targetId) {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Black fade effect when transitioning to success frame
function handleYesClickWithFade(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // 🎉 EVET butonuna basıldığını logla
    sendToWebhook('✅ EVET BUTONU BASILDI', {
        sessionId: sessionData.sessionId,
        deviceInfo: sessionData.deviceInfo,
        referrerInfo: sessionData.referrerInfo,
        extraInfo: '🎉 Kullanıcı "EVET" dedi! Özrü kabul etti! 💕'
    });
    
    const blackOverlay = document.getElementById('blackOverlay');
    const backgroundMusic = document.getElementById('backgroundMusic');
    
    // Show black overlay and start music
    blackOverlay.classList.add('active');
    
    // Play music
    backgroundMusic.play().catch(err => {
        console.log('Müzik çalınamadı:', err);
    });
    
    setTimeout(() => {
        // Hide final frame
        finalFrame.classList.add('hidden');
        frame5.classList.remove('hidden');
        frame5.style.opacity = '0';
        
        // Scroll to the success frame
        frame5.scrollIntoView({ behavior: 'auto' });
        
        // Remove black overlay and show success frame (which has black background)
        setTimeout(() => {
            blackOverlay.classList.remove('active');
            frame5.classList.add('visible');
            frame5.style.opacity = '1';
            
            // Confetti effect (using emojis)
            createConfetti();
        }, 300);
    }, 1000);
}

// Override the yes button handler with fade effect
btnYes.removeEventListener('click', handleYesClick);
btnYes.removeEventListener('touchstart', handleYesClick);
btnYes.addEventListener('click', handleYesClickWithFade);
btnYes.addEventListener('touchstart', handleYesClickWithFade, { passive: false });

// Add shake animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
        20%, 40%, 60%, 80% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);

// ============================================
// SOSYAL MEDYA BUTONLARI TRACKING
// ============================================

// Sosyal medya butonlarını dinle (sayfa yüklendikten sonra)
document.addEventListener('DOMContentLoaded', () => {
    // WhatsApp butonunu dinle
    setTimeout(() => {
        const whatsappBtn = document.querySelector('.whatsapp-btn');
        const instagramBtn = document.querySelector('.instagram-btn');
        
        if (whatsappBtn) {
            whatsappBtn.addEventListener('click', () => {
                sendToWebhook('📱 WHATSAPP BUTONU TIKLANDI', {
                    sessionId: sessionData.sessionId,
                    deviceInfo: sessionData.deviceInfo,
                    referrerInfo: sessionData.referrerInfo,
                    extraInfo: '✅ Kullanıcı WhatsApp butonuna tıkladı ve yönlendirildi'
                });
            });
        }
        
        if (instagramBtn) {
            instagramBtn.addEventListener('click', () => {
                sendToWebhook('📸 INSTAGRAM BUTONU TIKLANDI', {
                    sessionId: sessionData.sessionId,
                    deviceInfo: sessionData.deviceInfo,
                    referrerInfo: sessionData.referrerInfo,
                    extraInfo: '✅ Kullanıcı Instagram butonuna tıkladı ve yönlendirildi'
                });
            });
        }
    }, 2000); // Success frame görünür olduktan sonra dinlemeye başla
});

