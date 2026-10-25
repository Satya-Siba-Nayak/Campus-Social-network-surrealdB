import React, { useState } from 'react';
import {
  Pencil,
  Trash2,
  Check,
  X,
  Clock,
  GraduationCap,
  BookOpen,
  GitCommitHorizontal,
} from 'lucide-react';
import { Post } from '../lib/db';
import { getAvatarGradient, getInitials } from './StudentCard';

interface PostCardProps {
  post: Post;
  onEditPost: (postId: string, newText: string) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onSelectAuthor: (authorId: string) => void;
}

export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return 'just now';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'just now';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 45) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onEditPost,
  onDeletePost,
  onSelectAuthor,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(post.text);
  const [saving, setSaving] = useState(false);

  const gradient = getAvatarGradient(post.author_id);

  const handleSave = async () => {
    if (!draftText.trim()) return;
    setSaving(true);
    try {
      await onEditPost(post.id, draftText.trim());
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/75 border border-slate-800/80 hover:border-slate-700/80 p-5 shadow-md transition-all">
      {/* Author Header */}
      <div className="flex items-start justify-between gap-3">
        <div
          onClick={() => onSelectAuthor(post.author_id)}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div
            className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shadow shrink-0 group-hover:scale-105 transition-transform`}
          >
            {getInitials(post.author_name)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-100 group-hover:text-fuchsia-400 transition-colors">
                {post.author_name}
              </span>
              <span className="text-xs font-mono text-slate-500">
                ({post.author_id})
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-0.5 flex-wrap">
              {post.author_branch && (
                <span className="inline-flex items-center gap-1 text-cyan-400/90">
                  <BookOpen className="w-3 h-3" />
                  {post.author_branch}
                </span>
              )}
              {post.author_year && (
                <span className="inline-flex items-center gap-1 text-purple-400/90">
                  <GraduationCap className="w-3 h-3" />
                  Yr {post.author_year}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(post.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Edit & Delete Controls */}
        <div className="flex items-center gap-1">
          {!isEditing && (
            <>
              <button
                onClick={() => {
                  setDraftText(post.text);
                  setIsEditing(true);
                }}
                title="Edit post text"
                className="p-1.5 rounded-lg text-slate-400 hover:text-fuchsia-300 hover:bg-slate-800 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDeletePost(post.id)}
                title="Delete post"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Post Content or Edit Box */}
      {isEditing ? (
        <div className="mt-4 space-y-3">
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-slate-950 border border-fuchsia-500/50 focus:border-fuchsia-400 px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none"
            placeholder="Update post text..."
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setIsEditing(false)}
              disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !draftText.trim()}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-fuchsia-600 hover:bg-fuchsia-500 text-white transition-colors disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3.5 text-slate-200 text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap">
          {post.text}
        </p>
      )}

      {/* Graph Edge Metadata Pill */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-500">
        <span className="inline-flex items-center gap-1.5 truncate">
          <GitCommitHorizontal className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
          <span className="text-slate-400">{post.author_id}</span>
          <span className="text-fuchsia-400">-&gt;wrote-&gt;</span>
          <span className="text-cyan-400">{post.id}</span>
        </span>
      </div>
    </div>
  );
};
