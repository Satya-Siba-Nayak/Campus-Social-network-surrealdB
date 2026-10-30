import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  RotateCcw,
  Terminal,
  Database,
  Users,
  MessageSquare,
  UserCircle,
  ChevronDown,
} from 'lucide-react';
import {
  initDB,
  seedDemoDataIfEmpty,
  getAllStudents,
  createStudent,
  updateStudentBio,
  deleteStudent,
  getAllPosts,
  createPost,
  updatePost,
  deletePost,
  followStudent,
  unfollowStudent,
  getFollowing,
  getFollowers,
  getFriendsOfFriends,
  getAllFollowEdges,
  getRawPostAndWroteTables,
  subscribeQueryLogs,
  getEngineMode,
  Student,
  Post,
  GraphRelationship,
  WroteEdgeRecord,
  PostNodeRecord,
  FriendOfFriendRecommendation,
  QueryLogEntry,
  EngineMode,
} from './lib/db';
import { StudentCard, getAvatarGradient, getInitials } from './components/StudentCard';
import { PostCard } from './components/PostCard';
import { FriendsOfFriendsPanel } from './components/FriendsOfFriendsPanel';
import { ProfileView } from './components/ProfileView';
import { CreateStudentModal } from './components/CreateStudentModal';
import { QueryInspector } from './components/QueryInspector';
import { DatabaseStudioView } from './components/DatabaseStudioView';
import { ToastContainer, ToastMessage } from './components/ToastContainer';

type NavTab = 'students' | 'feed' | 'profile' | 'studio';

