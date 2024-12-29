'use client';

import { useState } from 'react';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import toast, { Toaster } from 'react-hot-toast';

// API URL'ini tek bir yerden yönet
const API_URL = 'https://chat-app-ec04.onrender.com';

export default function KeyPage() {
  const [isDark, setIsDark] = useState(false);

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
          <h1 className={`text-2xl font-medium mb-6 ${isDark ? 'text-white' : 'text-gray-900'} text-center`}>
            API Anahtarı Oluştur
          </h1>
          
          <div className="space-y-6">
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