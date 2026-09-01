import React, { useState } from 'react';
import ProcessorDashboard from './screens/ProcessorDashboard';
import AuditorConsole from './screens/AuditorConsole';
import ConsumerViewer from './screens/ConsumerViewer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  
  // Form state
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('processor');
  
  const [error, setError] = useState('');
  const [showConsumer, setShowConsumer] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegistering 
      ? { name, email, password, role } 
      : { id: email, password, type: role }; // Fallback type for mock data

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.token) { setToken(data.token); setUser(data.user); }
      else setError(data.error || 'Authentication failed');
    } catch { setError('Network error. Is the API running?'); }
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
            <h1 className="text-2xl font-bold text-navy">TrueSource</h1>
            <p className="text-sm text-slate-500 mt-1">Zero-Trust Authentication Gateway</p>
          </div>

          <div className="flex mb-4 bg-slate-100 rounded-xl p-1">
            <button className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${!isRegistering ? 'bg-white shadow text-navy' : 'text-slate-500'}`} onClick={() => { setIsRegistering(false); setError(''); }}>Login</button>
            <button className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${isRegistering ? 'bg-white shadow text-navy' : 'text-slate-500'}`} onClick={() => { setIsRegistering(true); setError(''); }}>Register</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegistering && (
              <>
                <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className="w-full border-2 border-slate-200 focus:border-navy p-3 rounded-xl outline-none transition" required />
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full border-2 border-slate-200 focus:border-navy p-3 rounded-xl outline-none transition bg-white" required>
                  <option value="processor">🏭 Processor</option>
                  <option value="auditor">🔍 Auditor</option>
                </select>
              </>
            )}
            
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border-2 border-slate-200 focus:border-navy p-3 rounded-xl outline-none transition" required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border-2 border-slate-200 focus:border-navy p-3 rounded-xl outline-none transition" required />
            
            {!isRegistering && (
               <select value={role} onChange={e => setRole(e.target.value)} className="w-full border-2 border-slate-200 focus:border-navy p-3 rounded-xl outline-none transition bg-white" required>
                  <option value="processor">Login as Processor</option>
                  <option value="auditor">Login as Auditor</option>
                </select>
            )}

            {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
            
            <button className="w-full bg-navy text-white p-3.5 rounded-xl font-semibold shadow-lg hover:bg-blue-900 transition">
              {isRegistering ? 'Create Account' : 'Secure Login'}
            </button>
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
          <p className="text-xs text-blue-200">{user.name} • {user.id || user.email}</p>
        </div>
        <button onClick={() => { setUser(null); setToken(''); }} className="text-xs bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20">Logout</button>
      </header>
      <main className="p-6 max-w-6xl mx-auto">
        {user.role === 'processor' ? <ProcessorDashboard token={token} /> : <AuditorConsole token={token} />}
      </main>
    </div>
  );
}
