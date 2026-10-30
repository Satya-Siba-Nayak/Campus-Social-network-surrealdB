import React, { useState } from 'react';
import {
  Database,
  Play,
  Table2,
  GitBranch,
  Code2,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  Student,
  GraphRelationship,
  WroteEdgeRecord,
  PostNodeRecord,
  executeCustomSurql,
} from '../lib/db';
import { GraphVisualizer } from './GraphVisualizer';

interface DatabaseStudioViewProps {
  students: Student[];
  followEdges: GraphRelationship[];
  wroteEdges: WroteEdgeRecord[];
  postNodes: PostNodeRecord[];
  currentUserId: string;
  followingIds: Set<string>;
  followerIds: Set<string>;
  fofIds: Set<string>;
  onSelectStudent: (studentId: string) => void;
  onDeleteStudent: (student: Student) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onUnfollow: (fromId: string, toId: string) => Promise<void>;
  onRefreshAll: () => Promise<void>;
}

const PRESET_QUERIES = [
  {
    label: '1. Select all students (Table: student)',
    fnName: 'getAllStudents()',
    surql: 'SELECT * FROM student ORDER BY name ASC;',
  },
  {
    label: '2. 1-Hop Outgoing Following (Graph ->)',
    fnName: 'getFollowing("student:aarav")',
    surql: 'SELECT ->follows->student FROM student:aarav;',
  },
  {
    label: '3. 1-Hop Incoming Followers (Graph <-)',
    fnName: 'getFollowers("student:aarav")',
    surql: 'SELECT <-follows<-student FROM student:aarav;',
  },
  {
    label: '4. 2-Hop Friends of Friends (Multi-hop Graph)',
    fnName: 'getFriendsOfFriends("student:aarav")',
    surql: 'SELECT ->follows->follows->student FROM student:aarav;',
  },
  {
    label: '5. Graph Authorship Join (wrote -> post)',
    fnName: 'getAllPosts()',
    surql: 'SELECT id AS edge_id, in AS author_id, in.name AS author_name, out AS post_id, out.text AS text FROM wrote ORDER BY created_at DESC;',
  },
  {
    label: '6. Inspect all follows graph edges',
    fnName: 'getAllFollowEdges()',
    surql: 'SELECT id, in, out, created_at FROM follows;',
  },
];

