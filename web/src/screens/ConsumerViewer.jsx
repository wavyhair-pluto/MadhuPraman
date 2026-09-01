import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function ConsumerViewer({ onBack }) {
  const [batchId, setBatchId] = useState('');
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookupBatch = async () => {
    if (!batchId.trim()) return;
    setLoading(true); setError(''); setStory(null);
    try {
      const res = await fetch(`${API_URL}/api/public/batch/${batchId.trim()}`);
      if (!res.ok) throw new Error('Batch not found');
      const data = await res.json();
      setStory(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <header className="p-4 flex justify-between items-center">
        <div className="flex items-center gap-2"><span className="text-2xl">🍯</span><h1 className="text-xl font-bold text-amber-900">TrueSource</h1></div>
        <button onClick={onBack} className="text-sm text-slate-500">← Back to Login</button>
      </header>

      <main className="max-w-md mx-auto p-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-amber-900 mb-2">Verify Your Honey</h2>
          <p className="text-sm text-amber-700">Enter the Batch ID from your jar's QR code</p>
        </div>

        <div className="flex gap-2 mb-6">
          <input type="text" placeholder="e.g. BATCH-BTL-..." value={batchId} onChange={e => setBatchId(e.target.value)} className="flex-1 border-2 border-amber-200 focus:border-amber-500 p-3 rounded-xl outline-none" />
          <button onClick={lookupBatch} disabled={loading} className="bg-amber-500 text-white px-5 py-3 rounded-xl font-semibold shadow">{loading ? '...' : 'Verify'}</button>
        </div>

        {error && <p className="text-red-600 bg-red-50 p-3 rounded-xl text-sm text-center">{error}</p>}

        {story && (
          <div className="bg-white rounded-2xl shadow-lg border border-amber-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-honey p-6 text-white text-center">
              <p className="text-3xl mb-2">✓</p>
              <h3 className="text-xl font-bold">Verified on TrueSource</h3>
              <p className="text-sm opacity-80">Hyperledger Fabric Permissioned Ledger</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Source Regions</span><span className="font-medium">{story.summary?.regions?.join(', ') || 'N/A'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Contributing Beekeepers</span><span className="font-medium">{story.summary?.totalSourceBeekeepers || 0}</span></div>

              <hr />
              <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Provenance Timeline</h4>
              <div className="space-y-3">
                {story.timeline?.map((event, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${event.eventType === 'harvest' ? 'bg-green-500' : event.eventType === 'pool' ? 'bg-blue-500' : 'bg-purple-500'}`}>{i + 1}</div>
                    <div>
                      <p className="text-sm font-medium capitalize">{event.eventType}</p>
                      <p className="text-xs text-slate-500">{event.region && `${event.region} • `}{new Date(event.timestamp).toLocaleDateString()}</p>
                      <p className="text-xs text-slate-400 font-mono">#{event.blockHash?.substring(0, 12)}...</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
