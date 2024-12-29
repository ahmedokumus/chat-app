const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// CORS ayarları
app.use(cors({
  origin: '*', // Tüm originlere izin ver
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Bağlı kullanıcıları ve sohbet odalarını takip etmek için
const connectedClients = new Map();
const chatRooms = new Map();
const apiKeys = new Map(); // API anahtarlarını ve oda anahtarlarını eşleştirmek için
const roomMembers = new Map(); // Oda üyelerinin IP adreslerini takip etmek için

// Benzersiz oda anahtarı oluştur
function generateRoomKey() {
    return crypto.randomBytes(4).toString('hex');
}

// API ile yeni oda oluşturma endpoint'i
app.post('/api/create-room', (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API anahtarı gerekli' });
    }

    // Yeni oda anahtarı oluştur
    const roomKey = generateRoomKey();
    
    // Odayı oluştur
    chatRooms.set(roomKey, {
      creator: apiKey,
      members: new Set(),
      messages: []
    });

    // API anahtarını oda anahtarı ile eşleştir
    apiKeys.set(apiKey, roomKey);

    res.status(201).json({ 
      success: true, 
      roomKey,
      message: 'Sohbet odası başarıyla oluşturuldu' 
    });
  } catch (error) {
    console.error('Oda oluşturma hatası:', error);
    res.status(500).json({ error: 'Oda oluşturulurken bir hata oluştu' });
  }
});

// API anahtarı ile oda kontrolü endpoint'i
app.post('/api/verify-key', (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API anahtarı gerekli' });
    }

    // API anahtarına ait oda var mı kontrol et
    const roomKey = apiKeys.get(apiKey);
    const room = roomKey ? chatRooms.get(roomKey) : null;

    if (!room) {
      return res.status(404).json({ 
        success: false,
        message: 'Bu API anahtarına ait oda bulunamadı' 
      });
    }

    res.status(200).json({ 
      success: true,
      roomKey,
      message: 'Oda bulundu'
    });
  } catch (error) {
    console.error('API anahtarı doğrulama hatası:', error);
    res.status(500).json({ error: 'API anahtarı doğrulanırken bir hata oluştu' });
  }
});

// Aktif oda sayısını getir
app.get('/api/room-count', (req, res) => {
  try {
    const activeRoomCount = chatRooms.size;
    
    res.status(200).json({ 
      success: true,
      count: activeRoomCount,
      message: 'Aktif oda sayısı başarıyla alındı'
    });
  } catch (error) {
    console.error('Oda sayısı alma hatası:', error);
    res.status(500).json({ error: 'Oda sayısı alınırken bir hata oluştu' });
  }
});

// Odadaki kullanıcıların IP adreslerini getir
app.get('/api/room-members/:roomKey', (req, res) => {
  try {
    const { roomKey } = req.params;
    const room = chatRooms.get(roomKey);
    
    if (!room) {
      return res.status(404).json({ 
        success: false,
        message: 'Oda bulunamadı'
      });
    }

    const members = roomMembers.get(roomKey) || [];
    
    res.status(200).json({
      success: true,
      members,
      message: 'Oda üyeleri başarıyla alındı'
    });
  } catch (error) {
    console.error('Oda üyeleri alma hatası:', error);
    res.status(500).json({ error: 'Oda üyeleri alınırken bir hata oluştu' });
  }
});

