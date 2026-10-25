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
    <div className="rounded-[24px] bg-[#121215] border border-white/[0.07] p-6 transition-all">
      {/* Author Header */}
      <div className="flex items-start justify-between gap-4">
        <div
          onClick={() => onSelectAuthor(post.author_id)}
          className="flex items-center gap-3.5 cursor-pointer group"
        >
          <div
            className={`w-10 h-10 rounded-full ${avatarTone} border border-white/[0.1] flex items-center justify-center font-semibold text-xs shrink-0`}
          >
            {getInitials(post.author_name)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[15px] text-white group-hover:underline">
                {post.author_name}
              </span>
              <code className="text-[11px] font-mono text-emerald-400">
                {post.author_id}
              </code>
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

        {/* Always-Visible Edit & Delete CRUD Controls */}
        {!isEditing && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setDraftText(post.text);
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs text-zinc-300 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => onDeletePost(post.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs text-red-300 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete
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
            className="w-full rounded-2xl bg-[#1a1a1f] border border-white/20 focus:border-white/40 px-4 py-3 text-[15px] text-white focus:outline-none resize-none"
            placeholder="Update post..."
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <code className="text-[11px] font-mono text-zinc-400">
              UPDATE {post.id} SET text = &quot;...&quot;
            </code>
            <div className="flex items-center gap-2">
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
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-zinc-200 text-[15px] leading-relaxed whitespace-pre-wrap">
          {post.text}
        </p>
      )}

      {/* Explicit Graph Edge Trace Footer */}
      <div className="mt-4 pt-3 border-t border-white/[0.05] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-500">
        <span>
          Graph Authorship Edge:{' '}
          <strong className="text-emerald-400 font-normal">{post.author_id}</strong>
          <span className="text-zinc-400"> —[wrote]→ </span>
          <strong className="text-sky-400 font-normal">{post.id}</strong>
        </span>
        {post.edge_id && (
          <span className="text-zinc-600">Edge ID: {post.edge_id}</span>
        )}
      </div>
    </div>
  );
};
