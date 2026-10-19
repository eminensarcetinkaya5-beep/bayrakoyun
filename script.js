// SES SENTEZLEYİCİ VE SOKET BAĞLANTISI
const socket = io('http://localhost:3000');
let soundEnabled = true;

// Web Audio API ile Anlık Efekt Üretici (MP3 Dosyasına İhtiyaç Duymaz)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration) {
    if (!soundEnabled) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

function playWinSound() {
    playTone(523.25, 'triangle', 0.2);
    setTimeout(() => playTone(659.25, 'triangle', 0.2), 150);
    setTimeout(() => playTone(783.99, 'triangle', 0.4), 300);
}

function playTickSound() {
    playTone(800, 'sine', 0.05);
}

function speakText(text) {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'tr-TR';
    utterance.rate = 1.1;
    window.speechSynthesis.speak(utterance);
}

let lastTimer = 15;

// CANLI OYUN DURUMU GÜNCELLEMESİ
socket.on('gameState', (data) => {
    document.getElementById('flagImg').src = data.currentFlag.image;
    document.getElementById('answerMask').innerText = data.answerMask;
    document.getElementById('timer').innerText = data.timeLeft;
    document.getElementById('flagIndex').innerText = data.flagIndex;

    // Timer Tık Sesleri
    if (data.timeLeft !== lastTimer) {
        if (data.timeLeft <= 5 && data.timeLeft > 0) {
            playTickSound();
        }
        lastTimer = data.timeLeft;
    }

    // Doğru Bilenler
    const winnersEl = document.getElementById('winnersList');
    const currentWinnersCount = winnersEl.children.length;

    if (data.roundWinners.length > currentWinnersCount) {
        playWinSound();
        const latestWinner = data.roundWinners[data.roundWinners.length - 1];
        speakText(`Tebrikler ${latestWinner.nickname}`);
    }

    winnersEl.innerHTML = '';
    data.roundWinners.forEach(w => {
        winnersEl.innerHTML += `
            <div class="winner-user">
                <img class="winner-avatar" src="${w.avatar || 'https://via.placeholder.com/38'}">
                <span class="winner-name">${w.nickname}</span>
            </div>`;
    });

    document.getElementById('winnerHeader').innerHTML = `<i class="fa-solid fa-trophy"></i> DOĞRU BİLENLER (${data.roundWinners.length})`;

    updateBoard('roundBoard', data.roundBoard);
    updateBoard('sessionBoard', data.sessionBoard);
});

function updateBoard(elementId, list) {
    const el = document.getElementById(elementId);
    el.innerHTML = '';
    list.slice(0, 5).forEach((item, index) => {
        el.innerHTML += `
            <div class="rank-row">
                <div class="user-info">
                    <span class="badge">#${index + 1}</span>
                    <span class="username">${item.nickname}</span>
                </div>
                <span class="score">${item.score}p</span>
            </div>`;
    });
}

// PANEL KONTROLLERİ
function toggleStreamMode() {
    document.body.classList.toggle('stream-mode');
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    document.getElementById('soundIcon').className = soundEnabled ? "fa-solid fa-volume-high" : "fa-solid fa-volume-xmark";
}

function useGiftHint(count) {
    socket.emit('useHint', { count });
}

function simulateRandomChat() {
    socket.emit('simulateChat');
}

// Klavye Kısayolu (S tuşu ile yayın modu)
document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 's') {
        toggleStreamMode();
    }
});
