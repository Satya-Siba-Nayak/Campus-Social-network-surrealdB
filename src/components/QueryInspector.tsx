import React from 'react';
import { QueryLogEntry, clearQueryLogs } from '../lib/db';

interface QueryInspectorProps {
  logs: QueryLogEntry[];
  engineMode: 'indxdb' | 'mem';
}

function getBadgeStyle(op: QueryLogEntry['operationType']): string {
  switch (op) {
    case 'CREATE':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'READ':
      return 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30';
    case 'UPDATE':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'DELETE':
      return 'bg-red-500/15 text-red-300 border-red-500/30';
    case 'RELATE':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    case 'GRAPH':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    default:
      return 'bg-white/10 text-white border-white/20';
  }
}

export const QueryInspector: React.FC<QueryInspectorProps> = ({ logs, engineMode }) => {
  return (
    <div className="rounded-[24px] bg-[#121215] border border-white/[0.07] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <h3 className="text-[13px] font-semibold text-white">
            Live SurrealQL &amp; Function Execution Log
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

      <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
        {logs.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500">
            Perform any CRUD or Graph action to see the executed function &amp; SurrealQL statement.
          </div>
        ) : (
          logs.map((entry) => (
            <div key={entry.id} className="px-5 py-3.5 hover:bg-white/[0.01] transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getBadgeStyle(
                      entry.operationType
                    )}`}
                  >
                    {entry.operationType}
                  </span>
                  <code className="font-mono text-xs text-white font-semibold truncate">
                    {entry.fnName}
                  </code>
                  <span className="text-zinc-500 hidden sm:inline">·</span>
                  <span className="text-zinc-400 truncate hidden sm:inline">
                    {entry.description}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-zinc-500 shrink-0">
                  {entry.durationMs}ms
                </span>
              </div>
              <pre className="text-[11px] font-mono text-zinc-300 bg-black/60 px-3 py-2 rounded-xl border border-white/[0.05] overflow-x-auto whitespace-pre-wrap">
                {entry.surql}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
