import React, { useState } from 'react';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import CaptureScreen from './screens/CaptureScreen';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('home'); // 'home' or 'capture'

  const handleLogin = async (id, password, isRegistering, name) => {
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const payload = isRegistering 
        ? { name, email: id, password, role: 'beekeeper' }
        : { id, type: 'beekeeper', password };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setUser(data.user);
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (err) {
      throw err;
    }
  };

  if (!token) {
    return <LoginScreen onAuth={handleLogin} />;
  }

  if (screen === 'capture') {
    return <CaptureScreen token={token} user={user} onBack={() => setScreen('home')} />;
  }

  return <HomeScreen user={user} onCapture={() => setScreen('capture')} onLogout={() => { setToken(null); setUser(null); }} />;
}
