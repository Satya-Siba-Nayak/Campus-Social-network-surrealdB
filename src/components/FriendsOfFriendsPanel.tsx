import React from 'react';
import { ArrowRight } from 'lucide-react';
import { FriendOfFriendRecommendation, Student } from '../lib/db';
import { getAvatarGradient, getInitials } from './StudentCard';

interface FriendsOfFriendsPanelProps {
  perspectiveStudent: Student;
  recommendations: FriendOfFriendRecommendation[];
  rawTwoHopAll: Student[];
  onFollow: (student: Student) => void;
  onViewProfile: (studentId: string) => void;
  busy?: boolean;
}

export const FriendsOfFriendsPanel: React.FC<FriendsOfFriendsPanelProps> = ({
  perspectiveStudent,
  recommendations,
  rawTwoHopAll,
  onFollow,
  onViewProfile,
  busy = false,
}) => {
  return (
    <div className="rounded-[24px] bg-[#121215] border border-white/[0.07] p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-5 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[17px] font-bold text-white tracking-tight">
              Friends of Friends (2-Hop Graph Traversal)
            </h3>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              getFriendsOfFriends(&quot;{perspectiveStudent.id}&quot;)
            </span>
          </div>
          <p className="text-[13px] text-zinc-400 mt-1">
            People followed by people <strong className="text-white">{perspectiveStudent.name}</strong> ({perspectiveStudent.id}) follows
          </p>
        </div>

        <code className="text-xs font-mono text-emerald-400 bg-black/60 px-3.5 py-2 rounded-xl border border-white/[0.06] shrink-0">
          SELECT -&gt;follows-&gt;follows-&gt;student FROM {perspectiveStudent.id};
        </code>
      </div>

      {/* Recommendations List */}
      <div className="mt-5">
        {recommendations.length === 0 ? (
          <div className="py-8 text-center rounded-2xl bg-[#18181c] border border-white/[0.04] px-4">
            <p className="text-[14px] font-medium text-zinc-200">
              No unfollowed 2-hop connections for {perspectiveStudent.name} right now
            </p>
            <p className="text-[12px] text-zinc-400 mt-1 max-w-lg mx-auto">
              Raw 2-hop nodes returned by SurrealDB: {rawTwoHopAll.length} (
              {rawTwoHopAll.map((s) => s.id).join(', ') || 'none'}). They are already followed directly or are {perspectiveStudent.id} themselves.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map(({ student, mutualConnections }) => {
              const avatarTone = getAvatarGradient(student.id);
              return (
                <div
                  key={student.id}
                  className="flex flex-col justify-between rounded-[20px] bg-[#18181c] border border-white/[0.06] p-4 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div
                        onClick={() => onViewProfile(student.id)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer group"
                      >
                        <div
                          className={`w-10 h-10 rounded-full ${avatarTone} border border-white/[0.1] flex items-center justify-center font-semibold text-xs shrink-0`}
                        >
                          {getInitials(student.name)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-[14px] text-white group-hover:underline truncate">
                            {student.name}
                          </h4>
                          <p className="text-[11px] font-mono text-amber-400 truncate">
                            {student.id}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => onFollow(student)}
                        disabled={busy}
                        className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-zinc-200 text-black transition-colors shrink-0"
                      >
                        Follow
                      </button>
                    </div>

                    <p className="text-xs text-zinc-400 mt-2.5">
                      {student.branch} · Year {student.year}
                    </p>
                  </div>

                  {/* Explicit 2-Hop Graph Path Trace */}
                  <div className="mt-4 pt-3 border-t border-white/[0.06]">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
                      2-Hop Graph Path:
                    </p>
                    <div className="flex flex-wrap items-center gap-1 text-[11px] font-mono text-zinc-300 bg-black/50 px-2.5 py-1.5 rounded-lg border border-white/[0.04]">
                      <span className="text-white">{perspectiveStudent.id.replace('student:', '')}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="text-emerald-400">
                        {mutualConnections.length > 0
                          ? mutualConnections.map((m) => m.id.replace('student:', '')).join(' | ')
                          : '1-hop'}
                      </span>
                      <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="text-amber-300 font-semibold">
                        {student.id.replace('student:', '')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Raw SurrealDB Output Summary */}
      <div className="mt-4 pt-3 border-t border-white/[0.05] flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400 font-mono">
        <span>
          Raw 2-Hop Result ({rawTwoHopAll.length}): [
          {rawTwoHopAll.map((s) => s.id).join(', ')}]
        </span>
        <span className="text-amber-300">
          {recommendations.length} unfollowed recommendation(s)
        </span>
      </div>
    </div>
  );
};
