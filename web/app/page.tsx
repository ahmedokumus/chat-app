'use client';

import { useState, useEffect } from 'react';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// API URL'ini tek bir yerden yönet
const API_URL = 'https://chat-app-ec04.onrender.com';

export default function KeyPage() {
  const [apiKey, setApiKey] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [roomCount, setRoomCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const fetchRoomCount = async () => {
      try {
        const response = await fetch(`${API_URL}/api/room-count`);
        const data = await response.json();
        
        if (response.ok && data.success) {
          setRoomCount(data.count);
        }
      } catch {
        console.error('Oda sayısı alınamadı');
      }
    };

    fetchRoomCount();
    
    // Her 10 saniyede bir oda sayısını güncelle
    const interval = setInterval(fetchRoomCount, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const generateKey = async () => {
    const key = 'key_' + Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);
    
    try {
      // Backend'e istek gönder
      const response = await fetch(`${API_URL}/api/create-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: key })
      });

      if (!response.ok) {
        throw new Error('Oda oluşturulamadı');
      }

      await navigator.clipboard.writeText(key);
      toast.success(
        <div>
          <p>API anahtarı oluşturuldu ve panoya kopyalandı!</p>
          <p className="mt-2 font-mono text-sm opacity-80">{key}</p>
        </div>,
        {
          duration: 5000,
          style: {
            background: isDark ? '#374151' : '#fff',
            color: isDark ? '#fff' : '#000',
            maxWidth: '400px',
          },
        }
      );
    } catch {
      toast.error('API anahtarı oluşturulamadı!', {
        style: {
          background: isDark ? '#374151' : '#fff',
          color: isDark ? '#fff' : '#000',
        },
      });
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-gray-900' : 'bg-white'} transition-colors duration-200`}>
      <Toaster position="top-right" />
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Tema değiştir"
      >
        {isDark ? (
          <SunIcon className="h-6 w-6 text-yellow-400" />
        ) : (
          <MoonIcon className="h-6 w-6 text-gray-600" />
        )}
      </button>

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className={`text-center mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            <p className="text-sm">Aktif Sohbet Odası: <span className="font-semibold">{roomCount}</span></p>
          </div>
          
          <h1 className={`text-2xl font-medium mb-6 ${isDark ? 'text-white' : 'text-gray-900'} text-center`}>
            Chat Odasına Giriş
          </h1>
          
          <div className="space-y-6">
            <div>
              <label className={`text-sm mb-2 block ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <span className='flex items-center justify-center'>API Anahatarı</span>
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className={`w-full p-3 border rounded-md font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500
                  ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                placeholder="API anahtarınızı girin"
              />
            </div>

            <button
              onClick={async () => {
                if (!apiKey.trim()) {
                  toast.error('Lütfen API anahtarı girin', {
                    style: {
                      background: isDark ? '#374151' : '#fff',
                      color: isDark ? '#fff' : '#000',
                    },
                  });
                  return;
                }

                try {
                  const response = await fetch(`${API_URL}/api/verify-key`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ apiKey: apiKey.trim() })
                  });

                  const data = await response.json();

                  if (response.ok && data.success) {
                    // API anahtarı ve oda anahtarını localStorage'a kaydet
                    localStorage.setItem('apiKey', apiKey.trim());
                    localStorage.setItem('roomKey', data.roomKey);
                    router.push(`/chat?key=${encodeURIComponent(apiKey.trim())}`);
                  } else {
                    toast.error(data.message || 'Geçersiz API anahtarı', {
                      style: {
                        background: isDark ? '#374151' : '#fff',
                        color: isDark ? '#fff' : '#000',
                      },
                    });
                  }
                } catch {
                  toast.error('Bağlantı hatası oluştu', {
                    style: {
                      background: isDark ? '#374151' : '#fff',
                      color: isDark ? '#fff' : '#000',
                    },
                  });
                }
              }}
              className="w-full p-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Giriş Yap
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}></div>
              </div>
              <div className="relative flex justify-center">
                <span className={`px-2 ${isDark ? 'bg-gray-900 text-gray-400' : 'bg-white text-gray-500'}`}>
                  veya
                </span>
              </div>
            </div>

            <button
              onClick={generateKey}
              className={`w-full p-3 border rounded-md transition-colors
                ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              Yeni API Anahtarı Oluştur
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 