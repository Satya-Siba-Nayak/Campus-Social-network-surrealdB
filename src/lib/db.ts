import { Surreal, RecordId, StringRecordId } from 'surrealdb';
import { createWasmEngines } from '@surrealdb/wasm';

export type EngineMode = 'indxdb' | 'mem';

export interface Student {
  id: string; // e.g., "student:alice"
  name: string;
  branch: string;
  year: number;
  bio: string;
  avatar_color?: string;
  created_at?: string;
}

export interface Post {
  id: string; // e.g., "post:..." or "wrote:..."
  text: string;
  created_at: string;
  author_id: string;
  author_name: string;
  author_branch: string;
  author_year: number;
  edge_id?: string;
}

export interface GraphRelationship {
  id: string;
  in: string;
  out: string;
}

export interface QueryLogEntry {
  id: string;
  timestamp: string;
  surql: string;
  description: string;
  durationMs: number;
}

// Global query log subscribers so the UI can show live SurrealQL executions!
type LogListener = (logs: QueryLogEntry[]) => void;
let queryLogs: QueryLogEntry[] = [];
const logListeners = new Set<LogListener>();

export function subscribeQueryLogs(listener: LogListener) {
  logListeners.add(listener);
  listener(queryLogs);
  return () => {
    logListeners.delete(listener);
  };
}

export function clearQueryLogs() {
  queryLogs = [];
  logListeners.forEach((l) => l(queryLogs));
}

function recordQueryLog(surql: string, description: string, durationMs: number) {
  const entry: QueryLogEntry = {
    id: Math.random().toString(36).slice(2, 10),
    timestamp: new Date().toLocaleTimeString(),
    surql: surql.trim(),
    description,
    durationMs: Math.round(durationMs * 10) / 10,
  };
  queryLogs = [entry, ...queryLogs].slice(0, 35);
  logListeners.forEach((l) => l(queryLogs));
}

// Helper to normalize SurrealDB RecordId or string into a clean "table:id" string
export function normalizeId(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') {
    // Strip SurrealQL angle brackets or backticks if present, e.g., student:`alice` -> student:alice
    return val.replace(/[`⟨⟩]/g, '');
  }
  if (typeof val === 'object' && val !== null) {
    if ('tb' in val && 'id' in val) {
      const r = val as { tb: unknown; id: unknown };
      return `${String(r.tb)}:${String(r.id)}`.replace(/[`⟨⟩]/g, '');
    }
    if ('table' in val && 'id' in val) {
      const r = val as { table: { name?: string } | string; id: unknown };
      const tbName = typeof r.table === 'object' && r.table !== null && 'name' in r.table
        ? r.table.name
        : String(r.table);
      return `${tbName}:${String(r.id)}`.replace(/[`⟨⟩]/g, '');
    }
    return String(val).replace(/[`⟨⟩]/g, '');
  }
  return String(val);
}

// Helper to convert a "table:id" string into a SurrealDB RecordId instance
export function toRecordId(idStr: string): RecordId | StringRecordId {
  const clean = normalizeId(idStr);
  const colonIdx = clean.indexOf(':');
  if (colonIdx !== -1) {
    const tb = clean.slice(0, colonIdx);
    const id = clean.slice(colonIdx + 1);
    return new RecordId(tb, id);
  }
  return new StringRecordId(clean);
}

function normalizeStudent(raw: Record<string, unknown>): Student {
  return {
    id: normalizeId(raw.id),
    name: String(raw.name ?? 'Unknown Student'),
    branch: String(raw.branch ?? 'General'),
    year: Number(raw.year ?? 1),
    bio: String(raw.bio ?? ''),
    avatar_color: raw.avatar_color ? String(raw.avatar_color) : undefined,
    created_at: raw.created_at ? String(raw.created_at) : undefined,
  };
}

// Singleton Surreal instance configured with @surrealdb/wasm
let dbInstance: Surreal | null = null;
let currentEngineMode: EngineMode = 'indxdb';
let initPromise: Promise<Surreal> | null = null;

export function getEngineMode(): EngineMode {
  return currentEngineMode;
}

