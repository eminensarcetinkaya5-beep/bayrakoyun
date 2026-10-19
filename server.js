const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// TİKTOK YAYINCI KULLANICI ADI (BAŞINDA @ OLMADAN)
const TIKTOK_USERNAME = "akanaz"; 

const flags = [
    { name: "TÜRKİYE", code: "tr" }, { name: "ALMANYA", code: "de" }, { name: "FRANSA", code: "fr" },
    { name: "İTALYA", code: "it" }, { name: "İSPANYA", code: "es" }, { name: "İNGİLTERE", code: "gb" },
    { name: "JAPONYA", code: "jp" }, { name: "GÜNEY KORE", code: "kr" }, { name: "ÇİN", code: "cn" },
    { name: "BREZİLYA", code: "br" }, { name: "ARJANTİN", code: "ar" }, { name: "MEXİKA", code: "mx" },
    { name: "KANADA", code: "ca" }, { name: "AMERİKA", code: "us" }, { name: "RUSYA", code: "ru" },
    { name: "MISIR", code: "eg" }, { name: "HİNDİSTAN", code: "in" }, { name: "SİNGAPUR", code: "sg" }
];

let currentIndex = 0;
let timeLeft = 15;
let roundWinners = [];
let roundBoard = {};
let sessionBoard = {};
let revealedIndices = [];

function createMask(name, revealed) {
    return name.split('').map((char, index) => {
        if (char === ' ') return '  ';
        if (revealed.includes(index)) return char;
        return '?';
    }).join(' ');
}

function getCurrentFlag() {
    return {
        ...flags[currentIndex],
        image: `https://flagcdn.com/w320/${flags[currentIndex].code}.png`
    };
}

setInterval(() => {
    if (timeLeft > 0) {
        timeLeft--;
    } else {
        currentIndex = Math.floor(Math.random() * flags.length);
        timeLeft = 15;
        roundWinners = [];
        roundBoard = {};
        revealedIndices = [];
    }

    io.emit('gameState', {
        currentFlag: getCurrentFlag(),
        answerMask: createMask(flags[currentIndex].name, revealedIndices),
        timeLeft: timeLeft,
        flagIndex: currentIndex + 1,
        roundWinners: roundWinners,
        roundBoard: Object.values(roundBoard).sort((a,b) => b.score - a.score),
        sessionBoard: Object.values(sessionBoard).sort((a,b) => b.score - a.score)
    });
}, 1000);

// SOKET DİNLENİYOR
io.on('connection', (socket) => {
    socket.on('useHint', (data) => {
        const name = flags[currentIndex].name;
        for (let i = 0; i < data.count; i++) {
            let unrevealed = [];
            for (let j = 0; j < name.length; j++) {
                if (name[j] !== ' ' && !revealedIndices.includes(j)) {
                    unrevealed.push(j);
                }
            }
            if (unrevealed.length > 0) {
                const randIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
                revealedIndices.push(randIndex);
            }
        }
    });

    socket.on('simulateChat', () => {
        const fakeUser = {
            userId: "user_" + Math.floor(Math.random() * 1000),
            nickname: "Oyuncu_" + Math.floor(Math.random() * 99),
            avatar: "https://via.placeholder.com/38"
        };
        
        if (!roundWinners.find(w => w.userId === fakeUser.userId)) {
            roundWinners.push(fakeUser);
            const pts = roundWinners.length === 1 ? 6 : 1;
            roundBoard[fakeUser.userId] = { nickname: fakeUser.nickname, score: (roundBoard[fakeUser.userId]?.score || 0) + pts };
            sessionBoard[fakeUser.userId] = { nickname: fakeUser.nickname, score: (sessionBoard[fakeUser.userId]?.score || 0) + pts };
        }
    });
});

// TİKTOK LIVE CONNECTION
let tiktokLiveConnection = new WebcastPushConnection(TIKTOK_USERNAME);

tiktokLiveConnection.connect().then(state => {
    console.log(`TikTok Bağlandı! Room ID: ${state.roomId}`);
}).catch(err => {
    console.log('TikTok Bağlantı Hatası (Yayın Kapalı Olabilir):', err);
});

tiktokLiveConnection.on('chat', data => {
    const msg = data.comment.trim().toUpperCase();
    const userId = data.uniqueId;
    const nickname = data.nickname;
    const avatar = data.profilePictureUrl;

    if (msg === flags[currentIndex].name) {
        if (!roundWinners.find(w => w.userId === userId)) {
            roundWinners.push({ userId, nickname, avatar });
            const pts = roundWinners.length === 1 ? 6 : 1;
            roundBoard[userId] = { nickname, score: (roundBoard[userId]?.score || 0) + pts };
            sessionBoard[userId] = { nickname, score: (sessionBoard[userId]?.score || 0) + pts };
        }
    }
});

server.listen(3000, () => {
    console.log('Sunucu 3000 portunda çalışıyor!');
});
          
