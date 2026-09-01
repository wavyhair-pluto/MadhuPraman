import React, { useState } from 'react';
import ProcessorDashboard from './screens/ProcessorDashboard';
import AuditorConsole from './screens/AuditorConsole';
import ConsumerViewer from './screens/ConsumerViewer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleType, setRoleType] = useState('processor');
  const [error, setError] = useState('');
  const [showConsumer, setShowConsumer] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: email, type: roleType, password })
      });
      const data = await res.json();
      if (data.token) { setToken(data.token); setUser(data.user); }
      else setError(data.error || 'Login failed');
    } catch { setError('Network error'); }
  };

  // Consumer viewer (no login)
  if (showConsumer) {
    return <ConsumerViewer onBack={() => setShowConsumer(false)} />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy via-blue-800 to-teal flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-honey/20 rounded-2xl flex items-center justify-center mx-auto mb-3"><span className="text-3xl">🔒</span></div>
            <h1 className="text-2xl font-bold text-navy">TrueSource Console</h1>
            <p className="text-sm text-slate-500 mt-1">Zero-Trust Authentication Gateway</p>
          </div>

          <div className="flex mb-4 gap-2">
            {['processor', 'auditor'].map(r => (
              <button key={r} className={`flex-1 p-2.5 rounded-xl text-sm font-semibold transition ${roleType === r ? 'bg-navy text-white shadow' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`} onClick={() => setRoleType(r)}>
                {r === 'processor' ? '🏭 Processor' : '🔍 Auditor'}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border-2 border-slate-200 focus:border-navy p-3 rounded-xl outline-none transition" required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border-2 border-slate-200 focus:border-navy p-3 rounded-xl outline-none transition" required />
            {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
            <button className="w-full bg-navy text-white p-3.5 rounded-xl font-semibold shadow-lg hover:bg-blue-900 transition">Login to Gateway</button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-200">
            <button onClick={() => setShowConsumer(true)} className="w-full text-sm text-teal font-medium hover:underline">Consumer? View Batch Provenance →</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-navy text-white p-4 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-lg font-bold">TrueSource {user.role === 'processor' ? '🏭 Processor' : '🔍 Auditor'}</h1>
          <p className="text-xs text-blue-200">{user.name} • {user.id}</p>
        </div>
        <button onClick={() => { setUser(null); setToken(''); }} className="text-xs bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20">Logout</button>
      </header>
      <main className="p-6 max-w-6xl mx-auto">
        {user.role === 'processor' ? <ProcessorDashboard token={token} /> : <AuditorConsole token={token} />}
      </main>
    </div>
  );
}
