import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Post } from '../lib/db';
import { getAvatarGradient, getInitials } from './StudentCard';

interface PostCardProps {
  post: Post;
  onEditPost: (postId: string, newText: string) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onSelectAuthor: (authorId: string) => void;
}

export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return 'Now';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Now';
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 45) return 'Now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d`;
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

  const avatarTone = getAvatarGradient(post.author_id);

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
    <div className="group rounded-[24px] bg-[#121215] border border-white/[0.06] hover:border-white/[0.1] p-6 transition-all">
      {/* Author Header */}
      <div className="flex items-start justify-between gap-4">
        <div
          onClick={() => onSelectAuthor(post.author_id)}
          className="flex items-center gap-3.5 cursor-pointer"
        >
          <div
            className={`w-10 h-10 rounded-full ${avatarTone} border border-white/[0.08] flex items-center justify-center font-semibold text-xs shrink-0`}
          >
            {getInitials(post.author_name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[15px] text-white hover:underline">
                {post.author_name}
              </span>
              <span className="text-xs text-zinc-600">·</span>
              <span className="text-xs text-zinc-500">
                {formatRelativeTime(post.created_at)}
              </span>
            </div>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              {post.author_branch} · Year {post.author_year}
            </p>
          </div>
        </div>

        {/* Subtle Edit & Delete Controls */}
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setDraftText(post.text);
                setIsEditing(true);
              }}
              title="Edit post"
              className="p-2 rounded-full text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeletePost(post.id)}
              title="Delete post"
              className="p-2 rounded-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Post Content or Edit Box */}
      {isEditing ? (
        <div className="mt-4 space-y-3">
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={3}
            className="w-full rounded-2xl bg-[#1a1a1f] border border-white/15 focus:border-white/30 px-4 py-3 text-[15px] text-white focus:outline-none resize-none"
            placeholder="Update post..."
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setIsEditing(false)}
              disabled={saving}
              className="px-4 py-1.5 rounded-full text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !draftText.trim()}
              className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-zinc-200 text-black transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-zinc-200 text-[15px] leading-relaxed whitespace-pre-wrap">
          {post.text}
        </p>
      )}
    </div>
  );
};
