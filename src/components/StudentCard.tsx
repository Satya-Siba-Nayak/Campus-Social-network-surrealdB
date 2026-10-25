import React from 'react';
import {
  UserPlus,
  UserCheck,
  GraduationCap,
  BookOpen,
  Trash2,
  Eye,
  Sparkles,
  Users,
} from 'lucide-react';
import { Student } from '../lib/db';

const AVATAR_GRADIENTS = [
  'from-fuchsia-500 to-purple-600',
  'from-cyan-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-violet-600',
];

export function getAvatarGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
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
  const gradient = getAvatarGradient(student.id);

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl bg-slate-900/75 border border-slate-800/80 hover:border-fuchsia-500/40 p-5 shadow-lg hover:shadow-fuchsia-950/20 transition-all duration-200">
      <div>
        {/* Top Row: Avatar + Badges + Actions */}
        <div className="flex items-start justify-between gap-3">
          <div
            onClick={() => onViewProfile(student.id)}
            className="flex items-center gap-3.5 cursor-pointer group/title"
          >
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-base shadow-md shrink-0 group-hover/title:scale-105 transition-transform`}
            >
              {getInitials(student.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-slate-100 group-hover/title:text-fuchsia-400 transition-colors truncate">
                  {student.name}
                </h3>
                {isSelf && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
                    <Sparkles className="w-2.5 h-2.5" /> Active You
                  </span>
                )}
                {!isSelf && followsYou && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Follows you
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-400 truncate mt-0.5">
                {student.id}
              </p>
            </div>
          </div>

          {onDeleteStudent && (
            <button
              onClick={() => onDeleteStudent(student)}
              disabled={busy}
              title={`Delete ${student.name}`}
              className="opacity-70 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Academic Metadata Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800/90 text-cyan-300 border border-slate-700/70">
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            {student.branch}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800/90 text-purple-300 border border-slate-700/70">
            <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
            Year {student.year}
          </span>
        </div>

        {/* Bio */}
        <p className="mt-3.5 text-sm text-slate-300 line-clamp-2 leading-relaxed min-h-[2.5rem]">
          {student.bio || 'No campus bio added yet.'}
        </p>
      </div>

      {/* Footer: Graph Stats & Follow / Profile Buttons */}
      <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <strong className="text-slate-200">{followersCount}</strong> followers
          </span>
          <span>•</span>
          <span>
            <strong className="text-slate-200">{followingCount}</strong> following
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewProfile(student.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Profile
          </button>

          {!isSelf && (
            <button
              onClick={() => onToggleFollow(student, isFollowing)}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isFollowing
                  ? 'bg-emerald-500/15 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/30 hover:border-rose-500/40'
                  : 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-md shadow-fuchsia-950/50'
              }`}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  Following
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  Follow
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
