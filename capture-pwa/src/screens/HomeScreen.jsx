import React from 'react';

export default function HomeScreen({ user, onCapture, onLogout }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-navy text-white p-4 flex justify-between items-center shadow-lg">
        <div>
          <h1 className="text-lg font-bold">TrueSource</h1>
          <p className="text-xs text-blue-200">{user.name} ({user.id})</p>
        </div>
        <button onClick={onLogout} className="text-xs bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20">Logout</button>
      </header>

      <main className="p-4 max-w-md mx-auto">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-4">
          <h2 className="text-lg font-bold text-navy mb-1">Welcome, {user.name}</h2>
          <p className="text-sm text-slate-500">Madhukranti ID: {user.id}</p>
        </div>

        <button
          onClick={onCapture}
          className="w-full bg-gradient-to-r from-honey to-amber-500 text-white p-5 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition flex items-center justify-center gap-3"
        >
          <span className="text-2xl">📡</span>
          Log New Harvest
        </button>

        <div className="mt-6 bg-white p-4 rounded-xl border border-slate-100">
          <h3 className="font-semibold text-sm text-slate-500 uppercase tracking-wider mb-3">System Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Network</span><span className={`font-medium ${navigator.onLine ? 'text-green-600' : 'text-amber-600'}`}>{navigator.onLine ? '● Online' : '● Offline'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Auth</span><span className="text-green-600 font-medium">● WebAuthn Active</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Ledger</span><span className="text-green-600 font-medium">● Fabric Connected</span></div>
          </div>
        </div>
      </main>
    </div>
  );
}
