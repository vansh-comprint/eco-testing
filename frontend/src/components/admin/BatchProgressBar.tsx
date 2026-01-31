import type { BatchProgressStats } from '@/types/batch';

const SEGMENTS: { key: keyof BatchProgressStats; label: string; color: string; bgClass: string }[] = [
  { key: 'pending_assignment', label: 'Unassigned', color: '#94a3b8', bgClass: 'bg-slate-400' },
  { key: 'assigned', label: 'Assigned', color: '#60a5fa', bgClass: 'bg-blue-400' },
  { key: 'in_review', label: 'In Review', color: '#fbbf24', bgClass: 'bg-amber-400' },
  { key: 'verified', label: 'Verified', color: '#34d399', bgClass: 'bg-emerald-400' },
  { key: 'in_pickup', label: 'In Pickup', color: '#2dd4bf', bgClass: 'bg-teal-400' },
  { key: 'picked_up', label: 'Picked Up', color: '#a78bfa', bgClass: 'bg-violet-400' },
  { key: 'completed', label: 'Completed', color: '#10b981', bgClass: 'bg-green-500' },
  { key: 'rejected', label: 'Rejected', color: '#f87171', bgClass: 'bg-red-400' },
];

interface BatchProgressBarProps {
  progress: BatchProgressStats;
  compact?: boolean;
}

export function BatchProgressBar({ progress, compact = false }: BatchProgressBarProps) {
  const total = progress.total;
  if (total === 0) {
    return (
      <div className="font-mono text-[10px] text-slate-400 dark:text-zinc-600 uppercase tracking-widest">
        No assets
      </div>
    );
  }

  // Build non-zero segments for display
  const activeSegments = SEGMENTS.filter(s => progress[s.key] > 0);

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      {/* Progress Bar */}
      <div className={`w-full flex overflow-hidden ${compact ? 'h-1.5' : 'h-2'}`}>
        {activeSegments.map(seg => {
          const pct = (progress[seg.key] / total) * 100;
          return (
            <div
              key={seg.key}
              className={`${seg.bgClass} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${seg.label}: ${progress[seg.key]}`}
            />
          );
        })}
      </div>

      {/* Summary Text */}
      {!compact && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {activeSegments.map(seg => (
            <span key={seg.key} className="font-mono text-[10px] text-slate-500 dark:text-zinc-500 flex items-center gap-1">
              <span className={`w-2 h-2 inline-block ${seg.bgClass}`} />
              {progress[seg.key]}/{total} {seg.label.toLowerCase()}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default BatchProgressBar;
