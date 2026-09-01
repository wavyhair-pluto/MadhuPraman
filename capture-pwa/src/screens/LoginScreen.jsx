import React, { useState } from 'react';

export default function LoginScreen({ onLogin }) {
  const [beekeeperId, setBeekeeperId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onLogin(beekeeperId, pin);
    } catch (err) {
      setError(err.message || 'Authentication failed. Verify your Madhukranti ID and PIN.');
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Madhukranti ID</label>
            <input
              type="text"
              placeholder="e.g. BK-1001"
              value={beekeeperId}
              onChange={e => setBeekeeperId(e.target.value.toUpperCase())}
              className="w-full border-2 border-slate-200 focus:border-navy p-3 rounded-xl outline-none transition"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">PIN</label>
            <input
              type="password"
              placeholder="4-digit PIN"
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="w-full border-2 border-slate-200 focus:border-navy p-3 rounded-xl outline-none transition"
              maxLength={4}
              required
            />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy text-white p-3.5 rounded-xl font-semibold shadow-lg hover:bg-blue-900 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            {loading ? 'Authenticating...' : 'Login via WebAuthn'}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">Protected by FIDO2 WebAuthn • Zero-Trust</p>
      </div>
    </div>
  );
}