// WebSocket bağlantı yönetimi
wss.on('connection', (ws, req) => {
    console.log('Yeni bir kullanıcı bağlandı');
    
    // Kullanıcının IP adresini al
    const ip = req.socket.remoteAddress;
    
    // Her kullanıcı için benzersiz bir ID oluştur
    const userId = crypto.randomUUID();
    connectedClients.set(userId, { ws, ip });

    // Mesaj alma
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            // Mesaj türüne göre işlem yap
            switch(data.type) {
                case 'createRoom':
                    // Yeni sohbet odası oluştur
                    const roomKey = generateRoomKey();
                    chatRooms.set(roomKey, {
                        creator: userId,
                        members: new Set([userId]),
                        messages: []
                    });
                    ws.send(JSON.stringify({
                        type: 'roomCreated',
                        roomKey: roomKey
                    }));
                    break;

                case 'joinRoom':
                    // Var olan sohbet odasına katıl
                    const room = chatRooms.get(data.roomKey);
                    if (room) {
                        room.members.add(userId);
                        
                        // IP adresini odaya ekle
                        if (!roomMembers.has(data.roomKey)) {
                            roomMembers.set(data.roomKey, []);
                        }
                        const members = roomMembers.get(data.roomKey);
                        if (!members.some(m => m.ip === ip)) {
                            members.push({ id: userId, ip });
                        }

                        // Yeni katılan kullanıcıya mevcut mesajları ve üyeleri gönder
                        ws.send(JSON.stringify({
                            type: 'roomJoined',
                            roomKey: data.roomKey,
                            messages: room.messages,
                            members: roomMembers.get(data.roomKey) || [],
                            creator: room.creator
                        }));
                        
                        // Odadaki tüm üyelere güncel üye listesini gönder
                        const updatedMembers = roomMembers.get(data.roomKey) || [];
                        room.members.forEach(memberId => {
                            const member = connectedClients.get(memberId);
                            if (member?.ws) {
                                member.ws.send(JSON.stringify({
                                    type: 'memberListUpdate',
                                    members: updatedMembers
                                }));
                            }
                        });
                    } else {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Oda bulunamadı'
                        }));
                    }
                    break;

                case 'chat':
                    // Sohbet odasına mesaj gönder
                    const chatRoom = chatRooms.get(data.roomKey);
                    if (chatRoom && chatRoom.members.has(userId)) {
                        const messageData = {
                            type: 'chat',
                            id: crypto.randomUUID(),
                            from: userId,
                            message: data.message,
                            timestamp: new Date().toISOString(),
                            roomKey: data.roomKey
                        };
                        
                        chatRoom.messages.push(messageData);
                        
                        // Odadaki tüm üyelere mesajı ilet
                        chatRoom.members.forEach(memberId => {
                            const member = connectedClients.get(memberId);
                            if (member?.ws) {
                                member.ws.send(JSON.stringify(messageData));
                            }
                        });
                    }
                    break;
                    
                case 'kickUser':
                    const kickRoom = chatRooms.get(data.roomKey);
                    // Odayı oluşturan kişi mi kontrol et
                    if (kickRoom && kickRoom.creator === data.apiKey) {
                        const targetUserId = data.targetUserId;
                        
                        // Kullanıcıyı odadan çıkar
                        kickRoom.members.delete(targetUserId);
                        
                        // Üye listesinden kullanıcıyı kaldır
                        const roomMembersList = roomMembers.get(data.roomKey);
                        if (roomMembersList) {
                            const updatedMembers = roomMembersList.filter(m => m.id !== targetUserId);
                            roomMembers.set(data.roomKey, updatedMembers);
                            
                            // Odadaki tüm üyelere güncel listeyi gönder
                            kickRoom.members.forEach(memberId => {
                                const member = connectedClients.get(memberId);
                                if (member?.ws) {
                                    member.ws.send(JSON.stringify({
                                        type: 'memberListUpdate',
                                        members: updatedMembers
                                    }));
                                }
                            });
                        }
                        
                        // Çıkarılan kullanıcıya bildirim gönder
                        const kickedUser = connectedClients.get(targetUserId);
                        if (kickedUser?.ws) {
                            kickedUser.ws.send(JSON.stringify({
                                type: 'kicked',
                                message: 'Odadan çıkarıldınız'
                            }));
                        }
                    }
                    break;

                case 'publicKey':
                    // Kullanıcının public key'ini sakla
                    connectedClients.set(userId + '_publicKey', data.publicKey);
                    break;

                case 'leaveRoom':
                    // Odadan ayrıl
                    const leavingRoom = chatRooms.get(data.roomKey);
                    if (leavingRoom) {
                        leavingRoom.members.delete(userId);
                        
                        // Üye listesinden kullanıcıyı kaldır
                        const members = roomMembers.get(data.roomKey);
                        if (members) {
                            const updatedMembers = members.filter(m => m.id !== userId);
                            roomMembers.set(data.roomKey, updatedMembers);
                            
                            // Odadaki diğer üyelere güncel listeyi gönder
                            leavingRoom.members.forEach(memberId => {
                                const member = connectedClients.get(memberId);
                                if (member?.ws) {
                                    member.ws.send(JSON.stringify({
                                        type: 'memberListUpdate',
                                        members: updatedMembers
                                    }));
                                }
                            });
                        }

                        // Odada kimse kalmadıysa odayı sil
                        if (leavingRoom.members.size === 0) {
                            chatRooms.delete(data.roomKey);
                            roomMembers.delete(data.roomKey);
                        }

                        // Ayrılan kullanıcıya bildirim gönder
                        ws.send(JSON.stringify({
                            type: 'leftRoom',
                            message: 'Odadan ayrıldınız'
                        }));
                    }
                    break;
            }
        } catch (error) {
            console.error('Mesaj işleme hatası:', error);
        }
    });

    // Bağlantı koptuğunda
    ws.on('close', () => {
        console.log('Kullanıcı bağlantısı koptu:', userId);
        
        // Kullanıcının bulunduğu tüm odalardan çıkış yap
        chatRooms.forEach((room, roomKey) => {
            if (room.members.has(userId)) {
                room.members.delete(userId);
                
                // Üye listesinden kullanıcıyı kaldır
                const members = roomMembers.get(roomKey);
                if (members) {
                    const updatedMembers = members.filter(m => m.id !== userId);
                    roomMembers.set(roomKey, updatedMembers);
                    
                    // Odadaki diğer üyelere güncel listeyi gönder
                    room.members.forEach(memberId => {
                        const member = connectedClients.get(memberId);
                        if (member?.ws) {
                            member.ws.send(JSON.stringify({
                                type: 'memberListUpdate',
                                members: updatedMembers
                            }));
                        }
                    });
                }
                
                // Odada kimse kalmadıysa odayı sil
                if (room.members.size === 0) {
                    chatRooms.delete(roomKey);
                    roomMembers.delete(roomKey);
                }
            }
        });

        connectedClients.delete(userId);
        connectedClients.delete(userId + '_publicKey');
    });

    // Kullanıcıya ID'sini gönder
    ws.send(JSON.stringify({
        type: 'connection',
        userId: userId
    }));
});

// Test endpoint'i
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor`);
}); 