/**
 * Initialize SurrealDB in the browser via WebAssembly (`createWasmEngines()`).
 * Connects to `indxdb://campus-social` by default for persistent storage across refreshes,
 * with fallback or toggle support for `mem://` in-memory engine.
 * Uses Namespace: "campus", Database: "social".
 */
export async function initDB(mode?: EngineMode): Promise<Surreal> {
  if (mode && mode !== currentEngineMode && dbInstance) {
    await dbInstance.close().catch(() => {});
    dbInstance = null;
    initPromise = null;
    currentEngineMode = mode;
  }

  if (dbInstance && dbInstance.isConnected) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const t0 = performance.now();
    const db = new Surreal({
      engines: createWasmEngines(),
    });

    const endpoint = currentEngineMode === 'indxdb' ? 'indxdb://campus-social' : 'mem://';

    try {
      await db.connect(endpoint);
    } catch (err) {
      // Fallback to mem:// if IndexedDB is blocked in private browsing
      if (currentEngineMode === 'indxdb') {
        console.warn('IndexedDB unavailable, falling back to mem://', err);
        currentEngineMode = 'mem';
        await db.connect('mem://');
      } else {
        throw err;
      }
    }

    await db.use({ namespace: 'campus', database: 'social' });
    dbInstance = db;

    recordQueryLog(
      `CONNECT ${currentEngineMode === 'indxdb' ? 'indxdb://campus-social' : 'mem://'};\nUSE NS campus DB social;`,
      `Initialized SurrealDB WASM engine (${currentEngineMode === 'indxdb' ? 'IndexedDB Persistent' : 'In-Memory'})`,
      performance.now() - t0
    );

    await seedDemoDataIfEmpty(db);
    return db;
  })();

  return initPromise;
}

/**
 * Seeds 6 realistic demo students, social graph `follows` edges (forming a rich multi-hop network),
 * and `wrote` -> `post` graph relationships if the database has no students yet.
 */
