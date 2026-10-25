import React from 'react';
import { Trash2, ArrowUpRight } from 'lucide-react';
import { Student } from '../lib/db';

const AVATAR_TONES = [
  'bg-zinc-800 text-zinc-100',
  'bg-neutral-800 text-neutral-100',
  'bg-stone-800 text-stone-100',
  'bg-[#1e2330] text-blue-200',
  'bg-[#1c2623] text-emerald-200',
  'bg-[#26202a] text-purple-200',
];

export function getAvatarGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

interface StudentCardProps {
  student: Student;
  currentUserId: string;
  isFollowing: boolean;
  followsYou?: boolean;
  followersCount: number;
  followingCount: number;
  onToggleFollow: (targetStudent: Student, currentlyFollowing: boolean) => void;
  onViewProfile: (studentId: string) => void;
  onDeleteStudent?: (student: Student) => void;
  busy?: boolean;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  currentUserId,
  isFollowing,
  followsYou = false,
  followersCount,
  followingCount,
  onToggleFollow,
  onViewProfile,
  onDeleteStudent,
  busy = false,
}) => {
  const isSelf = student.id === currentUserId;
  const avatarTone = getAvatarGradient(student.id);

  return (
    <div
      onClick={() => onViewProfile(student.id)}
      className="group relative flex flex-col justify-between rounded-[24px] bg-[#121215] hover:bg-[#16161a] border border-white/[0.06] hover:border-white/[0.12] p-6 transition-all duration-200 cursor-pointer"
    >
      <div>
        {/* Header: Avatar + Name + Action */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-12 h-12 rounded-full ${avatarTone} border border-white/[0.08] flex items-center justify-center font-semibold text-sm tracking-tight shrink-0`}
            >
              {getInitials(student.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-[16px] text-white tracking-tight truncate">
                  {student.name}
                </h3>
                {isSelf && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white">
                    You
                  </span>
                )}
              </div>
              <p className="text-[13px] text-zinc-500 truncate mt-0.5">
                {student.branch} · Year {student.year}
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-1.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {!isSelf ? (
              <button
                onClick={() => onToggleFollow(student, isFollowing)}
                disabled={busy}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                  isFollowing
                    ? 'bg-white/[0.08] hover:bg-red-500/15 text-zinc-200 hover:text-red-400'
                    : 'bg-white hover:bg-zinc-200 text-black font-semibold'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 group-hover:text-white transition-colors px-2 py-1">
                Profile <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>

        {/* Bio */}
        <p className="mt-4 text-[14px] text-zinc-400 line-clamp-2 leading-relaxed">
          {student.bio || 'No bio added.'}
        </p>
      </div>

      {/* Bottom Metric Strip */}
      <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center justify-between text-[13px]">
        <div className="flex items-center gap-4 text-zinc-500">
          <span>
            <strong className="font-semibold text-zinc-200">{followersCount}</strong> followers
          </span>
          <span>
            <strong className="font-semibold text-zinc-200">{followingCount}</strong> following
          </span>
          {!isSelf && followsYou && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/[0.05] text-zinc-400">
              Follows you
            </span>
          )}
        </div>

        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[11px] font-mono text-zinc-600">
            {student.id}
          </span>
          {onDeleteStudent && (
            <button
              onClick={() => onDeleteStudent(student)}
              disabled={busy}
              title={`Delete ${student.name}`}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
