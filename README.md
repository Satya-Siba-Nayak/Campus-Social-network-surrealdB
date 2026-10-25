# CampusGraph — SurrealDB WebAssembly Campus Social Network

A complete, modern, single-page **Campus Social Network** running **SurrealDB 100% inside the browser via WebAssembly** (`@surrealdb/wasm`). No backend servers or external database containers are required.

---

## Quick Start

**Bash / Zsh / PowerShell 7+:**
```bash
npm install && npm run dev
```

**Windows PowerShell 5.1 (or run one by one):**
```powershell
npm install; npm run dev
```

Then open the local URL printed by Vite (typically `http://localhost:5173`).

---

## Architecture & Browser-Native WASM Engine

- **100% In-Browser Database**: Powered by `surrealdb` + `@surrealdb/wasm` using `createWasmEngines()`.
- **Persistent IndexedDB + In-Memory Support**:
  - Connects by default to `indxdb://campus-social` so your students, posts, and social graph relationships persist across page reloads.
  - Includes a header toggle to switch between `indxdb://campus-social` (persistent IndexedDB) and `mem://` (in-memory demo mode) on the fly.
- **Namespace & Database**: Configured to use `namespace: "campus"` and `database: "social"`.
- **Auto-Seeding**: On first load, if the database is empty, it automatically seeds 6 realistic campus students (`student:alice`, `student:bob`, `student:priya`, `student:marcus`, `student:elena`, `student:devon`), 13 `follows` graph edges, and 5 `wrote` -> `post` records.

---

## CRUD & Graph Operations Demonstrated

All database logic lives cleanly in [`src/lib/db.ts`](./src/lib/db.ts) and is logged in real time in the in-app **Live SurrealQL WASM Log**:

### 1. Students (CRUD)
- **Create Student**:
  ```surql
  CREATE student:alice SET name = "Alice Chen", branch = "Computer Science", year = 3, bio = "...";
  ```
- **List All Students**:
  ```surql
  SELECT * FROM student ORDER BY name ASC;
  ```
- **View Single Student Profile**:
  ```surql
  SELECT * FROM student:alice;
  ```
- **Update Student Bio**:
  ```surql
  UPDATE student:alice SET bio = "...";
  ```
- **Delete Student (with Graph Edge Cleanup)**:
  ```surql
  DELETE follows WHERE in = student:alice OR out = student:alice;
  DELETE wrote WHERE in = student:alice;
  DELETE student:alice;
  ```

### 2. Posts & Graph Authorship
- **Create Post Linked to Student**:
  ```surql
  RELATE student:alice->wrote->post:uuid SET text = "...", created_at = time::now();
  ```
- **List Posts with Author Metadata**:
  ```surql
  SELECT out AS id, out.text AS text, in AS author_id, in.name AS author_name FROM wrote ORDER BY created_at DESC;
  ```
- **Edit Post Text**:
  ```surql
  UPDATE post:uuid SET text = "...";
  ```
- **Delete Post**:
  ```surql
  DELETE wrote WHERE out = post:uuid;
  DELETE post:uuid;
  ```

### 3. Social Graph Relationships (1-Hop & 2-Hop Traversal)
- **Follow a Student**:
  ```surql
  RELATE student:alice->follows->student:bob;
  ```
- **Unfollow a Student**:
  ```surql
  DELETE follows WHERE in = student:alice AND out = student:bob;
  ```
- **Show "Following" List (1-Hop Outgoing)**:
  ```surql
  SELECT ->follows->student FROM student:alice;
  ```
- **Show "Followers" List (1-Hop Incoming)**:
  ```surql
  SELECT <-follows<-student FROM student:alice;
  ```
- **"Friends of Friends" Recommendations (2-Hop Graph Traversal)**:
  ```surql
  SELECT ->follows->follows->student FROM student:alice;
  ```
