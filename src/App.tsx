import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users,
  MessageSquare,
  UserCircle,
  Database,
  Plus,
  Search,
  RefreshCw,
  Terminal,
  Sparkles,
  Send,
  Network,
  Filter,
  HardDrive,
  Cpu,
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
  subscribeQueryLogs,
  getEngineMode,
  Student,
  Post,
  GraphRelationship,
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
import { ToastContainer, ToastMessage } from './components/ToastContainer';

type NavTab = 'students' | 'feed' | 'profile';

export function App() {
  // Core Database State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [engineMode, setEngineMode] = useState<EngineMode>('indxdb');

  // Entities
  const [students, setStudents] = useState<Student[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followEdges, setFollowEdges] = useState<GraphRelationship[]>([]);

  // Active Session Student ("My Profile" perspective) & Currently Viewed Profile Student
  const [currentUserId, setCurrentUserId] = useState<string>('student:alice');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('student:alice');

  // Graph state for the currently viewed profile (or active user)
  const [profileFollowing, setProfileFollowing] = useState<Student[]>([]);
  const [profileFollowers, setProfileFollowers] = useState<Student[]>([]);
  const [profileFoF, setProfileFoF] = useState<{
    rawTwoHopAll: Student[];
    recommendations: FriendOfFriendRecommendation[];
  }>({ rawTwoHopAll: [], recommendations: [] });

  // Active user's own 2-hop Friends of Friends (for Students & Feed sidebar showcase)
  const [myFoF, setMyFoF] = useState<{
    rawTwoHopAll: Student[];
    recommendations: FriendOfFriendRecommendation[];
  }>({ rawTwoHopAll: [], recommendations: [] });

  // UI Navigation & Filters
  const [activeTab, setActiveTab] = useState<NavTab>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [feedAuthorId, setFeedAuthorId] = useState<string>('student:alice');
  const [feedPostText, setFeedPostText] = useState('');
  const [feedFilter, setFeedFilter] = useState<'all' | 'following'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showQueryConsole, setShowQueryConsole] = useState(true);
  const [busyAction, setBusyAction] = useState(false);

  // Live SurrealQL Logs & Toasts
  const [queryLogs, setQueryLogs] = useState<QueryLogEntry[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (type: ToastMessage['type'], title: string, surqlSnippet?: string) => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev, { id, type, title, surqlSnippet }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    return subscribeQueryLogs(setQueryLogs);
  }, []);

  // Load all data from SurrealDB WASM
  const refreshAllData = useCallback(
    async (activeUid?: string, profileUid?: string) => {
      try {
        const [allStudents, allPosts, allEdges] = await Promise.all([
          getAllStudents(),
          getAllPosts(),
          getAllFollowEdges(),
        ]);

        setStudents(allStudents);
        setPosts(allPosts);
        setFollowEdges(allEdges);

        // Ensure currentUserId and selectedProfileId point to valid students
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
            getFollowing(resolvedProfileId),
            getFollowers(resolvedProfileId),
            getFriendsOfFriends(resolvedProfileId),
          ]);
          setProfileFollowing(foll);
          setProfileFollowers(follers);
          setProfileFoF(fof);
        }

        if (resolvedCurrentId) {
          if (resolvedCurrentId === resolvedProfileId) {
            // Avoid duplicate query if same student
            const fof = await getFriendsOfFriends(resolvedCurrentId);
            setMyFoF(fof);
          } else {
            const fof = await getFriendsOfFriends(resolvedCurrentId);
            setMyFoF(fof);
          }
        }
      } catch (err) {
        console.error('Failed to refresh data:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [currentUserId, selectedProfileId]
  );

  // Initial WASM Engine Boot
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await initDB('indxdb');
        if (!mounted) return;
        setEngineMode(getEngineMode());
        await refreshAllData('student:alice', 'student:alice');
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

  // Re-run profile graph queries when selectedProfileId changes
  useEffect(() => {
    if (loading || !selectedProfileId) return;
    (async () => {
      try {
        const [foll, follers, fof] = await Promise.all([
          getFollowing(selectedProfileId),
          getFollowers(selectedProfileId),
          getFriendsOfFriends(selectedProfileId),
        ]);
        setProfileFollowing(foll);
        setProfileFollowers(follers);
        setProfileFoF(fof);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [selectedProfileId, loading]);

  // Re-run active user's 2-hop Friends-of-Friends when currentUserId changes
  useEffect(() => {
    if (loading || !currentUserId) return;
    (async () => {
      try {
        const fof = await getFriendsOfFriends(currentUserId);
        setMyFoF(fof);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [currentUserId, loading]);

  // Derived Maps & Sets
  const currentUser = useMemo(
    () => students.find((s) => s.id === currentUserId) ?? students[0] ?? null,
    [students, currentUserId]
  );

  const selectedProfileStudent = useMemo(
    () => students.find((s) => s.id === selectedProfileId) ?? currentUser,
    [students, selectedProfileId, currentUser]
  );

  // Set of student IDs that `currentUser` follows
  const currentUserFollowingIds = useMemo(() => {
    const set = new Set<string>();
    for (const edge of followEdges) {
      if (edge.in === currentUserId) {
        set.add(edge.out);
      }
    }
    return set;
  }, [followEdges, currentUserId]);

  // Set of student IDs that follow `currentUser`
  const currentUserFollowerIds = useMemo(() => {
    const set = new Set<string>();
    for (const edge of followEdges) {
      if (edge.out === currentUserId) {
        set.add(edge.in);
      }
    }
    return set;
  }, [followEdges, currentUserId]);

  // Counts map per student
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

  // Filtered Students
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

  // Filtered Feed Posts
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

  // ============================================================================
  // ACTION HANDLERS WITH TOAST NOTIFICATIONS
  // ============================================================================

  const handleSwitchEngine = async (targetMode: EngineMode) => {
    if (targetMode === engineMode) return;
    setLoading(true);
    try {
      await initDB(targetMode);
      setEngineMode(getEngineMode());
      await refreshAllData('student:alice', 'student:alice');
      addToast(
        'info',
        `Switched WASM storage engine to ${
          targetMode === 'indxdb' ? 'IndexedDB (Persistent)' : 'In-Memory (mem://)'
        }`,
        `CONNECT ${targetMode === 'indxdb' ? 'indxdb://campus-social' : 'mem://'}; USE NS campus DB social;`
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
      await refreshAllData('student:alice', 'student:alice');
      setCurrentUserId('student:alice');
      setSelectedProfileId('student:alice');
      addToast(
        'info',
        'Reset & re-seeded campus graph database with 6 students, follows, and posts',
        'DELETE student; DELETE post; DELETE follows; DELETE wrote; -- Re-seeded'
      );
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
      await refreshAllData();
      addToast(
        'success',
        `Created student ${created.name} (${created.id})`,
        `CREATE ${created.id} SET name = "${created.name}", branch = "${created.branch}", year = ${created.year}`
      );
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
      await refreshAllData();
      addToast(
        'success',
        `Updated bio for ${updated.name}`,
        `UPDATE ${studentId} SET bio = "${newBio.slice(0, 40)}${newBio.length > 40 ? '...' : ''}"`
      );
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

      await refreshAllData(nextUserId, nextProfileId);
      if (selectedProfileId === student.id && activeTab === 'profile') {
        setActiveTab('students');
      }
      addToast(
        'info',
        `Deleted ${student.name} and cleaned up connected graph edges`,
        `DELETE ${student.id}; DELETE follows WHERE in = ${student.id} OR out = ${student.id};`
      );
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
        addToast(
          'info',
          `${currentUser.name} unfollowed ${targetStudent.name}`,
          `DELETE follows WHERE in = ${currentUser.id} AND out = ${targetStudent.id}`
        );
      } else {
        await followStudent(currentUser.id, targetStudent.id);
        addToast(
          'success',
          `${currentUser.name} followed ${targetStudent.name}`,
          `RELATE ${currentUser.id}->follows->${targetStudent.id}`
        );
      }
      await refreshAllData();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Follow action failed');
    } finally {
      setBusyAction(false);
    }
  };

  const handleCreatePost = async (authorId: string, text: string) => {
    setBusyAction(true);
    try {
      const created = await createPost(authorId, text);
      await refreshAllData();
      addToast(
        'success',
        `Published post by ${created.author_name}`,
        `RELATE ${authorId}->wrote->${created.id} SET text = "...", created_at = time::now()`
      );
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
      await refreshAllData();
      addToast(
        'success',
        `Updated post ${postId}`,
        `UPDATE ${postId} SET text = "${newText.slice(0, 35)}..."`
      );
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
      await refreshAllData();
      addToast('info', `Deleted post ${postId}`, `DELETE ${postId}; DELETE wrote WHERE out = ${postId};`);
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

  // ============================================================================
  // RENDER LOADING OR ERROR STATES
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-fuchsia-600 to-purple-700 shadow-2xl shadow-fuchsia-950/60 mb-6 animate-pulse">
          <Database className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Booting SurrealDB WebAssembly Engine...
        </h1>
        <p className="text-sm text-slate-400 mt-2 max-w-md text-center">
          Initializing <code className="text-fuchsia-300 font-mono">@surrealdb/wasm</code> in your browser, mounting namespace{' '}
          <code className="text-cyan-300 font-mono">campus</code> &amp; database{' '}
          <code className="text-cyan-300 font-mono">social</code>.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl bg-slate-900 border border-rose-500/40 p-6 text-center space-y-4">
          <h2 className="text-lg font-bold text-rose-400">
            Database Initialization Error
          </h2>
          <p className="text-sm text-slate-300 font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-semibold"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-fuchsia-500/30">
      {/* Decorative Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-slate-950/85 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo + Engine Pill */}
          <div className="flex items-center gap-3">
            <div
              onClick={() => setActiveTab('students')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-600 to-purple-600 flex items-center justify-center shadow-lg shadow-fuchsia-950/50 group-hover:scale-105 transition-transform">
                <Network className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-white">
                    Campus<span className="text-fuchsia-400">Graph</span>
                  </span>
                  <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
                    SurrealDB WASM
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400 hidden sm:block">
                  NS: <span className="text-cyan-400">campus</span> • DB:{' '}
                  <span className="text-cyan-400">social</span>
                </p>
              </div>
            </div>
          </div>

          {/* Primary Navigation: Students | Feed | My Profile */}
          <nav className="flex items-center gap-1 sm:gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('students')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'students'
                  ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Students</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/25 text-slate-200">
                {students.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('feed')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'feed'
                  ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Feed</span>
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-black/25 text-slate-200">
                {posts.length}
              </span>
            </button>

            <button
              onClick={() => {
                if (currentUser) setSelectedProfileId(currentUser.id);
                setActiveTab('profile');
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <UserCircle className="w-4 h-4" />
              <span>My Profile</span>
            </button>
          </nav>

          {/* Right Controls: Active User Perspective Switcher & SQL Console Toggle */}
          <div className="flex items-center gap-2.5">
            {/* Active Student Identity Switcher */}
            {currentUser && (
              <div className="hidden lg:flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
                <span className="text-[11px] text-slate-400 font-medium">Acting as:</span>
                <select
                  value={currentUser.id}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setCurrentUserId(newId);
                    setFeedAuthorId(newId);
                    if (activeTab === 'profile') {
                      setSelectedProfileId(newId);
                    }
                    const st = students.find((s) => s.id === newId);
                    if (st) {
                      addToast(
                        'info',
                        `Switched active perspective to ${st.name} (${st.id})`,
                        `SELECT ->follows->follows->student FROM ${st.id}`
                      );
                    }
                  }}
                  className="bg-slate-950 text-xs font-semibold text-fuchsia-300 border border-slate-800 rounded-lg px-2 py-1 focus:outline-none focus:border-fuchsia-500"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => setShowQueryConsole((v) => !v)}
              title="Toggle Live SurrealQL Inspector"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                showQueryConsole
                  ? 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span className="hidden sm:inline">SurrealQL</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sub-header Bar: Engine Storage Mode + Mobile Perspective Selector + Reset Seed Button */}
      <div className="relative z-20 bg-slate-900/50 border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-fuchsia-400" />
              WASM Engine:
            </span>
            <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
              <button
                onClick={() => handleSwitchEngine('indxdb')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  engineMode === 'indxdb'
                    ? 'bg-fuchsia-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <HardDrive className="w-3 h-3" />
                indxdb://campus-social
              </button>
              <button
                onClick={() => handleSwitchEngine('mem')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                  engineMode === 'mem'
                    ? 'bg-fuchsia-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3 h-3" />
                mem://
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile Acting-As Selector */}
            {currentUser && (
              <div className="flex lg:hidden items-center gap-1.5">
                <span className="text-[11px] text-slate-400">You:</span>
                <select
                  value={currentUser.id}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setCurrentUserId(newId);
                    setFeedAuthorId(newId);
                    if (activeTab === 'profile') setSelectedProfileId(newId);
                  }}
                  className="bg-slate-950 text-xs font-semibold text-fuchsia-300 border border-slate-800 rounded-lg px-2 py-1"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleResetDemoData}
              disabled={busyAction}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-fuchsia-300 transition-colors"
              title="Reset and re-seed default demo students, follows, and posts"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busyAction ? 'animate-spin' : ''}`} />
              Reset Demo Seed
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Primary Viewport */}
          <div className={showQueryConsole ? 'xl:col-span-8 space-y-6' : 'xl:col-span-12 space-y-6'}>
            {/* ============================================================== */}
            {/* TAB 1: STUDENTS DIRECTORY + FRIENDS OF FRIENDS GRAPH SHOWCASE */}
            {/* ============================================================== */}
            {activeTab === 'students' && (
              <div className="space-y-6">
                {/* Directory Hero & Action Bar */}
                <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 sm:p-6 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-white">
                        Campus Student Directory
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        Browse students, manage profiles, or follow peers to build the campus graph.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-lg shadow-fuchsia-950/50 transition-all shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Add Student
                    </button>
                  </div>

                  {/* Search & Branch Filter */}
                  <div className="mt-5 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search students by name, record ID (student:alice), branch, or bio..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-fuchsia-500 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
                      <select
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value)}
                        className="w-full sm:w-auto rounded-xl bg-slate-950 border border-slate-800 focus:border-fuchsia-500 px-3.5 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none"
                      >
                        {branches.map((b) => (
                          <option key={b} value={b}>
                            {b === 'ALL' ? 'All Branches' : b}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2-Hop Friends of Friends Highlight for Current User */}
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

                {/* Students Grid */}
                {filteredStudents.length === 0 ? (
                  <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-12 text-center space-y-3">
                    <Users className="w-10 h-10 text-slate-600 mx-auto" />
                    <h3 className="text-base font-semibold text-slate-200">
                      No matching students found
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Try clearing your search filter or add a new student to the campus database.
                    </p>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-fuchsia-600 text-white"
                    >
                      <Plus className="w-4 h-4" />
                      Create Student
                    </button>
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
            {/* TAB 2: CAMPUS POST FEED                                        */}
            {/* ============================================================== */}
            {activeTab === 'feed' && (
              <div className="space-y-6">
                {/* Post Composer Card */}
                <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-5 sm:p-6 shadow-lg">
                  <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                    <div>
                      <h1 className="text-xl font-bold text-white">Campus Feed</h1>
                      <p className="text-xs text-slate-400">
                        Every post is linked to its author via a SurrealDB{' '}
                        <code className="text-fuchsia-300 font-mono">
                          RELATE student-&gt;wrote-&gt;post
                        </code>{' '}
                        graph edge.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleFeedPostSubmit} className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Post Author:
                      </label>
                      <select
                        value={feedAuthorId}
                        onChange={(e) => setFeedAuthorId(e.target.value)}
                        className="rounded-xl bg-slate-950 border border-slate-800 focus:border-fuchsia-500 px-3 py-1.5 text-xs font-semibold text-fuchsia-300 focus:outline-none"
                      >
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.id}) — {s.branch}
                          </option>
                        ))}
                      </select>
                    </div>

                    <textarea
                      rows={3}
                      value={feedPostText}
                      onChange={(e) => setFeedPostText(e.target.value)}
                      placeholder="Share a research update, hackathon invite, study group, or campus announcement..."
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 focus:border-fuchsia-500 p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <code className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        RELATE {feedAuthorId || 'student:alice'}-&gt;wrote-&gt;post:uuid SET text = &quot;...&quot;, created_at = time::now()
                      </code>
                      <button
                        type="submit"
                        disabled={busyAction || !feedPostText.trim() || !feedAuthorId}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-lg shadow-fuchsia-950/50 transition-all disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        Publish Post
                      </button>
                    </div>
                  </form>
                </div>

                {/* Feed Filter Tabs */}
                <div className="flex items-center justify-between gap-4">
                  <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800">
                    <button
                      onClick={() => setFeedFilter('all')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        feedFilter === 'all'
                          ? 'bg-fuchsia-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All Campus Posts ({posts.length})
                    </button>
                    <button
                      onClick={() => setFeedFilter('following')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        feedFilter === 'following'
                          ? 'bg-fuchsia-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Following Feed ({currentUser?.name.split(' ')[0]})
                    </button>
                  </div>
                </div>

                {/* Posts List */}
                {filteredPosts.length === 0 ? (
                  <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-12 text-center space-y-2">
                    <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
                    <h3 className="text-base font-semibold text-slate-200">
                      No posts in this feed yet
                    </h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {feedFilter === 'following'
                        ? 'Follow more students or switch to "All Campus Posts" to see activity across the campus.'
                        : 'Use the composer above to publish the first campus post!'}
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
            {/* TAB 3: STUDENT PROFILE + 1-HOP & 2-HOP GRAPH                   */}
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
                  if (st) {
                    addToast(
                      'info',
                      `Now acting as ${st.name}`,
                      `SELECT ->follows->follows->student FROM ${st.id}`
                    );
                  }
                }}
                onBackToStudents={() => setActiveTab('students')}
              />
            )}
          </div>

          {/* Right Sidebar: Live SurrealQL Inspector + Quick Graph Summary */}
          {showQueryConsole && (
            <aside className="xl:col-span-4 space-y-6 xl:sticky xl:top-20">
              {/* Active Session Card */}
              {currentUser && (
                <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 shadow-xl">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-fuchsia-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Active Session Identity
                    </span>
                    <button
                      onClick={() => handleViewProfile(currentUser.id)}
                      className="text-xs text-slate-400 hover:text-white underline"
                    >
                      View My Profile
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarGradient(
                        currentUser.id
                      )} flex items-center justify-center text-white font-bold text-sm shrink-0`}
                    >
                      {getInitials(currentUser.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white truncate">
                        {currentUser.name}
                      </p>
                      <p className="text-xs font-mono text-slate-400 truncate">
                        {currentUser.id} • {currentUser.branch}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center">
                    <div className="bg-slate-950/70 rounded-xl p-2 border border-slate-800/70">
                      <p className="text-sm font-bold text-white">
                        {currentUserFollowingIds.size}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">
                        Following
                      </p>
                    </div>
                    <div className="bg-slate-950/70 rounded-xl p-2 border border-slate-800/70">
                      <p className="text-sm font-bold text-white">
                        {currentUserFollowerIds.size}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">
                        Followers
                      </p>
                    </div>
                    <div className="bg-slate-950/70 rounded-xl p-2 border border-fuchsia-500/30">
                      <p className="text-sm font-bold text-fuchsia-300">
                        {myFoF.recommendations.length}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-fuchsia-300/80">
                        2-Hop FoF
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Live SurrealQL Query Log */}
              <QueryInspector logs={queryLogs} engineMode={engineMode} />

              {/* SurrealQL Cheat Sheet Card */}
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 text-xs space-y-2.5">
                <h4 className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-cyan-400" />
                  SurrealQL Graph Patterns Used
                </h4>
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/90">
                    <p className="text-slate-500 mb-0.5">// 1-Hop Following</p>
                    <p className="text-fuchsia-300">
                      SELECT -&gt;follows-&gt;student FROM {currentUser?.id ?? 'student:alice'}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/90">
                    <p className="text-slate-500 mb-0.5">// 1-Hop Followers</p>
                    <p className="text-cyan-300">
                      SELECT &lt;-follows&lt;-student FROM {currentUser?.id ?? 'student:alice'}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/90">
                    <p className="text-slate-500 mb-0.5">// 2-Hop Friends of Friends</p>
                    <p className="text-purple-300">
                      SELECT -&gt;follows-&gt;follows-&gt;student FROM{' '}
                      {currentUser?.id ?? 'student:alice'}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* Create Student Modal */}
      <CreateStudentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateStudent}
      />

      {/* Toast Notification Stack */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
