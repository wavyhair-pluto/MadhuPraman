import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function ConsumerViewer({ onBack, initialBatchId }) {
  const [batchId, setBatchId] = useState(initialBatchId || '');
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const scannerContainerId = 'qr-reader';

  // Auto-lookup if initialBatchId is provided (e.g., from a QR code URL)
  useEffect(() => {
    if (initialBatchId) lookupBatch(initialBatchId);
  }, [initialBatchId]);

  const lookupBatch = async (id) => {
    const lookupId = id || batchId.trim();
    if (!lookupId) return;
    setBatchId(lookupId);
    setLoading(true); setError(''); setStory(null);
    try {
      const res = await fetch(`${API_URL}/api/public/batch/${lookupId}`);
      if (!res.ok) throw new Error('Batch not found on the MadhuPraman ledger. Verify the Batch ID and try again.');
      const data = await res.json();
      setStory(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const startScanner = async () => {
    setScanning(true);
    setError('');
    // Wait for DOM element to render
    setTimeout(async () => {
      try {
        const html5Qrcode = new Html5Qrcode(scannerContainerId);
        scannerRef.current = html5Qrcode;
        await html5Qrcode.start(
          { facingMode: 'environment' }, // Use back camera
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            // Extract batch ID from QR code URL or raw text
            let extractedId = decodedText;
            // If the QR contains a URL like https://MadhuPraman.vercel.app/batch/BATCH-BTL-xxx
            const urlMatch = decodedText.match(/batch\/([A-Z0-9-]+)/i);
            if (urlMatch) extractedId = urlMatch[1];
            // Stop scanner and perform lookup
            html5Qrcode.stop().then(() => {
              scannerRef.current = null;
              setScanning(false);
              lookupBatch(extractedId);
            });
          },
          () => {} // Ignore scan errors (no QR detected yet)
        );
      } catch (err) {
        setError('Camera access denied. Please allow camera permissions or enter the Batch ID manually.');
        setScanning(false);
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current = null;
        setScanning(false);
      });
    } else {
      setScanning(false);
    }
  };

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const eventIcons = { harvest: '🌿', pool: '🔗', bottle: '🍯', dispatch: '🚚' };
  const eventColors = { harvest: 'bg-green-500', pool: 'bg-blue-500', bottle: 'bg-amber-500', dispatch: 'bg-purple-500' };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-100 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍯</span>
          <div>
            <h1 className="text-lg font-bold text-amber-900">MadhuPraman</h1>
            <p className="text-xs text-amber-600">Honey Verification</p>
          </div>
        </div>
        {onBack && <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700">← Back</button>}
      </header>

      <main className="max-w-md mx-auto p-4">
        {/* Hero Section */}
        {!story && !loading && (
          <div className="text-center py-6">
            <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-5xl">🔍</span>
            </div>
            <h2 className="text-2xl font-bold text-amber-900 mb-2">Is Your Honey Real?</h2>
            <p className="text-sm text-amber-700 mb-6">Scan the QR code on your jar to verify its authenticity and trace it back to the beekeeper.</p>

            {/* QR Scanner Button */}
            {!scanning ? (
              <button
                onClick={startScanner}
                className="w-full bg-gradient-to-r from-amber-500 to-honey text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition text-lg mb-4 flex items-center justify-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>
                Scan QR Code
              </button>
            ) : (
              <div className="mb-4">
                <div id={scannerContainerId} className="rounded-2xl overflow-hidden border-4 border-amber-300 mb-3"></div>
                <button onClick={stopScanner} className="text-sm text-red-600 font-medium hover:underline">Cancel Scan</button>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-amber-200"></div>
              <span className="text-xs text-amber-400 font-semibold uppercase">or enter manually</span>
              <div className="flex-1 h-px bg-amber-200"></div>
            </div>

            {/* Manual Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Batch ID"
                value={batchId}
                onChange={e => setBatchId(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && lookupBatch()}
                className="flex-1 border-2 border-amber-200 focus:border-amber-500 p-3 rounded-xl outline-none text-sm font-mono"
              />
              <button
                onClick={() => lookupBatch()}
                disabled={loading || !batchId.trim()}
                className="bg-amber-900 text-white px-5 py-3 rounded-xl font-semibold shadow disabled:opacity-40"
              >
                Verify
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-amber-700 font-medium">Querying MadhuPraman Ledger...</p>
            <p className="text-xs text-amber-500 mt-1">Verifying blockchain provenance</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-4">
            <div className="bg-red-50 border-2 border-red-200 p-4 rounded-2xl text-center">
              <span className="text-3xl block mb-2">❌</span>
              <p className="text-red-700 font-medium text-sm">{error}</p>
            </div>
            <button onClick={() => { setError(''); setStory(null); }} className="w-full mt-4 text-amber-700 font-medium text-sm hover:underline">← Try Another Batch</button>
          </div>
        )}

        {/* Verified Result */}
        {story && (
          <div className="mt-2">
            {/* Verified Badge */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white text-center shadow-lg mb-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-4xl">✓</span>
              </div>
              <h3 className="text-xl font-bold">Verified Authentic</h3>
              <p className="text-sm opacity-80 mt-1">Cryptographically verified on MadhuPraman Hyperledger Fabric</p>
              <p className="font-mono text-xs opacity-60 mt-2">{batchId}</p>
            </div>

            {/* Summary Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
              <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-3">Origin Summary</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Source Regions</span>
                  <span className="font-semibold text-sm text-amber-900">{story.summary?.regions?.length > 0 ? story.summary.regions.join(', ') : 'Pending'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Contributing Beekeepers</span>
                  <span className="font-semibold text-sm text-amber-900">{story.summary?.totalSourceBeekeepers || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">Ledger Network</span>
                  <span className="font-semibold text-sm text-green-600">Hyperledger Fabric ✓</span>
                </div>
              </div>
            </div>

            {/* Provenance Timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
              <h4 className="font-bold text-sm text-slate-400 uppercase tracking-wider mb-4">Provenance Timeline</h4>
              <div className="space-y-0">
                {story.timeline?.map((event, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    {/* Timeline Line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${eventColors[event.eventType] || 'bg-slate-400'} text-white shadow-sm`}>
                        {eventIcons[event.eventType] || '📦'}
                      </div>
                      {i < story.timeline.length - 1 && <div className="w-0.5 h-8 bg-slate-200 my-1"></div>}
                    </div>

                    {/* Event Details */}
                    <div className="pb-6 flex-1">
                      <p className="font-semibold text-sm capitalize text-slate-800">{event.eventType === 'harvest' ? 'Source Harvest' : event.eventType === 'pool' ? 'Batch Pooling' : event.eventType === 'bottle' ? 'Bottled & Sealed' : event.eventType}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{event.region && `${event.region} • `}{new Date(event.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p className="text-xs text-slate-400 font-mono mt-1">Block: #{event.blockHash?.substring(0, 16)}...</p>
                    </div>
                  </div>
                ))}
              </div>

              {(!story.timeline || story.timeline.length === 0) && (
                <p className="text-sm text-slate-400 text-center">No provenance events recorded yet.</p>
              )}
            </div>

            {/* Security Footer */}
            <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
              <p className="text-xs text-slate-400">
                🔒 This verification was performed against an immutable, append-only Hyperledger Fabric ledger. No personal beekeeper information was exposed during this lookup.
              </p>
            </div>

            {/* Scan Another */}
            <button
              onClick={() => { setStory(null); setBatchId(''); setError(''); }}
              className="w-full mt-4 bg-amber-100 text-amber-800 font-semibold py-3 rounded-xl hover:bg-amber-200 transition"
            >
              Scan Another Jar
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
