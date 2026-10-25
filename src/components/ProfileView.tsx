import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  GraduationCap,
  Pencil,
  Check,
  X,
  UserPlus,
  UserCheck,
  Trash2,
  Users,
  MessageSquarePlus,
  Terminal,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import {
  Student,
  Post,
  FriendOfFriendRecommendation,
} from '../lib/db';
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
  const gradient = getAvatarGradient(profileStudent.id);

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
      {/* Top Breadcrumb / Perspective Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBackToStudents}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Campus Directory
        </button>

        {!isCurrentUserProfile && (
          <button
            onClick={() => onSwitchActiveUser(profileStudent.id)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-fuchsia-300 hover:text-white bg-fuchsia-500/10 hover:bg-fuchsia-600/30 px-3.5 py-2 rounded-xl border border-fuchsia-500/30 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Act as {profileStudent.name} (Switch Session Perspective)
          </button>
        )}
      </div>

      {/* Hero Profile Card */}
      <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        {/* Decorative Gradient Banner */}
        <div className={`h-28 bg-gradient-to-r ${gradient} opacity-85 relative`}>
          <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 relative z-10">
            <div className="flex items-end gap-4">
              <div
                className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${gradient} border-4 border-slate-900 flex items-center justify-center text-white font-extrabold text-2xl shadow-xl shrink-0`}
              >
                {getInitials(profileStudent.name)}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl font-bold text-white">{profileStudent.name}</h1>
                  {isCurrentUserProfile && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                      <Sparkles className="w-3 h-3" /> Active Profile
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-slate-400 mt-0.5">{profileStudent.id}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {!isCurrentUserProfile && (
                <button
                  onClick={() => onToggleFollow(profileStudent, isFollowedByCurrentUser)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isFollowedByCurrentUser
                      ? 'bg-emerald-500/15 hover:bg-rose-500/20 text-emerald-300 hover:text-rose-300 border border-emerald-500/30 hover:border-rose-500/40'
                      : 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-lg shadow-fuchsia-950/50'
                  }`}
                >
                  {isFollowedByCurrentUser ? (
                    <>
                      <UserCheck className="w-4 h-4" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Follow {profileStudent.name.split(' ')[0]}
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => onDeleteStudent(profileStudent)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800/90 hover:bg-rose-500/15 text-slate-300 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/30 transition-colors"
                title="Delete Student Record"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Student
              </button>
            </div>
          </div>

          {/* Academic Badges & Graph Stats */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-800 text-cyan-300 border border-slate-700">
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              {profileStudent.branch}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-800 text-purple-300 border border-slate-700">
              <GraduationCap className="w-3.5 h-3.5 text-purple-400" />
              Year {profileStudent.year}
            </span>
            <div className="h-4 w-px bg-slate-800 hidden sm:block" />
            <div className="flex items-center gap-4 text-xs text-slate-300">
              <span>
                <strong className="text-white font-bold">{followers.length}</strong> Followers
              </span>
              <span>
                <strong className="text-white font-bold">{following.length}</strong> Following
              </span>
              <span>
                <strong className="text-white font-bold">{posts.length}</strong> Posts
              </span>
            </div>
          </div>

          {/* Editable Bio Box */}
          <div className="mt-5 rounded-xl bg-slate-950/70 border border-slate-800/90 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Student Bio
              </span>
              {!editingBio && (
                <button
                  onClick={() => setEditingBio(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-fuchsia-400 hover:text-fuchsia-300 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Update Bio
                </button>
              )}
            </div>

            {editingBio ? (
              <div className="space-y-3">
                <textarea
                  value={bioDraft}
                  onChange={(e) => setBioDraft(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-slate-900 border border-fuchsia-500/50 px-3.5 py-2.5 text-sm text-white focus:outline-none"
                  placeholder="Write a campus bio..."
                />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <code className="text-[11px] font-mono text-slate-400">
                    UPDATE {profileStudent.id} SET bio = &quot;...&quot;
                  </code>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setBioDraft(profileStudent.bio);
                        setEditingBio(false);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveBio}
                      disabled={savingBio}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-fuchsia-600 hover:bg-fuchsia-500 text-white"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {savingBio ? 'Updating...' : 'Save Bio'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-200 leading-relaxed">
                {profileStudent.bio || 'No bio set yet. Click "Update Bio" to add one!'}
              </p>
            )}
          </div>
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

      {/* Two-Column Layout: Left = 1-Hop Graph Relationships (Following / Followers), Right = Student's Posts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1-Hop Social Graph Lists */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-fuchsia-400" />
                1-Hop Graph Edges
              </h3>
            </div>

            {/* Tabs for Following vs Followers */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-4">
              <button
                onClick={() => setActiveRelationTab('following')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeRelationTab === 'following'
                    ? 'bg-fuchsia-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Following ({following.length})
              </button>
              <button
                onClick={() => setActiveRelationTab('followers')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeRelationTab === 'followers'
                    ? 'bg-fuchsia-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Followers ({followers.length})
              </button>
            </div>

            {/* SurrealQL Query Indicator */}
            <div className="mb-4 px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800/90 font-mono text-[11px] text-slate-300 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
              <span className="truncate">
                {activeRelationTab === 'following'
                  ? `SELECT ->follows->student FROM ${profileStudent.id}`
                  : `SELECT <-follows<-student FROM ${profileStudent.id}`}
              </span>
            </div>

            {/* List */}
            <div className="space-y-2.5">
              {(activeRelationTab === 'following' ? following : followers).length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl bg-slate-950/40 border border-slate-800/50 text-xs text-slate-400">
                  {activeRelationTab === 'following'
                    ? `${profileStudent.name} isn't following anyone yet.`
                    : `${profileStudent.name} doesn't have any followers yet.`}
                </div>
              ) : (
                (activeRelationTab === 'following' ? following : followers).map((s) => {
                  const sGrad = getAvatarGradient(s.id);
                  const currentFollowsS = currentUserFollowingIds.has(s.id);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div
                        onClick={() => onSelectStudent(s.id)}
                        className="flex items-center gap-3 cursor-pointer group min-w-0"
                      >
                        <div
                          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${sGrad} flex items-center justify-center text-white font-bold text-xs shrink-0`}
                        >
                          {getInitials(s.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-100 group-hover:text-fuchsia-400 truncate">
                            {s.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {s.branch} • Yr {s.year}
                          </p>
                        </div>
                      </div>

                      {s.id !== currentUser.id && (
                        <button
                          onClick={() => onToggleFollow(s, currentFollowsS)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 transition-colors ${
                            currentFollowsS
                              ? 'bg-slate-800 text-slate-300 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700'
                              : 'bg-fuchsia-600/20 text-fuchsia-300 hover:bg-fuchsia-600 hover:text-white border border-fuchsia-500/30'
                          }`}
                        >
                          {currentFollowsS ? 'Unfollow' : 'Follow'}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Student's Authored Posts (`->wrote->post`) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <MessageSquarePlus className="w-4 h-4 text-cyan-400" />
                Posts by {profileStudent.name} ({posts.length})
              </h3>
              <code className="text-[11px] font-mono text-slate-400 hidden sm:inline">
                RELATE {profileStudent.id}-&gt;wrote-&gt;post:uuid
              </code>
            </div>

            {/* Quick Post Composer as this Student */}
            <form onSubmit={handlePostSubmit} className="mb-5">
              <div className="rounded-xl bg-slate-950 border border-slate-800 focus-within:border-fuchsia-500/50 p-3">
                <textarea
                  rows={2}
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                  placeholder={`Publish a new campus post as ${profileStudent.name}...`}
                  className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none"
                />
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80 mt-2">
                  <span className="text-[11px] font-mono text-slate-500 truncate">
                    Author: <strong className="text-fuchsia-400">{profileStudent.id}</strong>
                  </span>
                  <button
                    type="submit"
                    disabled={posting || !newPostText.trim()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow disabled:opacity-50"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    {posting ? 'Publishing...' : 'Publish Post'}
                  </button>
                </div>
              </div>
            </form>

            {/* Posts List */}
            {posts.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-xl bg-slate-950/40 border border-slate-800/50 text-xs text-slate-400">
                No posts authored by {profileStudent.name} yet. Write one above!
              </div>
            ) : (
              <div className="space-y-3.5">
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
