import React, { useState } from 'react';

export default function LoginScreen({ onAuth }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [id, setId] = useState(''); // Email for register, Madhukranti ID/Email for login
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onAuth(id, password, isRegistering, name);
    } catch (err) {
      setError(err.message || 'Authentication failed. Verify your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-blue-800 to-teal flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-honey/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🍯</span>
          </div>
          <h1 className="text-2xl font-bold text-navy">TrueSource</h1>
          <p className="text-sm text-slate-500 mt-1">Zero-Trust Beekeeper Capture</p>
        </div>

        <div className="flex mb-4 bg-slate-100 rounded-xl p-1">
          <button className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${!isRegistering ? 'bg-white shadow text-navy' : 'text-slate-500'}`} onClick={() => { setIsRegistering(false); setError(''); }}>Login</button>
          <button className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${isRegistering ? 'bg-white shadow text-navy' : 'text-slate-500'}`} onClick={() => { setIsRegistering(true); setError(''); }}>Register</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border-2 border-slate-200 focus:border-navy p-3 rounded-xl outline-none transition"
                required
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              {isRegistering ? 'Email Address' : 'Madhukranti ID or Email'}
            </label>
            <input
              type={isRegistering ? 'email' : 'text'}
              placeholder={isRegistering ? 'name@example.com' : 'e.g. BK-1001'}
              value={id}
              onChange={e => setId(e.target.value)}
              className="w-full border-2 border-slate-200 focus:border-navy p-3 rounded-xl outline-none transition"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              {isRegistering ? 'Password' : 'PIN or Password'}
            </label>
            <input
              type="password"
              placeholder={isRegistering ? 'Create a secure password' : 'Enter PIN / Password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border-2 border-slate-200 focus:border-navy p-3 rounded-xl outline-none transition"
              required
            />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-white p-3.5 rounded-xl font-semibold shadow-lg hover:bg-blue-900 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : isRegistering ? 'Create Beekeeper Account' : 'Login securely'}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">Protected by FIDO2 WebAuthn • Zero-Trust</p>
      </div>
    </div>
  );
}
