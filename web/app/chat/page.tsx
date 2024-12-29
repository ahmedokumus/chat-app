'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRouter, useSearchParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { ChevronDownIcon, XCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

// API URL'ini tek bir yerden yönet
const API_URL = 'https://chat-app-ec04.onrender.com';
const WS_URL = API_URL.replace('https://', 'wss://');

// Sayfayı dinamik olarak işaretle
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

interface Message {
  id: string;
  message: string;
  timestamp: string;
  from: string;
  type: string;
}

interface Member {
  id: string;
  ip: string;
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [myUserId, setMyUserId] = useState<string>("");
  const [roomCreator, setRoomCreator] = useState<string>("");
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Bildirim izni iste
  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // Bildirim gönderme fonksiyonu
  const sendNotification = (message: string, from: string) => {
    if (
      "Notification" in window &&
      Notification.permission === "granted" &&
      document.hidden && // Sayfa arka plandaysa
      from !== myUserId // Mesaj benden değilse
    ) {
      new Notification("Yeni Mesaj", {
        body: message,
        icon: "/notification-icon.png" // İsteğe bağlı: bildirim ikonu
      });
    }
  };

  // Mesajlar güncellendiğinde en alta kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Kullanıcı çıkarma fonksiyonu
  const handleKickUser = (userId: string) => {
    const apiKey = localStorage.getItem('apiKey');
    const roomKey = localStorage.getItem('roomKey');
    
    if (wsRef.current?.readyState === WebSocket.OPEN && apiKey && roomKey) {
      wsRef.current.send(JSON.stringify({
        type: 'kickUser',
        targetUserId: userId,
        roomKey,
        apiKey
      }));
    }
  };

  // Odadan çıkış fonksiyonu
  const handleLeaveRoom = () => {
    const roomKey = localStorage.getItem('roomKey');
    
    if (wsRef.current?.readyState === WebSocket.OPEN && roomKey) {
      wsRef.current.send(JSON.stringify({
        type: 'leaveRoom',
        roomKey
      }));
      
      // Önce localStorage'ı temizle
      localStorage.removeItem('apiKey');
      localStorage.removeItem('roomKey');
      
      // WebSocket bağlantısını kapat
      wsRef.current.close();
      
      // Ana sayfaya yönlendir
      router.push('/');
    }
  };

  useEffect(() => {
    const checkAccess = async () => {
      const urlApiKey = searchParams.get('key');
      
      if (!urlApiKey) {
        toast.error('Geçersiz erişim');
        router.push('/');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/verify-key`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ apiKey: urlApiKey })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          toast.error('Geçersiz API anahtarı');
          router.push('/');
          return;
        }

        // API key geçerliyse localStorage'a kaydet
        localStorage.setItem('apiKey', urlApiKey);
        localStorage.setItem('roomKey', data.roomKey);

        // WebSocket bağlantısını başlat
        console.log('WebSocket bağlantısı kuruluyor:', WS_URL);
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket bağlantısı açıldı');
          // Odaya katıl
          ws.send(JSON.stringify({
            type: 'joinRoom',
            roomKey: data.roomKey
          }));
        };

        ws.onerror = (error) => {
          console.error('WebSocket hatası:', error);
          toast.error('Bağlantı hatası oluştu');
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log('WebSocket mesajı alındı:', data);
          
          switch (data.type) {
            case 'connection':
              setMyUserId(data.userId);
              break;

            case 'roomJoined':
              if (Array.isArray(data.messages)) {
                setMessages(data.messages);
              }
              if (Array.isArray(data.members)) {
                setMembers(data.members);
              }
              if (data.creator) {
                setRoomCreator(data.creator);
              }
              break;
            
            case 'chat':
              if (data.isNewMessage) {
                setMessages(prev => [...prev, {
                  id: data.id,
                  message: data.message,
                  timestamp: data.timestamp,
                  from: data.from,
                  type: data.type
                }]);
                // Yeni mesaj geldiğinde bildirim gönder
                sendNotification(data.message, data.from);
              }
              break;
            
            case 'memberListUpdate':
              if (Array.isArray(data.members)) {
                setMembers(data.members);
              }
              break;
            
            case 'kicked':
              localStorage.removeItem('apiKey');
              localStorage.removeItem('roomKey');
              toast.error(data.message);
              router.push('/');
              break;

            case 'leftRoom':
              toast.success(data.message);
              break;
          }
        };

        ws.onclose = () => {
          console.log('WebSocket bağlantısı kapandı');
          toast.error('Bağlantı kesildi, sayfayı yenileyin');
        };

        setIsLoading(false);

        return () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        };
      } catch (error) {
        console.error('Doğrulama hatası:', error);
        toast.error('Bağlantı hatası');
        router.push('/');
      }
    };

    checkAccess();
  }, [router, searchParams]);

  const handleSend = () => {
    if (!newMessage.trim()) {
      return;
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error('Bağlantı hatası! Sayfayı yenileyin.');
      return;
    }

    const roomKey = localStorage.getItem('roomKey');
    if (!roomKey) {
      toast.error('Oda bilgisi bulunamadı! Sayfayı yenileyin.');
      return;
    }

    try {
      // Mesajı WebSocket üzerinden gönder
      wsRef.current.send(JSON.stringify({
        type: 'chat',
        message: newMessage.trim(),
        roomKey
      }));

      // Sadece input'u temizle
      setNewMessage("");
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      toast.error('Mesaj gönderilemedi!');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-gray-600">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Toaster position="top-right" />
      <div className="p-4 bg-white shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLeaveRoom}
              className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition-colors"
              title="Odadan Çık"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>Çıkış</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Sohbet Odası</h1>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-1 px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              <span className="text-sm text-gray-600">Aktif Kullanıcılar ({members?.length || 0})</span>
              <ChevronDownIcon className={`w-4 h-4 text-gray-600 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10">
                <div className="py-2">
                  {members.length > 0 ? (
                    members.map((member) => (
                      <div
                        key={member.id}
                        className="px-4 py-2 hover:bg-gray-100 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-600">{member.ip}</span>
                          {member.id === myUserId && <span className="text-xs text-blue-500 ml-1">(Sen)</span>}
                        </div>
                        {member.id !== myUserId && localStorage.getItem('apiKey') === roomCreator && (
                          <button
                            onClick={() => handleKickUser(member.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Kullanıcıyı çıkar"
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-600">
                      Henüz kimse bağlanmadı
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.from === myUserId ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  message.from === myUserId
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-800'
                } shadow-md`}
              >
                <p className="mb-1">{message.message}</p>
                <p className={`text-xs ${
                  message.from === myUserId ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {format(new Date(message.timestamp), 'dd MMMM yyyy HH:mm', { locale: tr })}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 bg-white border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Mesajınızı yazın..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          <button
            onClick={handleSend}
            className="px-6 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
} 