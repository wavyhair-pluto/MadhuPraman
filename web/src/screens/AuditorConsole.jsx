import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function AuditorConsole({ token }) {
  const [searchId, setSearchId] = useState('');
  const [traceData, setTraceData] = useState(null);
  const [allFlags, setAllFlags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('trace'); // 'trace' or 'flags'

  useEffect(() => { fetchFlags(); }, []);

  const fetchFlags = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auditor/flags`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setAllFlags(data.flags || []);
    } catch {}
  };

  const performTrace = async () => {
    if (!searchId.trim()) return;
    setLoading(true); setTraceData(null);
    try {
      const res = await fetch(`${API_URL}/api/auditor/trace/${searchId.trim()}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setTraceData(data);
    } catch { setTraceData({ error: 'Trace failed. Check batch ID.' }); }
    setLoading(false);
  };

  const flagBatch = async (batchId) => {
    try {
      await fetch(`${API_URL}/api/auditor/flag`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ batchId, reason: 'Manually flagged for investigation by auditor' })
      });
      fetchFlags();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <button onClick={() => setTab('trace')} className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${tab === 'trace' ? 'bg-navy text-white shadow' : 'bg-white text-slate-500'}`}>🔍 Trace-Back</button>
        <button onClick={() => setTab('flags')} className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${tab === 'flags' ? 'bg-navy text-white shadow' : 'bg-white text-slate-500'}`}>⚠ Active Flags ({allFlags.length})</button>
      </div>

      {tab === 'trace' && (
        <div>
          <h2 className="text-2xl font-bold text-navy mb-4">Regulatory Trace-Back</h2>
          <div className="flex gap-3 mb-6">
            <input type="text" placeholder="Enter Retail Batch ID (e.g. BATCH-BTL-...)" value={searchId} onChange={e => setSearchId(e.target.value)} className="flex-1 border-2 border-slate-200 focus:border-navy p-3 rounded-xl outline-none transition" />
            <button onClick={performTrace} disabled={loading} className="bg-navy text-white px-6 py-3 rounded-xl font-semibold shadow hover:bg-blue-900 transition disabled:opacity-50">{loading ? 'Tracing...' : 'Trace Provenance'}</button>
          </div>

          {loading && <p className="text-navy animate-pulse font-medium">Querying permissioned Hyperledger Fabric network...</p>}

          {traceData && !traceData.error && (
            <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm p-6">
              <div className="flex justify-between items-start mb-6 border-b pb-4">
                <div><h3 className="text-lg font-bold text-navy">Trace: {traceData.batchId}</h3><p className="text-sm text-slate-500">Depth: {traceData.traceDepth} block(s) in ancestor chain</p></div>
              </div>
              <div className="space-y-4">
                {traceData.ancestors?.map((node, i) => {
                  const hasFlags = node.flags?.length > 0;
                  return (
                    <div key={i} className={`p-4 rounded-xl border-2 ${hasFlags ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${node.eventType === 'harvest' ? 'bg-green-100 text-green-700' : node.eventType === 'pool' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{node.eventType}</span>
                          <p className="font-mono text-sm mt-1">{node.batchId}</p>
                        </div>
                        <button onClick={() => flagBatch(node.batchId)} className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 font-medium">Flag</button>
                      </div>
                      {node.offChain && (
                        <div className="text-xs text-slate-600 space-y-1 mt-2">
                          {node.offChain.actorId && <p><strong>Actor:</strong> {node.offChain.actorId} ({node.offChain.actorRole})</p>}
                          {node.offChain.region && <p><strong>Region:</strong> {node.offChain.region}</p>}
                          {node.offChain.gpsLat && <p><strong>GPS:</strong> {node.offChain.gpsLat.toFixed(4)}, {node.offChain.gpsLng.toFixed(4)}</p>}
                          {node.offChain.brixReading && <p><strong>Brix:</strong> {node.offChain.brixReading}% | <strong>Moisture:</strong> {node.offChain.moisture}%</p>}
                          {node.offChain.yieldKg && <p><strong>Yield:</strong> {node.offChain.yieldKg} kg</p>}
                          <p><strong>Hash:</strong> <span className="font-mono">{node.metadataHash?.substring(0, 24)}...</span></p>
                        </div>
                      )}
                      {hasFlags && (
                        <div className="mt-3 pt-3 border-t border-red-200">
                          <p className="text-xs font-bold text-red-600 mb-1">⚠ FRAUD SIGNALS:</p>
                          {node.flags.map((f, fi) => (
                            <div key={fi} className="text-xs text-red-700 mb-1"><span className="font-mono bg-red-200/50 px-1 rounded">{f.flagType}</span> — {f.reason} <span className="text-red-400">({f.severity})</span></div>
                          ))}
                        </div>
                      )}
                      {node.parentBatchIds?.length > 0 && <p className="text-xs text-slate-400 mt-2">Parents: {node.parentBatchIds.join(', ')}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {traceData?.error && <p className="text-red-600 bg-red-50 p-4 rounded-xl">{traceData.error}</p>}
        </div>
      )}

      {tab === 'flags' && (
        <div>
          <h2 className="text-2xl font-bold text-navy mb-4">Active Anomaly Flags</h2>
          {allFlags.length === 0 ? <p className="text-slate-400">No active flags.</p> : (
            <div className="space-y-3">
              {allFlags.map((f, i) => (
                <div key={i} className="bg-white p-4 rounded-xl border-2 border-red-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{f.flagType}</span>
                      <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full ml-2">{f.severity}</span>
                      <p className="font-mono text-sm mt-2">{f.batchId}</p>
                      <p className="text-xs text-slate-600 mt-1">{f.reason}</p>
                    </div>
                    <button onClick={() => { setSearchId(f.batchId); setTab('trace'); }} className="text-xs bg-navy text-white px-3 py-1.5 rounded-lg">Trace →</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
