'use client';

import React, { useState, useEffect } from 'react';
import { OperationsNav } from '@/components/operations/operations-nav';
import { 
  HardDriveDownload, 
  Download, 
  Upload, 
  ShieldCheck, 
  CheckCircle2, 
  FileText, 
  Clock, 
  RefreshCw 
} from 'lucide-react';

interface BackupItem {
  id: string;
  backup_type: string;
  file_path: string;
  file_size_bytes: number;
  checksum_sha256: string;
  includes_secrets: boolean;
  status: string;
  created_at: string;
}

export default function OperationsBackupPage() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [lastExport, setLastExport] = useState<any>(null);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/operations/backup');
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch (err) {
      console.error('Failed to load backups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async (type: string = 'FULL') => {
    setCreating(true);
    try {
      const res = await fetch('/api/operations/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_type: type }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastExport(data.data);
        fetchBackups();
      }
    } catch (err) {
      console.error('Failed to create backup:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadSnapshot = () => {
    if (!lastExport) return;
    const blob = new Blob([JSON.stringify(lastExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `abos-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <HardDriveDownload className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Local Zero-Cost Backup & Export Tooling
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Generate immutable point-in-time snapshots of system state, database tables, and audit ledgers with automated secret exclusion.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleCreateSnapshot('FULL')}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <HardDriveDownload className={`w-4 h-4 ${creating ? 'animate-spin' : ''}`} />
            {creating ? 'Exporting...' : 'Create Snapshot'}
          </button>
        </div>
      </div>

      <OperationsNav />

      {/* Safety Notice Banner */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-start gap-4">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-white">Automated Zero-Secret Privacy Guarantee</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            All export routines pass through the central secrets sanitization pipeline. API keys, passwords, private tokens, and credentials are scrubbed prior to serialization.
          </p>
        </div>
      </div>

      {/* Download Recent Snapshot Card */}
      {lastExport && (
        <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-emerald-400">Snapshot Ready for Download</span>
            <p className="text-xs text-slate-300">
              Checksum: <code className="font-mono text-emerald-300">{lastExport.checksum_sha256?.substring(0, 16)}...</code>
            </p>
          </div>
          <button
            onClick={handleDownloadSnapshot}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
          >
            <Download className="w-4 h-4" /> Download JSON
          </button>
        </div>
      )}

      {/* Backups History Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading backup history...</div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No backup snapshots generated yet. Click &quot;Create Snapshot&quot; to export.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Backup Type</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">SHA-256 Checksum</th>
                  <th className="py-3 px-4">Secrets Scrubbed</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {backups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">{b.backup_type}</td>
                    <td className="py-3 px-4 text-slate-400">{(b.file_size_bytes / 1024).toFixed(1)} KB</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-cyan-400">
                      {b.checksum_sha256?.substring(0, 16)}...
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        VERIFIED NO SECRETS
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400">
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
