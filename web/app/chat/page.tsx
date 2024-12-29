'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRouter, useSearchParams } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';

interface Message {
  id: number;
  text: string;
  timestamp: Date;
  isSent: boolean;
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const checkAccess = async () => {
      const urlApiKey = searchParams.get('key');
      
      if (!urlApiKey) {
        toast.error('Geçersiz erişim');
        router.push('/');
        return;
      }

      try {
        const response = await fetch('http://localhost:3001/api/verify-key', {
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
        setIsLoading(false);
      } catch (error) {
        console.error('Doğrulama hatası:', error);
        toast.error('Bağlantı hatası');
        router.push('/');
      }
    };

    checkAccess();
  }, [router, searchParams]);

  const handleSend = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: messages.length + 1,
        text: newMessage,
        timestamp: new Date(),
        isSent: true
      };
      setMessages([...messages, message]);
      setNewMessage("");
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
        <h1 className="text-2xl font-bold text-gray-800">Sohbet Odası</h1>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isSent ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  message.isSent
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-800'
                } shadow-md`}
              >
                <p className="mb-1">{message.text}</p>
                <p className={`text-xs ${
                  message.isSent ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {format(message.timestamp, 'dd MMMM yyyy HH:mm', { locale: tr })}
                </p>
              </div>
            </div>
          ))}
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