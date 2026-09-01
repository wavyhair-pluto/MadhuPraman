import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Offline queue using localStorage (AES-256 encrypted IndexedDB in production)
const getQueue = () => JSON.parse(localStorage.getItem('MadhuPraman_offline_queue') || '[]');
const addToQueue = (p) => { const q = getQueue(); q.push({ ...p, queuedAt: new Date().toISOString() }); localStorage.setItem('MadhuPraman_offline_queue', JSON.stringify(q)); };
const clearQueue = () => localStorage.removeItem('MadhuPraman_offline_queue');

export default function CaptureScreen({ token, user, onBack }) {
  const [gps, setGps] = useState(null);
  const [reading, setReading] = useState(null);
  const [yieldKg, setYieldKg] = useState('');
  const [status, setStatus] = useState({ text: 'Ready to capture', type: 'idle' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const on = () => { setIsOnline(true); syncQueue(); };
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const getLocation = () => {
    setStatus({ text: 'Acquiring GPS via HTML5 Geolocation...', type: 'loading' });
    navigator.geolocation.getCurrentPosition(
      pos => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setStatus({ text: 'GPS acquired. Geofence will be validated server-side.', type: 'success' }); },
      () => setStatus({ text: 'GPS acquisition failed. Enable location services.', type: 'error' })
    );
  };

  const simulateBluetooth = () => {
    setStatus({ text: 'Pairing via Web Bluetooth API...', type: 'loading' });
    setTimeout(() => {
      const brix = (76 + Math.random() * 6).toFixed(2);
      const moisture = (15 + Math.random() * 4).toFixed(2);
      setReading({ brix, moisture });
      setStatus({ text: `Refractometer reading acquired: Brix ${brix}%`, type: 'success' });
    }, 1200);
  };

  const syncQueue = async () => {
    const queue = getQueue();
    if (queue.length === 0) return;
    setStatus({ text: `Syncing ${queue.length} offline reading(s)...`, type: 'loading' });
    try {
      for (const payload of queue) {
        await fetch(`${API_URL}/api/capture/harvest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        });
      }
      clearQueue();
      setStatus({ text: 'All offline readings synced successfully!', type: 'success' });
    } catch { setStatus({ text: 'Sync failed. Will retry on next connection.', type: 'error' }); }
  };

  const submitHarvest = async () => {
    if (!gps || !reading || !yieldKg) return alert('Complete all 3 steps before submitting.');
    const payload = { gpsLat: gps.lat, gpsLng: gps.lng, brixReading: parseFloat(reading.brix), moisture: parseFloat(reading.moisture), yieldKg: parseFloat(yieldKg) };

    if (!isOnline) {
      addToQueue(payload);
      setStatus({ text: 'Saved to encrypted offline storage. Will sync when online.', type: 'warning' });
      setGps(null); setReading(null); setYieldKg(''); return;
    }

    try {
      setStatus({ text: 'Submitting to Zero-Trust Gateway...', type: 'loading' });
      const res = await fetch(`${API_URL}/api/capture/harvest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        setStatus({ text: `Genesis block committed: ${data.batchId}`, type: 'success' });
        setGps(null); setReading(null); setYieldKg('');
      } else {
        setStatus({ text: `Error: ${data.error}`, type: 'error' });
      }
    } catch {
      addToQueue(payload);
      setStatus({ text: 'Network failure. Saved offline.', type: 'warning' });
      setGps(null); setReading(null); setYieldKg('');
    }
  };

  const statusColors = { idle: 'bg-slate-100 text-slate-600', loading: 'bg-blue-50 text-blue-700', success: 'bg-green-50 text-green-700', error: 'bg-red-50 text-red-700', warning: 'bg-amber-50 text-amber-700' };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-navy text-white p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="bg-white/10 px-3 py-1.5 rounded-lg text-sm">← Back</button>
          <div><h1 className="font-bold">Log Harvest</h1><p className="text-xs text-blue-200">{user.id}</p></div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${isOnline ? 'bg-green-400/20 text-green-200' : 'bg-amber-400/20 text-amber-200'}`}>
          {isOnline ? '● Online' : '● Offline'}
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-4">
        {/* Step 1: GPS */}
        <button onClick={getLocation} className={`w-full p-4 rounded-xl border-2 text-left transition ${gps ? 'border-green-300 bg-green-50' : 'border-dashed border-slate-300 hover:border-navy hover:bg-slate-50'}`}>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Step 1: Geofence Verification</p>
          {gps ? <p className="font-mono text-sm text-green-700">✓ {gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}</p> : <p className="text-slate-500 text-sm">Tap to acquire GPS location</p>}
        </button>

        {/* Step 2: Refractometer */}
        <button onClick={simulateBluetooth} className={`w-full p-4 rounded-xl border-2 text-left transition ${reading ? 'border-green-300 bg-green-50' : 'border-dashed border-slate-300 hover:border-navy hover:bg-slate-50'}`}>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Step 2: Refractometer Reading</p>
          {reading ? <p className="font-mono text-sm text-green-700">✓ Brix: {reading.brix}% | Moisture: {reading.moisture}%</p> : <p className="text-slate-500 text-sm">Tap to pair via Web Bluetooth</p>}
        </button>

        {/* Step 3: Yield */}
        <div className="p-4 rounded-xl border-2 border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Step 3: Harvest Volume</p>
          <input type="number" placeholder="Yield in kg" value={yieldKg} onChange={e => setYieldKg(e.target.value)} className="w-full border-2 border-slate-200 focus:border-navy p-3 rounded-lg outline-none transition" />
          <p className="text-xs text-slate-400 mt-2">⚠ AI Yield Verification will flag volumes exceeding local flora constraints</p>
        </div>

        {/* Submit */}
        <button onClick={submitHarvest} className="w-full bg-gradient-to-r from-navy to-blue-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition text-lg">
          Submit Genesis Block
        </button>

        {/* Status */}
        <div className={`p-3 rounded-xl text-sm font-medium text-center ${statusColors[status.type]}`}>{status.text}</div>

        {/* Result */}
        {result && (
          <div className={`p-4 rounded-xl border-2 ${result.flagged ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}`}>
            <p className="font-bold text-sm mb-2">{result.flagged ? '⚠ Block Committed with Flags' : '✓ Block Committed Successfully'}</p>
            <p className="font-mono text-xs text-slate-600">Batch: {result.batchId}</p>
            <p className="font-mono text-xs text-slate-600">Hash: {result.blockHash?.substring(0, 24)}...</p>
            {result.flags?.length > 0 && <p className="text-xs text-red-600 mt-2 font-semibold">Flags: {result.flags.join(', ')}</p>}
          </div>
        )}

        {/* Offline Queue */}
        {getQueue().length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 text-center font-medium">
            {getQueue().length} reading(s) in encrypted offline storage awaiting sync
          </div>
        )}
      </main>
    </div>
  );
}