export async function seedDemoDataIfEmpty(db?: Surreal, force = false): Promise<void> {
  const client = db ?? (await initDB());

  if (!force) {
    const [existing] = await client.query<[ unknown[] ]>('SELECT id FROM student LIMIT 1;').collect();
    if (Array.isArray(existing) && existing.length > 0) {
      return;
    }
  } else {
    const tReset = performance.now();
    await client.query(`
      DELETE student;
      DELETE post;
      DELETE follows;
      DELETE wrote;
    `).collect();
    recordQueryLog(
      `DELETE student; DELETE post; DELETE follows; DELETE wrote;`,
      'Cleared existing campus database tables & edges',
      performance.now() - tReset
    );
  }

  const t0 = performance.now();
  const seedSql = `
    -- 1. Create Demo Students
    CREATE student:alice SET
      name = "Alice Chen",
      branch = "Computer Science",
      year = 3,
      bio = "Building distributed graph engines & Rust WASM compilers. President of ACM Chapter.",
      created_at = time::now();

    CREATE student:bob SET
      name = "Bob Martinez",
      branch = "Electrical & AI",
      year = 4,
      bio = "Embedded systems, FPGA synthesis & neuromorphic hardware. Always in the robotics lab.",
      created_at = time::now();

    CREATE student:priya SET
      name = "Priya Nair",
      branch = "Data Science",
      year = 3,
      bio = "Graph neural networks, social network analysis & competitive programming.",
      created_at = time::now();

    CREATE student:marcus SET
      name = "Marcus Vance",
      branch = "Cybersecurity",
      year = 2,
      bio = "CTF player, zero-knowledge proofs & kernel exploitation enthusiast. Organizing CampusSec.",
      created_at = time::now();

    CREATE student:elena SET
      name = "Elena Rostova",
      branch = "Computational Design",
      year = 4,
      bio = "Generative WebGL shaders, interactive UI architecture & human-computer interaction.",
      created_at = time::now();

    CREATE student:devon SET
      name = "Devon Brooks",
      branch = "Mechanical & Robotics",
      year = 1,
      bio = "Autonomous quadrotors, ROS2 navigation & 3D printing custom carbon frames.",
      created_at = time::now();

    -- 2. Create Social Graph Relationships (RELATE student->follows->student)
    -- Alice follows Bob and Priya
    RELATE student:alice->follows->student:bob SET created_at = time::now();
    RELATE student:alice->follows->student:priya SET created_at = time::now();

    -- Bob follows Marcus and Elena (so Marcus & Elena are 2-hop Friends-of-Friends for Alice!)
    RELATE student:bob->follows->student:marcus SET created_at = time::now();
    RELATE student:bob->follows->student:elena SET created_at = time::now();
    RELATE student:bob->follows->student:alice SET created_at = time::now();

    -- Priya follows Elena and Devon (so Elena & Devon are 2-hop Friends-of-Friends for Alice!)
    RELATE student:priya->follows->student:elena SET created_at = time::now();
    RELATE student:priya->follows->student:devon SET created_at = time::now();
    RELATE student:priya->follows->student:alice SET created_at = time::now();

    -- Marcus follows Priya and Devon
    RELATE student:marcus->follows->student:priya SET created_at = time::now();
    RELATE student:marcus->follows->student:devon SET created_at = time::now();

    -- Elena follows Alice and Marcus
    RELATE student:elena->follows->student:alice SET created_at = time::now();
    RELATE student:elena->follows->student:marcus SET created_at = time::now();

    -- Devon follows Bob and Elena
    RELATE student:devon->follows->student:bob SET created_at = time::now();
    RELATE student:devon->follows->student:elena SET created_at = time::now();

    -- 3. Create Posts & Graph Authorship Edges
    CREATE post:p1 SET text = "Just got SurrealDB running 100% in-browser via WebAssembly! Zero backend servers, full multi-hop graph traversal in milliseconds.", created_at = time::now();
    RELATE student:alice->wrote->post:p1 SET text = "Just got SurrealDB running 100% in-browser via WebAssembly! Zero backend servers, full multi-hop graph traversal in milliseconds.", created_at = time::now();

    CREATE post:p2 SET text = "Anyone heading to the late-night Hackathon qualifiers in Turing Hall? Need one more teammate who knows TypeScript or Rust!", created_at = time::now();
    RELATE student:bob->wrote->post:p2 SET text = "Anyone heading to the first-floor Robotics Lab tonight? Testing our new LiDAR SLAM pipeline on the quadruped.", created_at = time::now();
    UPDATE post:p2 SET text = "Anyone heading to the first-floor Robotics Lab tonight? Testing our new LiDAR SLAM pipeline on the quadruped.";

    CREATE post:p3 SET text = "Pro-tip for Graph Theory 302: SurrealQL's SELECT ->follows->follows->student syntax makes 2-hop friend recommendation queries a one-liner.", created_at = time::now();
    RELATE student:priya->wrote->post:p3 SET text = "Pro-tip for Graph Theory 302: SurrealQL's SELECT ->follows->follows->student syntax makes 2-hop friend recommendation queries a one-liner.", created_at = time::now();

    CREATE post:p4 SET text = "Hosting a workshop on browser sandboxing & WebAssembly memory safety this Friday at 4 PM. Free pizza and stickers!", created_at = time::now();
    RELATE student:marcus->wrote->post:p4 SET text = "Hosting a workshop on browser sandboxing & WebAssembly memory safety this Friday at 4 PM. Free pizza and stickers!", created_at = time::now();

    CREATE post:p5 SET text = "Designed a new dark-mode design system for our campus portal. Let me know what you think of the glassmorphic graph visualizer!", created_at = time::now();
    RELATE student:elena->wrote->post:p5 SET text = "Designed a new dark-mode design system for our campus portal. Let me know what you think of the glassmorphic graph visualizer!", created_at = time::now();
  `;

  await client.query(seedSql).collect();

  recordQueryLog(
    `CREATE student:alice ...;\nRELATE student:alice->follows->student:bob;\nRELATE student:alice->wrote->post:p1 SET text = "...", created_at = time::now();`,
    'Seeded 6 campus students, 13 follow graph edges, and 5 posts',
    performance.now() - t0
  );
}

// ============================================================================
// 1. STUDENT CRUD OPERATIONS
// ============================================================================

export async function getAllStudents(): Promise<Student[]> {
  const db = await initDB();
  const t0 = performance.now();
  const surql = 'SELECT * FROM student ORDER BY name ASC;';
  const [rows] = await db.query<[Record<string, unknown>[]]>(surql).collect();
  recordQueryLog(surql, 'List all students', performance.now() - t0);
  return (rows ?? []).map(normalizeStudent);
}

