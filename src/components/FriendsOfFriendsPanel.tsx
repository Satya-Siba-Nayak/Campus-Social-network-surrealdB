import React from 'react';
import {
  Network,
  ArrowRight,
  UserPlus,
  Sparkles,
  Terminal,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
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
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-fuchsia-950/25 border border-fuchsia-500/30 p-5 sm:p-6 shadow-xl">
      {/* Header & SurrealQL Showcase */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-semibold mb-2">
            <Network className="w-3.5 h-3.5" />
            2-Hop SurrealQL Graph Traversal
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            Friends of Friends
            <span className="text-sm font-normal text-slate-400">
              (People followed by people <strong className="text-slate-200">{perspectiveStudent.name}</strong> follows)
            </span>
          </h3>
        </div>

        {/* Live SurrealQL Query Badge */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3.5 py-2.5 font-mono text-xs flex items-center gap-2.5 shrink-0">
          <Terminal className="w-4 h-4 text-fuchsia-400 shrink-0" />
          <div className="overflow-x-auto">
            <span className="text-purple-400">SELECT</span>{' '}
            <span className="text-fuchsia-300">-&gt;follows-&gt;follows-&gt;student</span>{' '}
            <span className="text-purple-400">FROM</span>{' '}
            <span className="text-cyan-300">{perspectiveStudent.id}</span>
          </div>
        </div>
      </div>

      {/* Recommendations Grid (New 2-Hop Discoveries) */}
      <div className="mt-5">
        {recommendations.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl bg-slate-950/50 border border-slate-800/70">
            <Sparkles className="w-8 h-8 text-fuchsia-400 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-medium text-slate-200">
              No unfollowed 2-hop connections right now!
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Either {perspectiveStudent.name} already follows everyone in their 2-hop neighborhood, or the people they follow haven&apos;t followed others yet. Try following or unfollowing students to see the graph update live!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map(({ student, mutualConnections }) => {
              const grad = getAvatarGradient(student.id);
              return (
                <div
                  key={student.id}
                  className="flex flex-col justify-between rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-fuchsia-500/40 p-4 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div
                        onClick={() => onViewProfile(student.id)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div
                          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-sm shadow shrink-0 group-hover:scale-105 transition-transform`}
                        >
                          {getInitials(student.name)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-100 group-hover:text-fuchsia-400 transition-colors">
                            {student.name}
                          </h4>
                          <p className="text-xs font-mono text-slate-500">
                            {student.id}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => onFollow(student)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-md shadow-fuchsia-950/40 transition-all"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Follow
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-3 text-xs">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 text-cyan-300 border border-slate-800">
                        <BookOpen className="w-3 h-3" />
                        {student.branch}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 text-purple-300 border border-slate-800">
                        <GraduationCap className="w-3 h-3" />
                        Year {student.year}
                      </span>
                    </div>

                    <p className="mt-2.5 text-xs text-slate-300 line-clamp-2">
                      {student.bio}
                    </p>
                  </div>

                  {/* Visual 2-Hop Path Diagram */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
                      2-Hop Graph Path
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
                      <span className="text-fuchsia-300 font-semibold">
                        {perspectiveStudent.id.replace('student:', '')}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {mutualConnections.length > 0
                          ? mutualConnections.map((m) => m.name.split(' ')[0]).join(' / ')
                          : '1-hop friend'}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="text-cyan-300 font-semibold">
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

      {/* Raw 2-Hop Result Summary Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          Raw 2-hop nodes returned by SurrealDB:{' '}
          <strong className="text-slate-200">{rawTwoHopAll.length}</strong>{' '}
          {rawTwoHopAll.length > 0 && (
            <span className="font-mono text-slate-500">
              ([{rawTwoHopAll.map((s) => s.id).join(', ')}])
            </span>
          )}
        </span>
        <span className="text-fuchsia-300/90 font-medium">
          {recommendations.length} new recommendation{recommendations.length === 1 ? '' : 's'} (filtered self &amp; 1-hop)
        </span>
      </div>
    </div>
  );
};
