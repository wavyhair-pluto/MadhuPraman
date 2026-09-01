import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function ProcessorDashboard({ token }) {
  const [batches, setBatches] = useState([]);
  const [flags, setFlags] = useState([]);
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/processor/available`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setBatches(data.batches || []);
      setFlags(data.flags || []);
    } catch { setStatus({ text: 'Failed to load batches', type: 'error' }); }
    setLoading(false);
  };

  useEffect(() => { fetchBatches(); }, []);

  const toggleBatch = (id) => setSelected(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);

  const poolBatches = async () => {
    if (selected.length < 2) return alert('Select at least 2 batches to pool');
    try {
      const res = await fetch(`${API_URL}/api/processor/pool`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ parentBatchIds: selected })
      });
      const data = await res.json();
      if (data.success) { setStatus({ text: `Pooled into ${data.batchId}`, type: 'success' }); setSelected([]); fetchBatches(); }
      else setStatus({ text: data.error, type: 'error' });
    } catch { setStatus({ text: 'Pool operation failed', type: 'error' }); }
  };

  const bottleBatches = async () => {
    if (selected.length < 1) return alert('Select at least 1 batch to bottle');
    try {
      const res = await fetch(`${API_URL}/api/processor/bottle`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ parentBatchIds: selected, lotSize: 100 })
      });
      const data = await res.json();
      if (data.success) { setStatus({ text: `Bottled as ${data.batchId}`, type: 'success' }); setQrData(data.qrCodeData); setSelected([]); fetchBatches(); }
      else setStatus({ text: data.error, type: 'error' });
    } catch { setStatus({ text: 'Bottle operation failed', type: 'error' }); }
  };

  const getBatchFlags = (batchId) => flags.filter(f => f.batchId === batchId);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-navy">Batch Consolidation</h2>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-semibold mb-4 text-slate-700">Available Batches ({batches.length})</h3>
        {loading ? <p className="text-slate-400 animate-pulse">Loading...</p> : batches.length === 0 ? <p className="text-slate-400">No unconsumed batches available. Beekeepers must submit harvest readings first.</p> : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {batches.map(b => {
              const bFlags = getBatchFlags(b.batchId);
              return (
                <label key={b.batchId} className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition ${selected.includes(b.batchId) ? 'border-navy bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="checkbox" checked={selected.includes(b.batchId)} onChange={() => toggleBatch(b.batchId)} className="w-5 h-5 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-mono text-sm font-medium">{b.batchId}</p>
                    <p className="text-xs text-slate-500">{b.eventType.toUpperCase()} • {b.region || 'N/A'} • {b.yieldKg ? `${b.yieldKg}kg` : ''} • {new Date(b.timestamp).toLocaleDateString()}</p>
                    {bFlags.length > 0 && <div className="mt-2">{bFlags.map((f, i) => <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full mr-1 font-medium">⚠ {f.flagType}</span>)}</div>}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={poolBatches} disabled={selected.length < 2} className="bg-teal text-white px-6 py-3 rounded-xl font-semibold shadow hover:bg-teal-700 transition disabled:opacity-40">Pool Selected ({selected.length})</button>
          <button onClick={bottleBatches} disabled={selected.length < 1} className="bg-navy text-white px-6 py-3 rounded-xl font-semibold shadow hover:bg-blue-900 transition disabled:opacity-40">Bottle & Generate QR ({selected.length})</button>
        </div>
      </div>

      {status && <div className={`p-4 rounded-xl text-sm font-medium ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{status.text}</div>}

      {qrData && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border text-center">
          <h3 className="font-semibold mb-4 text-navy">Consumer QR Code</h3>
          <img src={qrData} alt="QR Code" className="w-48 h-48 mx-auto mb-3 border-4 border-navy/10 rounded-xl" />
          <p className="text-xs text-slate-500">Scan to view the provenance timeline</p>
        </div>
      )}
    </div>
  );
}