export function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [engineMode, setEngineMode] = useState<EngineMode>('indxdb');

  // Database Entities & Raw Tables
  const [students, setStudents] = useState<Student[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followEdges, setFollowEdges] = useState<GraphRelationship[]>([]);
  const [postNodes, setPostNodes] = useState<PostNodeRecord[]>([]);
  const [wroteEdges, setWroteEdges] = useState<WroteEdgeRecord[]>([]);

  const [currentUserId, setCurrentUserId] = useState<string>('student:aarav');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('student:aarav');

  const [profileFollowing, setProfileFollowing] = useState<Student[]>([]);
  const [profileFollowers, setProfileFollowers] = useState<Student[]>([]);
  const [profileFoF, setProfileFoF] = useState<{
    rawTwoHopAll: Student[];
    recommendations: FriendOfFriendRecommendation[];
  }>({ rawTwoHopAll: [], recommendations: [] });

  const [myFoF, setMyFoF] = useState<{
    rawTwoHopAll: Student[];
    recommendations: FriendOfFriendRecommendation[];
  }>({ rawTwoHopAll: [], recommendations: [] });

  const [activeTab, setActiveTab] = useState<NavTab>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [feedAuthorId, setFeedAuthorId] = useState<string>('student:aarav');
  const [feedPostText, setFeedPostText] = useState('');
  const [feedFilter, setFeedFilter] = useState<'all' | 'following'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showQueryConsole, setShowQueryConsole] = useState(true);
  const [busyAction, setBusyAction] = useState(false);

  const [queryLogs, setQueryLogs] = useState<QueryLogEntry[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (type: ToastMessage['type'], title: string, surqlSnippet?: string) => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev, { id, type, title, surqlSnippet }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    return subscribeQueryLogs(setQueryLogs);
  }, []);

  const refreshAllData = useCallback(
    async (activeUid?: string, profileUid?: string, silent = false) => {
      try {
        const [allStudents, allPosts, allEdges, rawTables] = await Promise.all([
          getAllStudents(silent),
          getAllPosts(silent),
          getAllFollowEdges(),
          getRawPostAndWroteTables(),
        ]);

        setStudents(allStudents);
        setPosts(allPosts);
        setFollowEdges(allEdges);
        setPostNodes(rawTables.postNodes);
        setWroteEdges(rawTables.wroteEdges);

        const resolvedCurrentId =
          activeUid && allStudents.some((s) => s.id === activeUid)
            ? activeUid
            : allStudents.some((s) => s.id === currentUserId)
            ? currentUserId
            : allStudents[0]?.id ?? '';

        const resolvedProfileId =
          profileUid && allStudents.some((s) => s.id === profileUid)
            ? profileUid
            : allStudents.some((s) => s.id === selectedProfileId)
            ? selectedProfileId
            : resolvedCurrentId;

        if (resolvedCurrentId !== currentUserId) {
          setCurrentUserId(resolvedCurrentId);
        }
        if (resolvedProfileId !== selectedProfileId) {
          setSelectedProfileId(resolvedProfileId);
        }
        setFeedAuthorId((prev) =>
          allStudents.some((s) => s.id === prev) ? prev : resolvedCurrentId
        );

        if (resolvedProfileId) {
          const [foll, follers, fof] = await Promise.all([
            getFollowing(resolvedProfileId, silent),
            getFollowers(resolvedProfileId, silent),
            getFriendsOfFriends(resolvedProfileId, silent),
          ]);
          setProfileFollowing(foll);
          setProfileFollowers(follers);
          setProfileFoF(fof);
        }

        if (resolvedCurrentId) {
          const fof = await getFriendsOfFriends(resolvedCurrentId, true);
          setMyFoF(fof);
        }
      } catch (err) {
        console.error('Failed to refresh data:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [currentUserId, selectedProfileId]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await initDB('indxdb');
        if (!mounted) return;
        setEngineMode(getEngineMode());
        await refreshAllData('student:aarav', 'student:aarav', false);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to initialize SurrealDB WASM');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loading || !selectedProfileId) return;
    (async () => {
      try {
        const [foll, follers, fof] = await Promise.all([
          getFollowing(selectedProfileId, false),
          getFollowers(selectedProfileId, false),
          getFriendsOfFriends(selectedProfileId, false),
        ]);
        setProfileFollowing(foll);
        setProfileFollowers(follers);
        setProfileFoF(fof);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [selectedProfileId, loading]);

  useEffect(() => {
    if (loading || !currentUserId) return;
    (async () => {
      try {
        const fof = await getFriendsOfFriends(currentUserId, true);
        setMyFoF(fof);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [currentUserId, loading]);

  const currentUser = useMemo(
    () => students.find((s) => s.id === currentUserId) ?? students[0] ?? null,
    [students, currentUserId]
  );

  const selectedProfileStudent = useMemo(
    () => students.find((s) => s.id === selectedProfileId) ?? currentUser,
    [students, selectedProfileId, currentUser]
  );

  const currentUserFollowingIds = useMemo(() => {
    const set = new Set<string>();
    for (const edge of followEdges) {
      if (edge.in === currentUserId) set.add(edge.out);
    }
    return set;
  }, [followEdges, currentUserId]);

  const currentUserFollowerIds = useMemo(() => {
    const set = new Set<string>();
    for (const edge of followEdges) {
      if (edge.out === currentUserId) set.add(edge.in);
    }
    return set;
  }, [followEdges, currentUserId]);

  const currentUserFoFIds = useMemo(() => {
    return new Set(myFoF.recommendations.map((r) => r.student.id));
  }, [myFoF]);

  const followCountsByStudent = useMemo(() => {
    const map = new Map<string, { followers: number; following: number }>();
    for (const s of students) {
      map.set(s.id, { followers: 0, following: 0 });
    }
    for (const edge of followEdges) {
      const fromEntry = map.get(edge.in);
      if (fromEntry) fromEntry.following += 1;
      const toEntry = map.get(edge.out);
      if (toEntry) toEntry.followers += 1;
    }
    return map;
  }, [students, followEdges]);

  const branches = useMemo(() => {
    const bSet = new Set(students.map((s) => s.branch));
    return ['ALL', ...Array.from(bSet)];
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesBranch = branchFilter === 'ALL' || s.branch === branchFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q) ||
        s.bio.toLowerCase().includes(q);
      return matchesBranch && matchesSearch;
    });
  }, [students, branchFilter, searchQuery]);

  const filteredPosts = useMemo(() => {
    if (feedFilter === 'all') return posts;
    return posts.filter(
      (p) => p.author_id === currentUserId || currentUserFollowingIds.has(p.author_id)
    );
  }, [posts, feedFilter, currentUserId, currentUserFollowingIds]);

  const selectedProfilePosts = useMemo(
    () => posts.filter((p) => p.author_id === selectedProfileStudent?.id),
    [posts, selectedProfileStudent]
  );

  // Handlers
  const handleSwitchEngine = async (targetMode: EngineMode) => {
    if (targetMode === engineMode) return;
    setLoading(true);
    try {
      await initDB(targetMode);
      setEngineMode(getEngineMode());
      await refreshAllData('student:aarav', 'student:aarav', true);
      addToast(
        'info',
        `Switched storage to ${targetMode === 'indxdb' ? 'IndexedDB' : 'Memory'}`
      );
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to switch engine');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDemoData = async () => {
    setBusyAction(true);
    try {
      await seedDemoDataIfEmpty(undefined, true);
      await refreshAllData('student:aarav', 'student:aarav', true);
      setCurrentUserId('student:aarav');
      setSelectedProfileId('student:aarav');
      addToast('info', 'Reset & re-seeded all 4 database tables');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setBusyAction(false);
    }
  };

  const handleCreateStudent = async (data: {
    slug?: string;
    name: string;
    branch: string;
    year: number;
    bio: string;
  }) => {
    setBusyAction(true);
    try {
      const created = await createStudent(data);
      await refreshAllData(undefined, undefined, true);
      addToast('success', `CREATE ${created.id} (${created.name})`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to create student');
    } finally {
      setBusyAction(false);
    }
  };

  const handleUpdateBio = async (studentId: string, newBio: string) => {
    setBusyAction(true);
    try {
      const updated = await updateStudentBio(studentId, newBio);
      await refreshAllData(undefined, undefined, true);
      addToast('success', `UPDATE ${updated.id} SET bio`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to update bio');
    } finally {
      setBusyAction(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    setBusyAction(true);
    try {
      await deleteStudent(student.id);
      const remaining = students.filter((s) => s.id !== student.id);
      const nextUserId =
        currentUserId === student.id ? remaining[0]?.id ?? '' : currentUserId;
      const nextProfileId =
        selectedProfileId === student.id ? nextUserId : selectedProfileId;

      await refreshAllData(nextUserId, nextProfileId, true);
      if (selectedProfileId === student.id && activeTab === 'profile') {
        setActiveTab('students');
      }
      addToast('info', `DELETE ${student.id} & cascaded edges`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to delete student');
    } finally {
      setBusyAction(false);
    }
  };

  const handleToggleFollow = async (
    targetStudent: Student,
    isCurrentlyFollowing: boolean
  ) => {
    if (!currentUser) return;
    setBusyAction(true);
    try {
      if (isCurrentlyFollowing) {
        await unfollowStudent(currentUser.id, targetStudent.id);
        addToast('info', `Unfollowed ${targetStudent.id}`);
      } else {
        await followStudent(currentUser.id, targetStudent.id);
        addToast('success', `RELATE ${currentUser.id}->follows->${targetStudent.id}`);
      }
      await refreshAllData(undefined, undefined, true);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyAction(false);
    }
  };

  const handleUnfollowDirect = async (fromId: string, toId: string) => {
    setBusyAction(true);
    try {
      await unfollowStudent(fromId, toId);
      await refreshAllData(undefined, undefined, true);
      addToast('info', `DELETE edge ${fromId}->follows->${toId}`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to delete edge');
    } finally {
      setBusyAction(false);
    }
  };

  const handleCreatePost = async (authorId: string, text: string) => {
    setBusyAction(true);
    try {
      const created = await createPost(authorId, text);
      await refreshAllData(undefined, undefined, true);
      addToast('success', `RELATE ${authorId}->wrote->${created.id}`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setBusyAction(false);
    }
  };

  const handleFeedPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedPostText.trim() || !feedAuthorId) return;
    await handleCreatePost(feedAuthorId, feedPostText.trim());
    setFeedPostText('');
  };

  const handleEditPost = async (postId: string, newText: string) => {
    setBusyAction(true);
    try {
      await updatePost(postId, newText);
      await refreshAllData(undefined, undefined, true);
      addToast('success', `UPDATE ${postId} SET text`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to update post');
    } finally {
      setBusyAction(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    setBusyAction(true);
    try {
      await deletePost(postId);
      await refreshAllData(undefined, undefined, true);
      addToast('info', `DELETE ${postId}`);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to delete post');
    } finally {
      setBusyAction(false);
    }
  };

  const handleViewProfile = (studentId: string) => {
    setSelectedProfileId(studentId);
    setActiveTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin mb-4" />
        <p className="text-sm font-medium text-zinc-400">Starting SurrealDB WASM Engine...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full rounded-[28px] bg-[#121215] border border-white/10 p-7 text-center space-y-4">
          <h2 className="text-lg font-semibold text-white">Initialization Error</h2>
          <p className="text-xs text-zinc-400 font-mono bg-black/60 p-3.5 rounded-2xl border border-white/[0.06]">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-semibold transition-colors"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/85 border-b border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: Brand */}
          <div
            onClick={() => setActiveTab('students')}
            className="flex items-center gap-3 cursor-pointer shrink-0"
          >
            <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-sm tracking-tighter">
              C
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-[16px] tracking-tight text-white block leading-none">
                CampusGraph
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                SurrealDB WASM (campus.social)
              </span>
            </div>
          </div>

          {/* Center: 4 Clear Navigation Pills */}
          <nav className="flex items-center p-1 rounded-full bg-[#121215] border border-white/[0.07] overflow-x-auto">
            <button
              onClick={() => setActiveTab('students')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] font-medium transition-all whitespace-nowrap ${
                activeTab === 'students'
                  ? 'bg-white text-black font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Students ({students.length})
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] font-medium transition-all whitespace-nowrap ${
                activeTab === 'feed'
                  ? 'bg-white text-black font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Feed ({posts.length})
            </button>
            <button
              onClick={() => {
                if (currentUser) setSelectedProfileId(currentUser.id);
                setActiveTab('profile');
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] font-medium transition-all whitespace-nowrap ${
                activeTab === 'profile'
                  ? 'bg-white text-black font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <UserCircle className="w-3.5 h-3.5" />
              My Profile
            </button>
            <button
              onClick={() => setActiveTab('studio')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] font-medium transition-all whitespace-nowrap ${
                activeTab === 'studio'
                  ? 'bg-emerald-400 text-black font-semibold'
                  : 'text-emerald-400 hover:text-emerald-300'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              DB &amp; Graph Studio
            </button>
          </nav>

          {/* Right: Active User Perspective Switcher & Live Log Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {currentUser && (
              <div className="relative hidden md:flex items-center">
                <div
                  className={`w-5 h-5 rounded-full ${getAvatarGradient(
                    currentUser.id
                  )} flex items-center justify-center text-[9px] font-semibold absolute left-2.5 pointer-events-none`}
                >
                  {getInitials(currentUser.name)}
                </div>
                <select
                  value={currentUser.id}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setCurrentUserId(newId);
                    setFeedAuthorId(newId);
                    if (activeTab === 'profile') setSelectedProfileId(newId);
                  }}
                  title="Switch Active Student Perspective"
                  className="appearance-none bg-[#121215] hover:bg-[#18181c] text-xs font-medium text-zinc-200 border border-white/[0.08] rounded-full pl-9 pr-7 py-1.5 focus:outline-none cursor-pointer transition-colors"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#121215] text-white">
                      Acting as: {s.name} ({s.id})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 pointer-events-none" />
              </div>
            )}

            <button
              onClick={() => setShowQueryConsole((v) => !v)}
              title="Toggle Live SurrealQL Log"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                showQueryConsole
                  ? 'bg-white text-black border-white font-semibold'
                  : 'bg-[#121215] text-zinc-400 border-white/[0.08] hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">SQL Log ({queryLogs.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-7 space-y-7">
        {/* Live SurrealQL & Function Execution Drawer (Visible by default for Faculty Demo) */}
        {showQueryConsole && (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-zinc-400">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-zinc-300">WASM Storage Engine:</span>
                <button
                  onClick={() => handleSwitchEngine('indxdb')}
                  className={`px-3 py-1 rounded-full font-mono text-[11px] transition-colors ${
                    engineMode === 'indxdb'
                      ? 'bg-white text-black font-semibold'
                      : 'bg-[#121215] text-zinc-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  indxdb://campus-social (Persistent)
                </button>
                <button
                  onClick={() => handleSwitchEngine('mem')}
                  className={`px-3 py-1 rounded-full font-mono text-[11px] transition-colors ${
                    engineMode === 'mem'
                      ? 'bg-white text-black font-semibold'
                      : 'bg-[#121215] text-zinc-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  mem:// (In-Memory)
                </button>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab('studio')}
                  className="text-emerald-400 hover:underline font-medium"
                >
                  Open Full Tables &amp; Graph Studio →
                </button>
                <button
                  onClick={handleResetDemoData}
                  disabled={busyAction}
                  className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Demo Seed
                </button>
              </div>
            </div>
            <QueryInspector logs={queryLogs} engineMode={engineMode} />
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: STUDENTS                                                */}
        {/* ============================================================== */}
        {activeTab === 'students' && (
          <div className="space-y-7">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Table: student ({students.length} records) · Edge Table: follows ({followEdges.length} edges)
                </p>
                <h1 className="text-3xl font-bold text-white tracking-tight mt-1">
                  Campus Students
                </h1>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setActiveTab('studio')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-semibold bg-[#121215] hover:bg-[#1a1a1f] text-emerald-400 border border-emerald-500/30 transition-colors"
                >
                  <Database className="w-4 h-4" />
                  View DB Tables &amp; Graph
                </button>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-semibold bg-white hover:bg-zinc-200 text-black transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Create Student
                </button>
              </div>
            </div>

            {/* 2-Hop Friends of Friends Section */}
            {currentUser && (
              <FriendsOfFriendsPanel
                perspectiveStudent={currentUser}
                recommendations={myFoF.recommendations}
                rawTwoHopAll={myFoF.rawTwoHopAll}
                onFollow={(target) => handleToggleFollow(target, false)}
                onViewProfile={handleViewProfile}
                busy={busyAction}
              />
            )}

            {/* Search & Branch Filter */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search students by name, record ID (student:aarav), branch, or bio..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#121215] border border-white/[0.07] focus:border-white/25 text-[14px] text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {branches.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBranchFilter(b)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      branchFilter === b
                        ? 'bg-white text-black font-semibold'
                        : 'bg-[#121215] text-zinc-400 hover:text-white border border-white/[0.06]'
                    }`}
                  >
                    {b === 'ALL' ? 'All branches' : b}
                  </button>
                ))}
              </div>
            </div>

            {/* Students Grid */}
            {filteredStudents.length === 0 ? (
              <div className="rounded-[24px] bg-[#121215] border border-white/[0.07] p-12 text-center space-y-2">
                <p className="text-[15px] font-medium text-zinc-300">No students found</p>
                <p className="text-[13px] text-zinc-500">
                  Try clearing your search or create a new student.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredStudents.map((st) => {
                  const counts = followCountsByStudent.get(st.id) ?? {
                    followers: 0,
                    following: 0,
                  };
                  return (
                    <StudentCard
                      key={st.id}
                      student={st}
                      currentUserId={currentUser?.id ?? ''}
                      isFollowing={currentUserFollowingIds.has(st.id)}
                      followsYou={currentUserFollowerIds.has(st.id)}
                      followersCount={counts.followers}
                      followingCount={counts.following}
                      onToggleFollow={handleToggleFollow}
                      onViewProfile={handleViewProfile}
                      onDeleteStudent={handleDeleteStudent}
                      busy={busyAction}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: FEED                                                    */}
        {/* ============================================================== */}
        {activeTab === 'feed' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Table: post ({postNodes.length}) · Graph Edge Table: wrote ({wroteEdges.length})
                </p>
                <h1 className="text-3xl font-bold text-white tracking-tight mt-1">
                  Campus Post Feed
                </h1>
              </div>

              <div className="inline-flex p-1 rounded-full bg-[#121215] border border-white/[0.07]">
                <button
                  onClick={() => setFeedFilter('all')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    feedFilter === 'all'
                      ? 'bg-white text-black font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All Posts ({posts.length})
                </button>
                <button
                  onClick={() => setFeedFilter('following')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    feedFilter === 'following'
                      ? 'bg-white text-black font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Following Only
                </button>
              </div>
            </div>

            {/* Composer Card */}
            <form
              onSubmit={handleFeedPostSubmit}
              className="rounded-[24px] bg-[#121215] border border-white/[0.07] p-6 space-y-4"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-400">Author Student:</span>
                  <select
                    value={feedAuthorId}
                    onChange={(e) => setFeedAuthorId(e.target.value)}
                    className="rounded-full bg-[#18181c] border border-white/[0.08] px-3.5 py-1.5 text-xs font-semibold text-white focus:outline-none"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#121215]">
                        {s.name} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>
                <code className="text-[11px] font-mono text-sky-400">
                  RELATE {feedAuthorId}-&gt;wrote-&gt;post:uuid SET text = &quot;...&quot;, created_at = time::now()
                </code>
              </div>

              <textarea
                rows={3}
                value={feedPostText}
                onChange={(e) => setFeedPostText(e.target.value)}
                placeholder="Write a campus post..."
                className="w-full rounded-2xl bg-[#18181c] border border-white/[0.06] focus:border-white/20 p-4 text-[15px] text-white placeholder-zinc-500 focus:outline-none resize-none"
              />

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={busyAction || !feedPostText.trim() || !feedAuthorId}
                  className="px-6 py-2 rounded-full text-xs font-semibold bg-white hover:bg-zinc-200 text-black transition-all disabled:opacity-40"
                >
                  Create Post (RELATE)
                </button>
              </div>
            </form>

            {/* Posts List */}
            {filteredPosts.length === 0 ? (
              <div className="rounded-[24px] bg-[#121215] border border-white/[0.07] p-12 text-center space-y-1">
                <p className="text-[15px] font-medium text-zinc-300">No posts in this feed</p>
                <p className="text-[13px] text-zinc-500">
                  {feedFilter === 'following'
                    ? 'Follow more students or switch to All Posts.'
                    : 'Publish a post above.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onEditPost={handleEditPost}
                    onDeletePost={handleDeletePost}
                    onSelectAuthor={handleViewProfile}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: PROFILE                                                 */}
        {/* ============================================================== */}
        {activeTab === 'profile' && selectedProfileStudent && currentUser && (
          <ProfileView
            profileStudent={selectedProfileStudent}
            currentUser={currentUser}
            following={profileFollowing}
            followers={profileFollowers}
            friendsOfFriends={profileFoF}
            posts={selectedProfilePosts}
            currentUserFollowingIds={currentUserFollowingIds}
            onUpdateBio={handleUpdateBio}
            onDeleteStudent={handleDeleteStudent}
            onToggleFollow={handleToggleFollow}
            onCreatePost={handleCreatePost}
            onEditPost={handleEditPost}
            onDeletePost={handleDeletePost}
            onSelectStudent={handleViewProfile}
            onSwitchActiveUser={(studentId) => {
              setCurrentUserId(studentId);
              setFeedAuthorId(studentId);
              setSelectedProfileId(studentId);
              const st = students.find((s) => s.id === studentId);
              if (st) addToast('info', `Switched active perspective to ${st.name}`);
            }}
            onBackToStudents={() => setActiveTab('students')}
          />
        )}

        {/* ============================================================== */}
        {/* TAB 4: DATABASE & GRAPH STUDIO (FACULTY DEMO VIEW)             */}
        {/* ============================================================== */}
        {activeTab === 'studio' && (
          <DatabaseStudioView
            students={students}
            followEdges={followEdges}
            wroteEdges={wroteEdges}
            postNodes={postNodes}
            currentUserId={currentUser?.id ?? ''}
            followingIds={currentUserFollowingIds}
            followerIds={currentUserFollowerIds}
            fofIds={currentUserFoFIds}
            onSelectStudent={handleViewProfile}
            onDeleteStudent={handleDeleteStudent}
            onDeletePost={handleDeletePost}
            onUnfollow={handleUnfollowDirect}
            onRefreshAll={async () => {
              await refreshAllData(undefined, undefined, true);
            }}
          />
        )}
      </main>

      <CreateStudentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateStudent}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
