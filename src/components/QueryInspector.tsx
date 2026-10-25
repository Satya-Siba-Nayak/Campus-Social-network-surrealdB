import React from 'react';
import { Terminal, Trash2, Clock, Database } from 'lucide-react';
import { QueryLogEntry, clearQueryLogs } from '../lib/db';

interface QueryInspectorProps {
  logs: QueryLogEntry[];
  engineMode: 'indxdb' | 'mem';
}

export const QueryInspector: React.FC<QueryInspectorProps> = ({ logs, engineMode }) => {
  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-fuchsia-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Live SurrealQL WASM Log
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
            {engineMode === 'indxdb' ? 'indxdb://campus-social' : 'mem://'}
          </span>
        </div>
        {logs.length > 0 && (
          <button
            onClick={() => clearQueryLogs()}
            className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
            title="Clear query log"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
        {logs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <Database className="w-5 h-5 text-slate-600" />
            Interact with students, posts, or follows to watch live SurrealQL execute in WebAssembly.
          </div>
        ) : (
          logs.map((entry) => (
            <div key={entry.id} className="p-3 hover:bg-slate-950/40 transition-colors">
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 mb-1">
                <span className="font-medium text-slate-300 truncate">
                  {entry.description}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-emerald-400 shrink-0">
                  <Clock className="w-3 h-3" />
                  {entry.durationMs}ms
                </span>
              </div>
              <pre className="text-[11px] font-mono text-fuchsia-300 bg-slate-950/90 px-2.5 py-2 rounded-lg border border-slate-800/90 overflow-x-auto whitespace-pre-wrap">
                {entry.surql}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