export async function getStudentById(studentId: string): Promise<Student | null> {
  const db = await initDB();
  const t0 = performance.now();
  const rid = toRecordId(studentId);
  const cleanId = normalizeId(studentId);
  const [rows] = await db
    .query<[Record<string, unknown>[]]>(
      'SELECT * FROM $rid;',
      { rid }
    )
    .collect();
  recordQueryLog(`SELECT * FROM ${cleanId};`, `View student profile (${cleanId})`, performance.now() - t0);
  if (!rows || rows.length === 0) return null;
  return normalizeStudent(rows[0]);
}

export async function createStudent(input: {
  slug?: string;
  name: string;
  branch: string;
  year: number;
  bio: string;
}): Promise<Student> {
  const db = await initDB();
  const t0 = performance.now();

  // Create a clean readable slug ID like student:alice or student:rahul_sharma
  const rawSlug = (input.slug || input.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const baseKey = rawSlug || `user_${Math.random().toString(36).slice(2, 7)}`;

  // Check if ID already exists; if so, append short suffix
  const existing = await getStudentById(`student:${baseKey}`);
  const finalKey = existing ? `${baseKey}_${Math.random().toString(36).slice(2, 5)}` : baseKey;
  const rid = new RecordId('student', finalKey);

  const [created] = await db
    .query<[Record<string, unknown>[]]>(
      `CREATE $rid SET name = $name, branch = $branch, year = $year, bio = $bio, created_at = time::now();`,
      {
        rid,
        name: input.name.trim(),
        branch: input.branch.trim(),
        year: Number(input.year),
        bio: input.bio.trim(),
      }
    )
    .collect();

  recordQueryLog(
    `CREATE student:${finalKey} SET name = ${JSON.stringify(input.name)}, branch = ${JSON.stringify(input.branch)}, year = ${Number(input.year)}, bio = ${JSON.stringify(input.bio)};`,
    `Created student student:${finalKey}`,
    performance.now() - t0
  );

  if (!created || created.length === 0) {
    throw new Error('Failed to create student record');
  }
  return normalizeStudent(created[0]);
}

export async function updateStudentBio(studentId: string, bio: string): Promise<Student> {
  const db = await initDB();
  const t0 = performance.now();
  const rid = toRecordId(studentId);
  const cleanId = normalizeId(studentId);

  const [updated] = await db
    .query<[Record<string, unknown>[]]>(
      `UPDATE $rid SET bio = $bio;`,
      { rid, bio: bio.trim() }
    )
    .collect();

  recordQueryLog(
    `UPDATE ${cleanId} SET bio = ${JSON.stringify(bio.trim())};`,
    `Updated bio for ${cleanId}`,
    performance.now() - t0
  );

  if (!updated || updated.length === 0) {
    throw new Error('Student not found');
  }
  return normalizeStudent(updated[0]);
}

export async function deleteStudent(studentId: string): Promise<void> {
  const db = await initDB();
  const t0 = performance.now();
  const rid = toRecordId(studentId);
  const cleanId = normalizeId(studentId);

  // Clean up authored posts, wrote edges, follow edges, and the student record
  await db
    .query(
      `
      LET $posts = (SELECT VALUE out FROM wrote WHERE in = $rid);
      DELETE $posts;
      DELETE wrote WHERE in = $rid;
      DELETE follows WHERE in = $rid OR out = $rid;
      DELETE $rid;
    `,
      { rid }
    )
    .collect();

  recordQueryLog(
    `DELETE follows WHERE in = ${cleanId} OR out = ${cleanId};\nDELETE wrote WHERE in = ${cleanId};\nDELETE ${cleanId};`,
    `Deleted student ${cleanId} and connected graph edges`,
    performance.now() - t0
  );
}

// ============================================================================
// 2. POSTS CRUD & GRAPH AUTHORSHIP OPERATIONS
// ============================================================================

export async function createPost(authorStudentId: string, text: string): Promise<Post> {
  const db = await initDB();
  const t0 = performance.now();
  const authorRid = toRecordId(authorStudentId);
  const cleanAuthor = normalizeId(authorStudentId);
  const postKey = Math.random().toString(36).slice(2, 10);
  const postRid = new RecordId('post', postKey);

  // Uses the exact requested SurrealQL pattern:
  // RELATE student:alice->wrote->post:uuid SET text = "...", created_at = time::now()
  // And populates the target post node as well for rich querying
  await db
    .query(
      `
      CREATE $postRid SET text = $text, created_at = time::now();
      RELATE $authorRid->wrote->$postRid SET text = $text, created_at = time::now();
    `,
      {
        authorRid,
        postRid,
        text: text.trim(),
      }
    )
    .collect();

  recordQueryLog(
    `RELATE ${cleanAuthor}->wrote->post:${postKey} SET text = ${JSON.stringify(text.trim())}, created_at = time::now();`,
    `Created post linked to ${cleanAuthor}`,
    performance.now() - t0
  );

  const author = await getStudentById(cleanAuthor);
  return {
    id: `post:${postKey}`,
    text: text.trim(),
    created_at: new Date().toISOString(),
    author_id: cleanAuthor,
    author_name: author?.name ?? cleanAuthor,
    author_branch: author?.branch ?? '',
    author_year: author?.year ?? 1,
  };
}

export async function getAllPosts(): Promise<Post[]> {
  const db = await initDB();
  const t0 = performance.now();

  // Traverse the `wrote` graph edge to retrieve post details alongside the author student record
  const surql = `
    SELECT
      id AS edge_id,
      out AS id,
      out.text ?? text AS text,
      out.created_at ?? created_at AS created_at,
      in AS author_id,
      in.name AS author_name,
      in.branch AS author_branch,
      in.year AS author_year
    FROM wrote
    ORDER BY created_at DESC;
  `;

  const [rows] = await db.query<[Record<string, unknown>[]]>(surql).collect();
  recordQueryLog(
    `SELECT out AS id, out.text AS text, in.name AS author_name FROM wrote ORDER BY created_at DESC;`,
    'Fetched campus post feed with graph author resolution',
    performance.now() - t0
  );

  return (rows ?? []).map((r) => ({
    id: normalizeId(r.id || r.edge_id),
    edge_id: normalizeId(r.edge_id),
    text: String(r.text ?? ''),
    created_at: r.created_at ? String(r.created_at) : new Date().toISOString(),
    author_id: normalizeId(r.author_id),
    author_name: String(r.author_name ?? 'Unknown Student'),
    author_branch: String(r.author_branch ?? 'Campus'),
    author_year: Number(r.author_year ?? 1),
  }));
}

export async function getStudentPosts(studentId: string): Promise<Post[]> {
  const all = await getAllPosts();
  const target = normalizeId(studentId);
  return all.filter((p) => p.author_id === target);
}

export async function updatePost(postId: string, newText: string): Promise<void> {
  const db = await initDB();
  const t0 = performance.now();
  const postRid = toRecordId(postId);
  const cleanPostId = normalizeId(postId);

  await db
    .query(
      `
      UPDATE $postRid SET text = $text;
      UPDATE wrote SET text = $text WHERE out = $postRid OR id = $postRid;
    `,
      { postRid, text: newText.trim() }
    )
    .collect();

  recordQueryLog(
    `UPDATE ${cleanPostId} SET text = ${JSON.stringify(newText.trim())};`,
    `Edited post ${cleanPostId}`,
    performance.now() - t0
  );
}

export async function deletePost(postId: string): Promise<void> {
  const db = await initDB();
  const t0 = performance.now();
  const postRid = toRecordId(postId);
  const cleanPostId = normalizeId(postId);

  await db
    .query(
      `
      DELETE wrote WHERE out = $postRid OR id = $postRid;
      DELETE $postRid;
    `,
      { postRid }
    )
    .collect();

  recordQueryLog(
    `DELETE wrote WHERE out = ${cleanPostId};\nDELETE ${cleanPostId};`,
    `Deleted post ${cleanPostId}`,
    performance.now() - t0
  );
}

// ============================================================================
// 3. SOCIAL GRAPH QUERIES (FOLLOW, UNFOLLOW, 1-HOP & 2-HOP FRIENDS OF FRIENDS)
// ============================================================================

export async function followStudent(fromStudentId: string, toStudentId: string): Promise<void> {
  const cleanFrom = normalizeId(fromStudentId);
  const cleanTo = normalizeId(toStudentId);
  if (cleanFrom === cleanTo) {
    throw new Error('You cannot follow yourself');
  }

  const db = await initDB();
  const t0 = performance.now();
  const fromRid = toRecordId(cleanFrom);
  const toRid = toRecordId(cleanTo);

  // Check if already following to avoid duplicate edges
  const [existing] = await db
    .query<[unknown[]]>(
      `SELECT id FROM follows WHERE in = $fromRid AND out = $toRid LIMIT 1;`,
      { fromRid, toRid }
    )
    .collect();

  if (existing && existing.length > 0) {
    return;
  }

  await db
    .query(
      `RELATE $fromRid->follows->$toRid SET created_at = time::now();`,
      { fromRid, toRid }
    )
    .collect();

  recordQueryLog(
    `RELATE ${cleanFrom}->follows->${cleanTo};`,
    `${cleanFrom} followed ${cleanTo}`,
    performance.now() - t0
  );
}

export async function unfollowStudent(fromStudentId: string, toStudentId: string): Promise<void> {
  const cleanFrom = normalizeId(fromStudentId);
  const cleanTo = normalizeId(toStudentId);
  const db = await initDB();
  const t0 = performance.now();
  const fromRid = toRecordId(cleanFrom);
  const toRid = toRecordId(cleanTo);

  await db
    .query(
      `DELETE follows WHERE in = $fromRid AND out = $toRid;`,
      { fromRid, toRid }
    )
    .collect();

  recordQueryLog(
    `DELETE follows WHERE in = ${cleanFrom} AND out = ${cleanTo};`,
    `${cleanFrom} unfollowed ${cleanTo}`,
    performance.now() - t0
  );
}

/**
 * Helper to extract an array of RecordIds or Student records from a SurrealQL graph traversal result
 * like `SELECT ->follows->student FROM student:alice`
 */
function extractGraphTargetIds(queryResult: unknown[]): string[] {
  if (!Array.isArray(queryResult) || queryResult.length === 0) return [];
  const firstRow = queryResult[0];
  if (!firstRow || typeof firstRow !== 'object') return [];

  // Find the first property in the returned row (e.g. "->follows->student" or "students")
  const values = Object.values(firstRow as Record<string, unknown>);
  if (values.length === 0) return [];

  const rawList = values[0];
  if (!Array.isArray(rawList)) return [];

  // Flatten in case SurrealDB returns nested arrays for multi-hop
  const flattened = rawList.flat(3);
  const ids = new Set<string>();
  for (const item of flattened) {
    if (!item) continue;
    if (typeof item === 'object' && item !== null && 'id' in item && 'name' in item) {
      ids.add(normalizeId((item as { id: unknown }).id));
    } else {
      ids.add(normalizeId(item));
    }
  }
  return Array.from(ids).filter(Boolean);
}

/**
 * 1-Hop Outgoing Graph Query:
 * `SELECT ->follows->student FROM student:alice`
 */
export async function getFollowing(studentId: string): Promise<Student[]> {
  const db = await initDB();
  const t0 = performance.now();
  const cleanId = normalizeId(studentId);
  const rid = toRecordId(cleanId);

  const [graphRes] = await db
    .query<[unknown[]]>(
      `SELECT ->follows->student FROM $rid;`,
      { rid }
    )
    .collect();

  recordQueryLog(
    `SELECT ->follows->student FROM ${cleanId};`,
    `1-hop outgoing graph query: Who ${cleanId} follows`,
    performance.now() - t0
  );

  const targetIds = extractGraphTargetIds(graphRes);
  if (targetIds.length === 0) return [];

  const allStudents = await getAllStudents();
  const studentMap = new Map(allStudents.map((s) => [s.id, s]));
  return targetIds.map((id) => studentMap.get(id)).filter((s): s is Student => Boolean(s));
}

/**
 * 1-Hop Incoming Graph Query:
 * `SELECT <-follows<-student FROM student:alice`
 */
export async function getFollowers(studentId: string): Promise<Student[]> {
  const db = await initDB();
  const t0 = performance.now();
  const cleanId = normalizeId(studentId);
  const rid = toRecordId(cleanId);

  const [graphRes] = await db
    .query<[unknown[]]>(
      `SELECT <-follows<-student FROM $rid;`,
      { rid }
    )
    .collect();

  recordQueryLog(
    `SELECT <-follows<-student FROM ${cleanId};`,
    `1-hop incoming graph query: Followers of ${cleanId}`,
    performance.now() - t0
  );

  const targetIds = extractGraphTargetIds(graphRes);
  if (targetIds.length === 0) return [];

  const allStudents = await getAllStudents();
  const studentMap = new Map(allStudents.map((s) => [s.id, s]));
  return targetIds.map((id) => studentMap.get(id)).filter((s): s is Student => Boolean(s));
}

export interface FriendOfFriendRecommendation {
  student: Student;
  mutualConnections: Student[]; // 1-hop friends who follow this 2-hop student
}

/**
 * 2-Hop "Friends of Friends" Graph Query:
 * `SELECT ->follows->follows->student FROM student:alice`
 * Returns people followed by people `studentId` follows (excluding self and already-followed students),
 * enriched with the intermediate bridge connections to visually demonstrate the 2-hop path!
 */
export async function getFriendsOfFriends(studentId: string): Promise<{
  rawTwoHopAll: Student[];
  recommendations: FriendOfFriendRecommendation[];
}> {
  const db = await initDB();
  const t0 = performance.now();
  const cleanId = normalizeId(studentId);
  const rid = toRecordId(cleanId);

  // Execute the exact 2-hop SurrealQL graph traversal required:
  const [twoHopRes, oneHopRes, allFollowEdges, allStudents] = await Promise.all([
    db.query<[unknown[]]>(`SELECT ->follows->follows->student FROM $rid;`, { rid }).collect(),
    db.query<[unknown[]]>(`SELECT ->follows->student FROM $rid;`, { rid }).collect(),
    db.query<[Record<string, unknown>[]]>(
      `SELECT id, in, out FROM follows;`
    ).collect(),
    getAllStudents(),
  ]);

  recordQueryLog(
    `SELECT ->follows->follows->student FROM ${cleanId};`,
    `2-hop Friends-of-Friends graph traversal from ${cleanId}`,
    performance.now() - t0
  );

  const twoHopIds = extractGraphTargetIds(twoHopRes[0]);
  const oneHopIds = new Set(extractGraphTargetIds(oneHopRes[0]));
  const studentMap = new Map(allStudents.map((s) => [s.id, s]));

  const rawTwoHopAll = twoHopIds
    .map((id) => studentMap.get(id))
    .filter((s): s is Student => Boolean(s));

  // Build adjacency map for bridge explanations (student:alice -> student:bob -> student:marcus)
  const edges = (allFollowEdges[0] ?? []).map((e) => ({
    in: normalizeId(e.in),
    out: normalizeId(e.out),
  }));

  const recommendations: FriendOfFriendRecommendation[] = [];

  for (const targetId of twoHopIds) {
    // Exclude self and people already followed (1-hop) so recommendations are actionable
    if (targetId === cleanId || oneHopIds.has(targetId)) continue;
    const targetStudent = studentMap.get(targetId);
    if (!targetStudent) continue;

    // Find which 1-hop friends follow this targetStudent
    const mutuals: Student[] = [];
    for (const edge of edges) {
      if (edge.out === targetId && oneHopIds.has(edge.in)) {
        const bridgeStudent = studentMap.get(edge.in);
        if (bridgeStudent) {
          mutuals.push(bridgeStudent);
        }
      }
    }

    recommendations.push({
      student: targetStudent,
      mutualConnections: mutuals,
    });
  }

  return {
    rawTwoHopAll,
    recommendations,
  };
}

/**
 * Fetch all `follows` graph edges in the database so we can render follow counts and network visuals
 */
export async function getAllFollowEdges(): Promise<GraphRelationship[]> {
  const db = await initDB();
  const [rows] = await db
    .query<[Record<string, unknown>[]]>(
      `SELECT id, in, out FROM follows;`
    )
    .collect();

  return (rows ?? []).map((r) => ({
    id: normalizeId(r.id),
    in: normalizeId(r.in),
    out: normalizeId(r.out),
  }));
}