export const DatabaseStudioView: React.FC<DatabaseStudioViewProps> = ({
  students,
  followEdges,
  wroteEdges,
  postNodes,
  currentUserId,
  followingIds,
  followerIds,
  fofIds,
  onSelectStudent,
  onDeleteStudent,
  onDeletePost,
  onUnfollow,
  onRefreshAll,
}) => {
  const [selectedTable, setSelectedTable] = useState<'student' | 'post' | 'follows' | 'wrote'>('student');
  const [showPostsInGraph, setShowPostsInGraph] = useState(false);

  // Interactive SurrealQL Runner state
  const [customSql, setCustomSql] = useState(PRESET_QUERIES[3].surql);
  const [queryOutput, setQueryOutput] = useState<string | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [runningQuery, setRunningQuery] = useState(false);

  const handleRunSql = async (sqlToRun?: string) => {
    const sql = (sqlToRun ?? customSql).trim();
    if (!sql) return;
    setRunningQuery(true);
    setQueryError(null);
    try {
      const res = await executeCustomSurql(sql);
      setQueryOutput(JSON.stringify(res, null, 2));
      await onRefreshAll();
    } catch (err) {
      setQueryError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunningQuery(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Studio Header Banner */}
      <div className="rounded-[24px] bg-[#121215] border border-white/[0.07] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              Faculty Demonstration View · Live SurrealDB WASM Inspector
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
            Database Tables, Graph Topology &amp; Functions
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Inspect raw records in all 4 SurrealDB tables (<code className="text-zinc-200 font-mono">student</code>,{' '}
            <code className="text-zinc-200 font-mono">post</code>,{' '}
            <code className="text-zinc-200 font-mono">follows</code>,{' '}
            <code className="text-zinc-200 font-mono">wrote</code>), visualize graph edges, and test SurrealQL queries.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowPostsInGraph((v) => !v)}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
              showPostsInGraph
                ? 'bg-white text-black border-white'
                : 'bg-[#18181c] text-zinc-300 border-white/[0.08] hover:text-white'
            }`}
          >
            {showPostsInGraph ? 'Hide Posts in Graph' : 'Show Posts in Graph'}
          </button>
        </div>
      </div>

      {/* SECTION 1: Interactive Visual Graph Topology */}
      <GraphVisualizer
        students={students}
        followEdges={followEdges}
        wroteEdges={wroteEdges}
        postNodes={postNodes}
        currentUserId={currentUserId}
        followingIds={followingIds}
        followerIds={followerIds}
        fofIds={fofIds}
        onSelectStudent={onSelectStudent}
        showPostsInGraph={showPostsInGraph}
      />

      {/* SECTION 2: Live SurrealDB Tables Inspector (All 4 Tables) */}
      <div className="rounded-[24px] bg-[#121215] border border-white/[0.07] overflow-hidden">
        <div className="px-6 py-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Table2 className="w-4 h-4 text-zinc-400" />
              <h2 className="text-lg font-bold text-white">
                Live SurrealDB Tables (Namespace: <code className="font-mono text-zinc-300">campus</code> · DB:{' '}
                <code className="font-mono text-zinc-300">social</code>)
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Switch between Document Node Tables (<code className="font-mono">student</code>, <code className="font-mono">post</code>) and Graph Edge Relation Tables (<code className="font-mono">follows</code>, <code className="font-mono">wrote</code>)
            </p>
          </div>

          {/* 4 Table Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#18181c] p-1.5 rounded-2xl border border-white/[0.06]">
            <button
              onClick={() => setSelectedTable('student')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
                selectedTable === 'student'
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              student ({students.length})
            </button>
            <button
              onClick={() => setSelectedTable('post')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
                selectedTable === 'post'
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              post ({postNodes.length})
            </button>
            <button
              onClick={() => setSelectedTable('follows')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
                selectedTable === 'follows'
                  ? 'bg-emerald-400 text-black'
                  : 'text-emerald-400/80 hover:text-emerald-300'
              }`}
            >
              follows [EDGE] ({followEdges.length})
            </button>
            <button
              onClick={() => setSelectedTable('wrote')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all ${
                selectedTable === 'wrote'
                  ? 'bg-sky-400 text-black'
                  : 'text-sky-400/80 hover:text-sky-300'
              }`}
            >
              wrote [EDGE] ({wroteEdges.length})
            </button>
          </div>
        </div>

        {/* SQL Query Header for Selected Table */}
        <div className="px-6 py-3 bg-black/50 border-b border-white/[0.05] flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-400">
            Table Schema Type:{' '}
            <strong className="text-white">
              {selectedTable === 'student' || selectedTable === 'post'
                ? 'DOCUMENT NODE TABLE (SCHEMALESS)'
                : 'GRAPH RELATION EDGE TABLE (in -> edge -> out)'}
            </strong>
          </span>
          <span className="text-emerald-400">
            SELECT * FROM {selectedTable};
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {selectedTable === 'student' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-400 bg-[#16161a]">
                  <th className="py-3 px-4 font-mono">id (RecordId)</th>
                  <th className="py-3 px-4">name</th>
                  <th className="py-3 px-4">branch</th>
                  <th className="py-3 px-4">year</th>
                  <th className="py-3 px-4">bio</th>
                  <th className="py-3 px-4 text-right">CRUD Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono text-emerald-400 font-medium whitespace-nowrap">
                      {s.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                      {s.name}
                    </td>
                    <td className="py-3 px-4 text-zinc-300 whitespace-nowrap">{s.branch}</td>
                    <td className="py-3 px-4 text-zinc-300">{s.year}</td>
                    <td className="py-3 px-4 text-zinc-400 max-w-md truncate">{s.bio}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelectStudent(s.id)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 mr-2"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => onDeleteStudent(s)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                        title="DELETE record"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedTable === 'post' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-400 bg-[#16161a]">
                  <th className="py-3 px-4 font-mono">id (RecordId)</th>
                  <th className="py-3 px-4">text</th>
                  <th className="py-3 px-4 font-mono">created_at</th>
                  <th className="py-3 px-4 text-right">CRUD Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {postNodes.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono text-sky-400 font-medium whitespace-nowrap">
                      {p.id}
                    </td>
                    <td className="py-3 px-4 text-zinc-200 max-w-xl">{p.text}</td>
                    <td className="py-3 px-4 font-mono text-zinc-500 whitespace-nowrap">
                      {p.created_at ? new Date(p.created_at).toLocaleTimeString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onDeletePost(p.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                        title="DELETE post"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedTable === 'follows' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-400 bg-[#16161a]">
                  <th className="py-3 px-4 font-mono">id (Edge RecordId)</th>
                  <th className="py-3 px-4 font-mono">in (Source Student)</th>
                  <th className="py-3 px-4 font-mono">Relation</th>
                  <th className="py-3 px-4 font-mono">out (Target Student)</th>
                  <th className="py-3 px-4 text-right">Graph Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {followEdges.map((edge) => (
                  <tr key={edge.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap">
                      {edge.id}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-semibold whitespace-nowrap">
                      {edge.in}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-500 whitespace-nowrap">
                      —[follows]→
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-400 font-semibold whitespace-nowrap">
                      {edge.out}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onUnfollow(edge.in, edge.out)}
                        className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 font-mono text-[11px]"
                      >
                        DELETE edge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {selectedTable === 'wrote' && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-400 bg-[#16161a]">
                  <th className="py-3 px-4 font-mono">id (Edge RecordId)</th>
                  <th className="py-3 px-4 font-mono">in (Author Student)</th>
                  <th className="py-3 px-4 font-mono">Relation</th>
                  <th className="py-3 px-4 font-mono">out (Post Node)</th>
                  <th className="py-3 px-4">text (Edge Property)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {wroteEdges.map((edge) => (
                  <tr key={edge.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap">
                      {edge.id}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-semibold whitespace-nowrap">
                      {edge.in}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-500 whitespace-nowrap">
                      —[wrote]→
                    </td>
                    <td className="py-3 px-4 font-mono text-sky-400 font-semibold whitespace-nowrap">
                      {edge.out}
                    </td>
                    <td className="py-3 px-4 text-zinc-300 max-w-md truncate">
                      {edge.text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SECTION 3: Interactive SurrealQL Query Runner + Function Mapping */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive SurrealQL Runner */}
        <div className="lg:col-span-7 rounded-[24px] bg-[#121215] border border-white/[0.07] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <h3 className="text-base font-bold text-white">
                Interactive SurrealQL Query Runner
              </h3>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              Executes directly on @surrealdb/wasm
            </span>
          </div>

          {/* Preset Query Buttons */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-zinc-400">
              Click a preset query to load &amp; execute:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_QUERIES.map((q) => (
                <button
                  key={q.label}
                  onClick={() => {
                    setCustomSql(q.surql);
                    handleRunSql(q.surql);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#18181c] hover:bg-white/[0.1] border border-white/[0.06] text-xs text-zinc-200 transition-colors text-left"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* SQL Input Box */}
          <div className="space-y-2">
            <textarea
              rows={3}
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              className="w-full rounded-2xl bg-black border border-white/[0.1] focus:border-white/30 p-3.5 font-mono text-xs text-emerald-300 focus:outline-none"
              placeholder="Enter any SurrealQL query..."
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-500 font-mono">
                Supports SELECT, CREATE, UPDATE, DELETE, RELATE
              </span>
              <button
                onClick={() => handleRunSql()}
                disabled={runningQuery || !customSql.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-all disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                {runningQuery ? 'Running...' : 'Execute SurrealQL'}
              </button>
            </div>
          </div>

          {/* Result Output */}
          {queryError && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 font-mono flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>{queryError}</div>
            </div>
          )}

          {queryOutput && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Query Result JSON
                </span>
              </div>
              <pre className="max-h-64 overflow-auto rounded-2xl bg-black border border-white/[0.06] p-4 text-[11px] font-mono text-zinc-300">
                {queryOutput}
              </pre>
            </div>
          )}
        </div>

        {/* Right: Codebase Function Reference (`src/lib/db.ts`) */}
        <div className="lg:col-span-5 rounded-[24px] bg-[#121215] border border-white/[0.07] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-sky-400" />
            <h3 className="text-base font-bold text-white">
              Implemented Functions (<code className="font-mono text-xs text-zinc-300">src/lib/db.ts</code>)
            </h3>
          </div>
          <p className="text-xs text-zinc-400">
            Complete mapping of every TypeScript function to its underlying SurrealQL operation:
          </p>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-[#18181c] border border-white/[0.05]">
              <div className="flex items-center justify-between font-mono">
                <span className="text-white font-semibold">createStudent(input)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">CREATE</span>
              </div>
              <p className="font-mono text-[11px] text-zinc-400 mt-1">
                CREATE student:id SET name, branch, year, bio
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#18181c] border border-white/[0.05]">
              <div className="flex items-center justify-between font-mono">
                <span className="text-white font-semibold">updateStudentBio(id, bio)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">UPDATE</span>
              </div>
              <p className="font-mono text-[11px] text-zinc-400 mt-1">
                UPDATE student:id SET bio = $bio
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#18181c] border border-white/[0.05]">
              <div className="flex items-center justify-between font-mono">
                <span className="text-white font-semibold">deleteStudent(id)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/15 text-red-300">DELETE</span>
              </div>
              <p className="font-mono text-[11px] text-zinc-400 mt-1">
                DELETE follows/wrote edges + DELETE student:id
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#18181c] border border-white/[0.05]">
              <div className="flex items-center justify-between font-mono">
                <span className="text-white font-semibold">createPost(authorId, text)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/15 text-sky-300">RELATE</span>
              </div>
              <p className="font-mono text-[11px] text-zinc-400 mt-1">
                RELATE student:id-&gt;wrote-&gt;post:uuid SET text, created_at
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#18181c] border border-white/[0.05]">
              <div className="flex items-center justify-between font-mono">
                <span className="text-white font-semibold">followStudent(from, to)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/15 text-sky-300">RELATE</span>
              </div>
              <p className="font-mono text-[11px] text-zinc-400 mt-1">
                RELATE student:a-&gt;follows-&gt;student:b
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#18181c] border border-white/[0.05]">
              <div className="flex items-center justify-between font-mono">
                <span className="text-white font-semibold">getFollowing / getFollowers</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-300">1-HOP GRAPH</span>
              </div>
              <p className="font-mono text-[11px] text-zinc-400 mt-1">
                SELECT -&gt;follows-&gt;student / &lt;-follows&lt;-student
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-[#18181c] border border-white/[0.05]">
              <div className="flex items-center justify-between font-mono">
                <span className="text-white font-semibold">getFriendsOfFriends(id)</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-300">2-HOP GRAPH</span>
              </div>
              <p className="font-mono text-[11px] text-zinc-400 mt-1">
                SELECT -&gt;follows-&gt;follows-&gt;student FROM student:id
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
