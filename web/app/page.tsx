'use client';

import { useState, useEffect } from 'react';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// Sunucu URL'ini tek bir yerden yönet
const API_URL = 'https://chat-app-ec04.onrender.com';

export default function KeyPage() {
  const [key, setKey] = useState('');
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
    
    // Her 5 saniyede bir oda sayısını güncelle
    const interval = setInterval(fetchRoomCount, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const generateKey = async () => {
    const newKey = 'key_' + Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15);
    
    try {
      // Backend'e istek gönder
      const response = await fetch(`${API_URL}/api/create-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: newKey })
      });

      if (!response.ok) {
        throw new Error('Oda oluşturulamadı');
      }

      await navigator.clipboard.writeText(newKey);
      toast.success(
        <div>
          <p>Giriş anahtarı oluşturuldu ve panoya kopyalandı!</p>
          <p className="mt-2 font-mono text-sm opacity-80">{newKey}</p>
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
      toast.error('Giriş anahtarı oluşturulamadı!', {
        style: {
          background: isDark ? '#374151' : '#fff',
          color: isDark ? '#fff' : '#000',
        },
      });
    }
  };

  return (
    <div className={`h-screen ${isDark ? 'dark bg-gray-900' : 'bg-white'} transition-colors duration-200`}>
      <Toaster position="top-right" />
      
      {/* Aktif Oda Sayısı Banner - En üstte */}
      <div className={`w-full py-2.5 px-4 ${
        isDark ? 'bg-gray-800 text-gray-300' : 'bg-blue-50 text-blue-600'
      } shadow-md`}>
        <div className="container mx-auto flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              isDark ? 'bg-green-400' : 'bg-green-500'
            }`}></div>
            <p className="text-sm font-medium">
              Şu anda <span className="font-bold">{roomCount}</span> aktif sohbet odası bulunuyor
            </p>
          </div>
        </div>
      </div>

      {/* Tema Butonu - Sağda */}
      <button
        onClick={toggleTheme}
        className={`fixed top-1.5 right-2 p-1.5 rounded-lg flex items-center justify-center transition-colors ${
          isDark 
            ? 'bg-white hover:bg-gray-100 text-gray-800' 
            : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
        }`}
        aria-label="Tema değiştir"
      >
        {isDark ? (
          <div className="flex items-center space-x-1.5">
            <SunIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Açık Tema</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5">
            <MoonIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Koyu Tema</span>
          </div>
        )}
      </button>

      <div className="h-[calc(100vh-40px)] flex flex-col items-center justify-center p-4">
        <div className={`w-full max-w-md p-8 rounded-2xl shadow-2xl backdrop-blur-sm ${
          isDark 
            ? 'bg-gray-800/50 border border-gray-700' 
            : 'bg-white/80 border border-gray-200'
        } transition-all duration-300 hover:shadow-3xl`}>
          <h1 className={`text-3xl font-semibold mb-8 ${isDark ? 'text-white' : 'text-gray-900'} text-center`}>
            Chat Odasına Giriş
          </h1>
          
          <div className="space-y-6">
            <div>
              <label className={`text-sm mb-3 block ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <span className='flex items-center justify-center font-medium'>Giriş Anahtarı</span>
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className={`w-full p-4 border rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200
                  ${isDark 
                    ? 'bg-gray-900/50 border-gray-600 text-white placeholder-gray-500' 
                    : 'bg-white/90 border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                placeholder="Giriş anahtarınızı girin"
              />
            </div>

            <button
              onClick={async () => {
                if (!key.trim()) {
                  toast.error('Lütfen giriş anahtarı girin', {
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
                    body: JSON.stringify({ apiKey: key.trim() })
                  });

                  const data = await response.json();

                  if (response.ok && data.success) {
                    // Giriş anahtarı ve oda anahtarını localStorage'a kaydet
                    localStorage.setItem('apiKey', key.trim());
                    localStorage.setItem('roomKey', data.roomKey);
                    router.push(`/chat?key=${encodeURIComponent(key.trim())}`);
                  } else {
                    toast.error(data.message || 'Geçersiz giriş anahtarı', {
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
              className="w-full p-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-all duration-200 hover:shadow-lg"
            >
              Giriş Yap
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}></div>
              </div>
              <div className="relative flex justify-center">
                <span className={`px-4 text-sm font-medium ${
                  isDark 
                    ? 'bg-gray-800 text-gray-400' 
                    : 'bg-white text-gray-500'
                }`}>
                  veya
                </span>
              </div>
            </div>

            <button
              onClick={generateKey}
              className={`w-full p-4 border-2 rounded-xl font-medium transition-all duration-200 hover:shadow-lg
                ${isDark 
                  ? 'border-gray-700 text-gray-300 hover:bg-gray-700/50' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
            >
              Yeni Giriş Anahtarı Oluştur
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 