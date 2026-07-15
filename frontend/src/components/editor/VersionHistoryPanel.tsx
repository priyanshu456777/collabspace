'use client';

import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { timeAgo } from '@/lib/utils';
import type { DocumentVersion } from '@/types';

const reasonLabel: Record<DocumentVersion['reason'], string> = {
  autosave: 'Autosave',
  'conflict-merge': 'Conflict merge',
  manual: 'Restored',
};

export function VersionHistoryPanel({
  roomId,
  onRestored,
}: {
  roomId: string;
  onRestored: (content: string) => void;
}) {
  const { showToast } = useToast();
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ versions: DocumentVersion[] }>(`/documents/${roomId}/versions`)
      .then((data) => setVersions(data.versions))
      .finally(() => setLoading(false));
  }, [roomId]);

  async function restore(versionId: string) {
    setRestoringId(versionId);
    try {
      const data = await api.post<{ document: { content: string } }>(
        `/documents/${roomId}/restore/${versionId}`
      );
      onRestored(data.document.content);
      showToast('Document restored to that version.', 'success');
    } catch {
      showToast('Could not restore that version.', 'error');
    } finally {
      setRestoringId(null);
    }
  }

  if (loading) return <p className="px-4 py-6 text-center text-xs text-ink-soft">Loading history…</p>;
  if (versions.length === 0) {
    return <p className="px-4 py-6 text-center text-xs text-ink-soft">No saved versions yet. Keep editing.</p>;
  }

  return (
    <ul className="space-y-2 overflow-y-auto px-4 py-3">
      {versions.map((v) => (
        <li key={v._id} className="rounded-md border border-line p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-ink-soft">rev. {v.revision}</span>
            <span className="rounded bg-brass-soft px-1.5 py-0.5 text-[10px] text-ink">
              {reasonLabel[v.reason]}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-xs text-ink-soft">{v.content || '(empty document)'}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-ink-soft">
              {v.editedBy?.name || 'Unknown'} · {timeAgo(v.createdAt)}
            </span>
            <button
              onClick={() => restore(v._id)}
              disabled={restoringId === v._id}
              className="flex items-center gap-1 text-[11px] font-medium text-teal hover:underline disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" /> Restore
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
