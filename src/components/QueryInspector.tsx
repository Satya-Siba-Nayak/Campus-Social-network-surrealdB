import React from 'react';
import { QueryLogEntry, clearQueryLogs } from '../lib/db';

interface QueryInspectorProps {
  logs: QueryLogEntry[];
  engineMode: 'indxdb' | 'mem';
}

export const QueryInspector: React.FC<QueryInspectorProps> = ({ logs, engineMode }) => {
  return (
    <div className="rounded-[24px] bg-[#121215] border border-white/[0.06] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <h3 className="text-[13px] font-semibold text-white">
            SurrealQL Engine
          </h3>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-zinc-400">
            {engineMode === 'indxdb' ? 'indxdb://campus-social' : 'mem://'}
          </span>
        </div>
        {logs.length > 0 && (
          <button
            onClick={() => clearQueryLogs()}
            className="text-xs text-zinc-500 hover:text-white transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
        {logs.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500">
            No queries logged yet.
          </div>
        ) : (
          logs.map((entry) => (
            <div key={entry.id} className="px-5 py-3.5 hover:bg-white/[0.01] transition-colors">
              <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 mb-1.5">
                <span className="font-medium text-zinc-300 truncate">
                  {entry.description}
                </span>
                <span className="font-mono text-[11px] text-zinc-500 shrink-0">
                  {entry.durationMs}ms
                </span>
              </div>
              <pre className="text-[11px] font-mono text-zinc-400 bg-black/50 px-3 py-2 rounded-xl border border-white/[0.04] overflow-x-auto whitespace-pre-wrap">
                {entry.surql}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
