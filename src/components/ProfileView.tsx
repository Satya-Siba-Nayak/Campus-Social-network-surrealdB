import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Student, Post, FriendOfFriendRecommendation } from '../lib/db';
import { getAvatarGradient, getInitials } from './StudentCard';
import { PostCard } from './PostCard';
import { FriendsOfFriendsPanel } from './FriendsOfFriendsPanel';

interface ProfileViewProps {
  profileStudent: Student;
  currentUser: Student;
  following: Student[];
  followers: Student[];
  friendsOfFriends: {
    rawTwoHopAll: Student[];
    recommendations: FriendOfFriendRecommendation[];
  };
  posts: Post[];
  currentUserFollowingIds: Set<string>;
  onUpdateBio: (studentId: string, newBio: string) => Promise<void>;
  onDeleteStudent: (student: Student) => Promise<void>;
  onToggleFollow: (targetStudent: Student, isCurrentlyFollowing: boolean) => Promise<void>;
  onCreatePost: (authorId: string, text: string) => Promise<void>;
  onEditPost: (postId: string, newText: string) => Promise<void>;
  onDeletePost: (postId: string) => Promise<void>;
  onSelectStudent: (studentId: string) => void;
  onSwitchActiveUser: (studentId: string) => void;
  onBackToStudents: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profileStudent,
  currentUser,
  following,
  followers,
  friendsOfFriends,
  posts,
  currentUserFollowingIds,
  onUpdateBio,
  onDeleteStudent,
  onToggleFollow,
  onCreatePost,
  onEditPost,
  onDeletePost,
  onSelectStudent,
  onSwitchActiveUser,
  onBackToStudents,
}) => {
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState(profileStudent.bio);
  const [savingBio, setSavingBio] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [activeRelationTab, setActiveRelationTab] = useState<'following' | 'followers'>('following');

  useEffect(() => {
    setBioDraft(profileStudent.bio);
    setEditingBio(false);
  }, [profileStudent.id, profileStudent.bio]);

  const isCurrentUserProfile = profileStudent.id === currentUser.id;
  const isFollowedByCurrentUser = currentUserFollowingIds.has(profileStudent.id);
  const avatarTone = getAvatarGradient(profileStudent.id);

  const handleSaveBio = async () => {
    setSavingBio(true);
    try {
      await onUpdateBio(profileStudent.id, bioDraft);
      setEditingBio(false);
    } finally {
      setSavingBio(false);
    }
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;
    setPosting(true);
    try {
      await onCreatePost(profileStudent.id, newPostText.trim());
      setNewPostText('');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBackToStudents}
          className="inline-flex items-center gap-2 text-[13px] font-medium text-zinc-400 hover:text-white bg-[#121215] hover:bg-[#1a1a1f] px-4 py-2 rounded-full border border-white/[0.06] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {!isCurrentUserProfile && (
          <button
            onClick={() => onSwitchActiveUser(profileStudent.id)}
            className="text-[13px] font-medium text-zinc-300 hover:text-white bg-[#121215] hover:bg-[#1a1a1f] px-4 py-2 rounded-full border border-white/[0.08] transition-colors"
          >
            Switch view to {profileStudent.name.split(' ')[0]}
          </button>
        )}
      </div>

      {/* Main Revolut-Style Account Card */}
      <div className="rounded-[28px] bg-[#121215] border border-white/[0.06] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div
              className={`w-20 h-20 rounded-full ${avatarTone} border border-white/[0.1] flex items-center justify-center font-bold text-2xl shrink-0`}
            >
              {getInitials(profileStudent.name)}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {profileStudent.name}
                </h1>
                {isCurrentUserProfile && (
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white">
                    Active Profile
                  </span>
                )}
              </div>
              <p className="text-[14px] text-zinc-400 mt-1">
                {profileStudent.branch} · Year {profileStudent.year} ·{' '}
                <span className="font-mono text-zinc-500 text-xs">{profileStudent.id}</span>
              </p>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex items-center gap-2.5">
            {!isCurrentUserProfile && (
              <button
                onClick={() => onToggleFollow(profileStudent, isFollowedByCurrentUser)}
                className={`px-6 py-2.5 rounded-full text-[14px] font-semibold transition-all ${
                  isFollowedByCurrentUser
                    ? 'bg-white/[0.08] hover:bg-red-500/15 text-white hover:text-red-400'
                    : 'bg-white hover:bg-zinc-200 text-black'
                }`}
              >
                {isFollowedByCurrentUser ? 'Following' : 'Follow'}
              </button>
            )}

            <button
              onClick={() => onDeleteStudent(profileStudent)}
              className="p-2.5 rounded-full bg-white/[0.05] hover:bg-red-500/15 text-zinc-400 hover:text-red-400 transition-colors"
              title="Delete Student"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clean Metric Tiles */}
        <div className="grid grid-cols-3 gap-3 mt-8">
          <div className="rounded-2xl bg-[#18181c] border border-white/[0.04] p-4">
            <p className="text-[12px] text-zinc-500 font-medium">Followers</p>
            <p className="text-2xl font-bold text-white mt-1">{followers.length}</p>
          </div>
          <div className="rounded-2xl bg-[#18181c] border border-white/[0.04] p-4">
            <p className="text-[12px] text-zinc-500 font-medium">Following</p>
            <p className="text-2xl font-bold text-white mt-1">{following.length}</p>
          </div>
          <div className="rounded-2xl bg-[#18181c] border border-white/[0.04] p-4">
            <p className="text-[12px] text-zinc-500 font-medium">Posts</p>
            <p className="text-2xl font-bold text-white mt-1">{posts.length}</p>
          </div>
        </div>

        {/* Bio Section */}
        <div className="mt-6 pt-6 border-t border-white/[0.06]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-zinc-500">Bio</span>
            {!editingBio && (
              <button
                onClick={() => setEditingBio(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                <Pencil className="w-3 h-3" />
                Edit bio
              </button>
            )}
          </div>

          {editingBio ? (
            <div className="space-y-3">
              <textarea
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value)}
                rows={3}
                className="w-full rounded-2xl bg-[#18181c] border border-white/15 focus:border-white/30 px-4 py-3 text-[15px] text-white focus:outline-none resize-none"
                placeholder="Write a bio..."
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setBioDraft(profileStudent.bio);
                    setEditingBio(false);
                  }}
                  className="px-4 py-1.5 rounded-full text-xs font-medium bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBio}
                  disabled={savingBio}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-zinc-200 text-black"
                >
                  {savingBio ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[15px] text-zinc-200 leading-relaxed">
              {profileStudent.bio || 'No bio added yet.'}
            </p>
          )}
        </div>
      </div>

      {/* 2-Hop Graph Section: Friends of Friends */}
      <FriendsOfFriendsPanel
        perspectiveStudent={profileStudent}
        recommendations={friendsOfFriends.recommendations}
        rawTwoHopAll={friendsOfFriends.rawTwoHopAll}
        onFollow={(target) => onToggleFollow(target, false)}
        onViewProfile={onSelectStudent}
      />

      {/* Two-Column Layout: Network Connections & Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Following / Followers */}
        <div className="lg:col-span-5">
          <div className="rounded-[24px] bg-[#121215] border border-white/[0.06] p-6">
            {/* Segmented Pill Toggle */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-[#18181c] border border-white/[0.04] mb-5">
              <button
                onClick={() => setActiveRelationTab('following')}
                className={`py-2 px-4 rounded-full text-[13px] font-medium transition-all ${
                  activeRelationTab === 'following'
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Following ({following.length})
              </button>
              <button
                onClick={() => setActiveRelationTab('followers')}
                className={`py-2 px-4 rounded-full text-[13px] font-medium transition-all ${
                  activeRelationTab === 'followers'
                    ? 'bg-white text-black font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Followers ({followers.length})
              </button>
            </div>

            {/* List */}
            <div className="space-y-2">
              {(activeRelationTab === 'following' ? following : followers).length === 0 ? (
                <div className="text-center py-10 text-[13px] text-zinc-500">
                  {activeRelationTab === 'following'
                    ? 'Not following anyone yet.'
                    : 'No followers yet.'}
                </div>
              ) : (
                (activeRelationTab === 'following' ? following : followers).map((s) => {
                  const sTone = getAvatarGradient(s.id);
                  const currentFollowsS = currentUserFollowingIds.has(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => onSelectStudent(s.id)}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl hover:bg-[#18181c] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full ${sTone} border border-white/[0.08] flex items-center justify-center font-semibold text-xs shrink-0`}
                        >
                          {getInitials(s.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-white truncate">
                            {s.name}
                          </p>
                          <p className="text-[12px] text-zinc-500 truncate">
                            {s.branch} · Yr {s.year}
                          </p>
                        </div>
                      </div>

                      {s.id !== currentUser.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFollow(s, currentFollowsS);
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors ${
                            currentFollowsS
                              ? 'bg-white/[0.07] text-zinc-300 hover:bg-red-500/15 hover:text-red-400'
                              : 'bg-white text-black font-semibold hover:bg-zinc-200'
                          }`}
                        >
                          {currentFollowsS ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Posts */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-[24px] bg-[#121215] border border-white/[0.06] p-6">
            <h3 className="text-[16px] font-semibold text-white mb-4">
              Posts ({posts.length})
            </h3>

            {/* Quick Composer */}
            <form onSubmit={handlePostSubmit} className="mb-6">
              <div className="rounded-2xl bg-[#18181c] border border-white/[0.06] focus-within:border-white/20 p-4 transition-colors">
                <textarea
                  rows={2}
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder={`Post an update as ${profileStudent.name.split(' ')[0]}...`}
                  className="w-full bg-transparent text-[15px] text-white placeholder-zinc-500 focus:outline-none resize-none"
                />
                <div className="flex items-center justify-end pt-3 mt-2 border-t border-white/[0.05]">
                  <button
                    type="submit"
                    disabled={posting || !newPostText.trim()}
                    className="px-5 py-2 rounded-full text-xs font-semibold bg-white hover:bg-zinc-200 text-black transition-all disabled:opacity-40"
                  >
                    {posting ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </form>

            {posts.length === 0 ? (
              <div className="text-center py-10 text-[13px] text-zinc-500">
                No posts yet.
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onEditPost={onEditPost}
                    onDeletePost={onDeletePost}
                    onSelectAuthor={onSelectStudent}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
