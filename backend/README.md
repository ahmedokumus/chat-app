# Uçtan Uca Şifrelenmiş Sohbet Uygulaması - Backend

Bu proje, Node.js ve WebSocket kullanılarak geliştirilmiş uçtan uca şifrelenmiş bir sohbet uygulamasının backend kısmıdır.

## Kurulum

1. Gerekli bağımlılıkları yükleyin:
```bash
npm install
```

2. `.env` dosyasını düzenleyin:
- `PORT`: Sunucunun çalışacağı port (varsayılan: 3001)
- `JWT_SECRET`: JWT token'ları için gizli anahtar

3. Sunucuyu başlatın:
```bash
# Geliştirme modu için
npm run dev

# Prodüksiyon modu için
npm start
```

## WebSocket Mesaj Formatları

### Bağlantı Mesajı
```json
{
    "type": "connection",
    "userId": "generated-uuid"
}
```

### Sohbet Odası Oluşturma
```json
{
    "type": "createRoom"
}
```

### Sohbet Odasına Katılma
```json
{
    "type": "joinRoom",
    "roomKey": "oda-anahtarı"
}
```

### Sohbet Mesajı
```json
{
    "type": "chat",
    "roomKey": "oda-anahtarı",
    "message": "şifrelenmiş-mesaj"
}
```

### Odadan Ayrılma
```json
{
    "type": "leaveRoom",
    "roomKey": "oda-anahtarı"
}
```

### Public Key Paylaşımı
```json
{
    "type": "publicKey",
    "publicKey": "kullanıcının-public-keyi"
}
```

## Sunucu Yanıt Formatları

### Oda Oluşturuldu
```json
{
    "type": "roomCreated",
    "roomKey": "oda-anahtarı"
}
```

### Odaya Katılım Başarılı
```json
{
    "type": "roomJoined",
    "roomKey": "oda-anahtarı",
    "messages": []
}
```

### Kullanıcı Odaya Katıldı Bildirimi
```json
{
    "type": "userJoined",
    "userId": "kullanıcı-id",
    "roomKey": "oda-anahtarı"
}
```

### Kullanıcı Odadan Ayrıldı Bildirimi
```json
{
    "type": "userLeft",
    "userId": "kullanıcı-id",
    "roomKey": "oda-anahtarı"
} 