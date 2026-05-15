# Detail Page Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add editable local comments to every detail page: game/subject detail, character detail, and person detail.

**Architecture:** Use one local SQLite-backed comment model keyed by `target_kind + target_id`, then render a shared `CommentsPanel` inside each detail page. Bangumi v0 exposes counts and collection `comment`, but not a general public comment list in the provided schema, so this feature should be local-first; optional Bangumi collection sync can reuse the existing `Game.review`/collection payload later.

**Tech Stack:** React 18, TypeScript, Zustand-adjacent service calls, SQL.js/Tauri SQLite, existing `npm test` pipeline.

---

## File Structure

- Modify: `src/types/index.ts`
  - Add `DetailCommentTargetKind`, `DetailComment`, and `DetailCommentTarget`.
- Modify: `src/services/dbSchema.ts`
  - Add `detail_comments` table and target/time indexes.
- Modify: `src/services/database.ts`
  - Add migrations and CRUD helpers: load, add, update, delete comments.
- Create: `src/services/detailComments.ts`
  - Pure helpers for building stable comment targets from games, Bangumi subjects, characters, and persons.
- Create: `src/services/detailComments.test.ts`
  - Regression tests for target identity and comment sorting helper behavior.
- Create: `src/components/CommentsPanel.tsx`
  - Shared comment composer/list with loading, empty, save, edit, delete, and error states.
- Modify: `src/components/GameDetailPage.tsx`
  - Render comments for library game details and browse subject details.
- Modify: `src/components/BangumiEntityDetailPanel.tsx`
  - Render comments for character/person details after data loads.
- Modify: `src/index.css`
  - Add comment panel styles using existing section/card/field tokens.
- Modify: `package.json`
  - Add the new test file to the `npm test` chain.

## Task 1: Comment Types And Target Helpers

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/services/detailComments.ts`
- Create: `src/services/detailComments.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing target helper tests**

```ts
import assert from 'node:assert/strict'
import { buildCommentTarget, sortCommentsNewestFirst } from './detailComments.js'
import type { DetailComment } from '../types/index.js'

assert.deepEqual(buildCommentTarget('subject', 123, 'CLANNAD'), {
  kind: 'subject',
  id: '123',
  title: 'CLANNAD',
})

assert.deepEqual(buildCommentTarget('character', 456, '古河渚'), {
  kind: 'character',
  id: '456',
  title: '古河渚',
})

const comments: DetailComment[] = [
  { id: 'a', target_kind: 'subject', target_id: '1', body: 'old', created_at: 100, updated_at: 100 },
  { id: 'b', target_kind: 'subject', target_id: '1', body: 'new', created_at: 200, updated_at: 200 },
]
assert.deepEqual(sortCommentsNewestFirst(comments).map(item => item.id), ['b', 'a'])
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test`

Expected: TypeScript fails because `detailComments.ts` and comment types do not exist.

- [ ] **Step 3: Add comment types**

Add to `src/types/index.ts`:

```ts
export type DetailCommentTargetKind = 'game' | 'subject' | 'character' | 'person'

export interface DetailCommentTarget {
  kind: DetailCommentTargetKind
  id: string
  title: string
}

export interface DetailComment {
  id: string
  target_kind: DetailCommentTargetKind
  target_id: string
  body: string
  created_at: number
  updated_at: number
}
```

- [ ] **Step 4: Add pure helper implementation**

Create `src/services/detailComments.ts`:

```ts
import type { DetailComment, DetailCommentTarget, DetailCommentTargetKind } from '../types'

export function buildCommentTarget(kind: DetailCommentTargetKind, id: string | number, title: string): DetailCommentTarget {
  return {
    kind,
    id: String(id),
    title,
  }
}

export function sortCommentsNewestFirst(comments: DetailComment[]): DetailComment[] {
  return [...comments].sort((left, right) => right.created_at - left.created_at)
}
```

- [ ] **Step 5: Wire the test into `package.json`**

Add `node .tmp-tests/services/detailComments.test.js` after the existing service tests.

- [ ] **Step 6: Run test to verify this task passes**

Run: `npm test`

Expected: PASS for the new helper test, or only unrelated pre-existing failures if the dirty worktree already has them.

## Task 2: SQLite Comment Persistence

**Files:**
- Modify: `src/services/dbSchema.ts`
- Modify: `src/services/database.ts`

- [ ] **Step 1: Add database schema**

Add to `CREATE_TABLES_SQL`:

```sql
CREATE TABLE IF NOT EXISTS detail_comments (
  id TEXT PRIMARY KEY,
  target_kind TEXT NOT NULL
    CHECK(target_kind IN ('game', 'subject', 'character', 'person')),
  target_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_detail_comments_target
ON detail_comments(target_kind, target_id, created_at DESC);
```

- [ ] **Step 2: Add migration**

In `runMigrations()`, execute the same `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` SQL so existing databases receive the table.

- [ ] **Step 3: Add CRUD helpers**

Add imports and functions in `src/services/database.ts`:

