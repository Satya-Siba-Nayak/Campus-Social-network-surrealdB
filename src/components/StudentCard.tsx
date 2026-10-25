import React from 'react';
import { Trash2, Eye } from 'lucide-react';
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
    <div className="flex flex-col justify-between rounded-[24px] bg-[#121215] hover:bg-[#151519] border border-white/[0.07] p-6 transition-all duration-150">
      <div>
        {/* Top Row: Avatar + Name + RecordId */}
        <div className="flex items-start justify-between gap-4">
          <div
            onClick={() => onViewProfile(student.id)}
            className="flex items-center gap-3.5 min-w-0 cursor-pointer group"
          >
            <div
              className={`w-12 h-12 rounded-full ${avatarTone} border border-white/[0.1] flex items-center justify-center font-semibold text-sm tracking-tight shrink-0`}
            >
              {getInitials(student.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-[16px] text-white group-hover:underline tracking-tight truncate">
                  {student.name}
                </h3>
                {isSelf && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-black">
                    Active You
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[12px] text-zinc-400">
                <code className="font-mono text-emerald-400">{student.id}</code>
                <span>·</span>
                <span className="truncate">
                  {student.branch} (Yr {student.year})
                </span>
              </div>
            </div>
          </div>

          {/* Always-Visible Delete Button */}
          {onDeleteStudent && (
            <button
              onClick={() => onDeleteStudent(student)}
              disabled={busy}
              title={`DELETE ${student.id}`}
              className="p-2 rounded-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bio */}
        <p className="mt-4 text-[14px] text-zinc-300 line-clamp-2 leading-relaxed">
          {student.bio || 'No bio added.'}
        </p>
      </div>

      {/* Bottom Bar: Stats + Explicit Action Buttons */}
      <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-[13px] text-zinc-400">
          <span>
            <strong className="font-semibold text-white">{followersCount}</strong> followers
          </span>
          <span>·</span>
          <span>
            <strong className="font-semibold text-white">{followingCount}</strong> following
          </span>
          {!isSelf && followsYou && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
              Follows you
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewProfile(student.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-medium bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Profile
          </button>

          {!isSelf && (
            <button
              onClick={() => onToggleFollow(student, isFollowing)}
              disabled={busy}
              className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                isFollowing
                  ? 'bg-emerald-500/15 hover:bg-red-500/15 text-emerald-300 hover:text-red-300 border border-emerald-500/30 hover:border-red-500/30'
                  : 'bg-white hover:bg-zinc-200 text-black'
              }`}
            >
              {isFollowing ? 'Following (Unfollow)' : 'Follow'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
