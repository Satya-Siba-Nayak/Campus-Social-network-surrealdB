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
  onFollow,
  onViewProfile,
  busy = false,
}) => {
  return (
    <div className="rounded-[24px] bg-[#121215] border border-white/[0.06] p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-white/[0.05]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[17px] font-semibold text-white tracking-tight">
              Friends of Friends
            </h3>
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-400">
              2-Hop Graph
            </span>
          </div>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            People followed by people {perspectiveStudent.name.split(' ')[0]} follows
          </p>
        </div>

        <code className="text-[11px] font-mono text-zinc-500 bg-black/50 px-3 py-1.5 rounded-full border border-white/[0.05]">
          SELECT -&gt;follows-&gt;follows-&gt;student FROM {perspectiveStudent.id}
        </code>
      </div>

      {/* Recommendations List */}
      <div className="mt-5">
        {recommendations.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[14px] font-medium text-zinc-300">
              You&apos;re connected with everyone in this 2-hop network
            </p>
            <p className="text-[13px] text-zinc-500 mt-1">
              Follow or unfollow students to see real-time 2-hop graph recommendations.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {recommendations.map(({ student, mutualConnections }) => {
              const avatarTone = getAvatarGradient(student.id);
              return (
                <div
                  key={student.id}
                  onClick={() => onViewProfile(student.id)}
                  className="flex flex-col justify-between rounded-[20px] bg-[#18181c] hover:bg-[#1d1d22] border border-white/[0.05] p-4 transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full ${avatarTone} border border-white/[0.08] flex items-center justify-center font-semibold text-xs shrink-0`}
                      >
                        {getInitials(student.name)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-[14px] text-white truncate">
                          {student.name}
                        </h4>
                        <p className="text-[12px] text-zinc-500 truncate">
                          {student.branch} · Yr {student.year}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFollow(student);
                      }}
                      disabled={busy}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-zinc-200 text-black transition-colors shrink-0"
                    >
                      Follow
                    </button>
                  </div>

                  {/* Subtle 2-Hop Path Pill */}
                  <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-zinc-500">
                    <span className="truncate">
                      Followed by{' '}
                      <strong className="text-zinc-300 font-medium">
                        {mutualConnections.length > 0
                          ? mutualConnections.map((m) => m.name.split(' ')[0]).join(', ')
                          : '1-hop peer'}
                      </strong>
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-zinc-600 shrink-0">
                      2 hops <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