```ts
import type { DetailComment, DetailCommentTarget, ... } from '../types';

export async function loadDetailComments(target: DetailCommentTarget): Promise<DetailComment[]> {
  if (initPromise) await initPromise;
  return selectRaw<DetailComment>(
    `SELECT * FROM detail_comments
     WHERE target_kind = ? AND target_id = ?
     ORDER BY created_at DESC`,
    [target.kind, target.id],
  );
}

export async function addDetailComment(target: DetailCommentTarget, body: string): Promise<DetailComment> {
  if (initPromise) await initPromise;
  const now = Date.now();
  const comment: DetailComment = {
    id: `comment_${now}_${Math.random().toString(36).slice(2, 8)}`,
    target_kind: target.kind,
    target_id: target.id,
    body: body.trim(),
    created_at: now,
    updated_at: now,
  };
  await executeRaw(
    `INSERT INTO detail_comments (id, target_kind, target_id, body, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [comment.id, comment.target_kind, comment.target_id, comment.body, comment.created_at, comment.updated_at],
  );
  persistBrowserDb();
  return comment;
}

export async function updateDetailComment(id: string, body: string): Promise<void> {
  if (initPromise) await initPromise;
  await executeRaw('UPDATE detail_comments SET body = ?, updated_at = ? WHERE id = ?', [body.trim(), Date.now(), id]);
  persistBrowserDb();
}

export async function deleteDetailComment(id: string): Promise<void> {
  if (initPromise) await initPromise;
  await executeRaw('DELETE FROM detail_comments WHERE id = ?', [id]);
  persistBrowserDb();
}
```

- [ ] **Step 4: Run build-level type check through tests**

Run: `npm test`

Expected: TypeScript passes through the changed database service.

## Task 3: Shared CommentsPanel UI

**Files:**
- Create: `src/components/CommentsPanel.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Create the component**

`CommentsPanel` props:

```ts
interface CommentsPanelProps {
  target: DetailCommentTarget
}
```

Behavior:
- Load comments when `target.kind` or `target.id` changes.
- Show loading state while reading.
- Show empty state: `暂无评论，写下这页的笔记。`
- Disable submit for blank text.
- Add comments through `addDetailComment`.
- Edit inline with textarea and save/cancel.
- Delete with a single confirmation click state.
- Show user-facing error text on failed load/save/delete.

- [ ] **Step 2: Style with existing tokens**

Add classes such as:

```css
.comments-panel {}
.comments-composer {}
.comment-list {}
.comment-item {}
.comment-meta {}
.comment-actions {}
```

Use existing `bangumi-section`, `field`, `btn`, `text-[var(--text-secondary)]`, and border/background variables rather than new hardcoded palette values.

- [ ] **Step 3: Run tests**

Run: `npm test`

Expected: PASS or only unrelated pre-existing failures.

## Task 4: Mount Comments On Subject/Game Detail Pages

**Files:**
- Modify: `src/components/GameDetailPage.tsx`

- [ ] **Step 1: Build the target in `GameDetailPage`**

Add:

```ts
const commentTarget = useMemo(() => {
  if (currentMeta) {
    return buildCommentTarget('subject', currentMeta.subject_id, currentMeta.title_cn || currentMeta.title || '游戏详情')
  }
  if (activeGame) {
    return buildCommentTarget('game', activeGame.id, activeGame.name_cn || activeGame.name)
  }
  return null
}, [currentMeta?.subject_id, currentMeta?.title_cn, currentMeta?.title, activeGame?.id, activeGame?.name_cn, activeGame?.name])
```

- [ ] **Step 2: Render comments as a normal page section**

Place `<CommentsPanel target={commentTarget} />` after summary/detail content and before the refresh toolbar, guarded by `commentTarget`.

Rationale: It keeps the left navigation and page scroll model intact; it does not create another overlay or hidden navigation stack.

- [ ] **Step 3: Run tests**

Run: `npm test`

Expected: PASS or only unrelated pre-existing failures.

## Task 5: Mount Comments On Character/Person Detail Pages

**Files:**
- Modify: `src/components/BangumiEntityDetailPanel.tsx`

- [ ] **Step 1: Build the target after detail loads**

Add:

```ts
const commentTarget = detail
  ? buildCommentTarget(data.kind, detail.id, detail.name)
  : null
```

- [ ] **Step 2: Render comments before related content**

Place `<CommentsPanel target={commentTarget} />` after the summary section and before related games/persons/characters.

Expected UX:
- Character page comments are stored under `character:<id>`.
- Person page comments are stored under `person:<id>`.
- Returning and reopening the same entity reloads the same local comments.

- [ ] **Step 3: Run tests**

Run: `npm test`

Expected: PASS or only unrelated pre-existing failures.

## Task 6: Verification

**Files:**
- No code changes unless verification exposes a defect.

- [ ] **Step 1: Run unit/regression tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Browser verification**

Run: `npm run dev`, open the Vite URL, and verify:
- Library game detail can add, edit, and delete a comment.
- Browse subject detail can add, edit, and delete a comment.
- Character detail can add, edit, and delete a comment.
- Person detail can add, edit, and delete a comment.
- Back navigation returns one business level at a time.
- Sidebar remains visible.
- No React error overlay.
- Console has no related error or warning.

## Self-Review

- Spec coverage: The plan covers all current detail surfaces: `GameDetailPage` for library/browse subject details and `BangumiEntityDetailPanel` for character/person details.
- Placeholder scan: No task relies on unspecified files or vague "handle edge cases" instructions.
- Type consistency: All persistence and UI code uses `DetailCommentTarget`, `DetailCommentTargetKind`, and `DetailComment` consistently.
- Known limitation: This is local comment support. Bangumi public comments are not planned because the provided v0 schema shows collection `comment` and discussion counts, not a general comment-list endpoint for subject/character/person pages.
