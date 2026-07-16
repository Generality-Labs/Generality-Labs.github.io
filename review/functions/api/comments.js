// gl-review comments API — a Cloudflare Pages Function, deployed ONLY to the
// staging Pages project (the deploy script assembles it into the staging
// bundle; prod never ships it and has no database to talk to).
//
// Auth: every request carries the shared review key (x-gl-key header),
// compared against the GL_REVIEW_KEY env var on the Pages project. Identity
// within the trusted group is a self-reported name — this is a draft-review
// tool for colleagues, not a public comment system.
//
// Routes (all under /api/comments):
//   GET    ?slug=<post>   list comments for a post ("all" = every post)
//   POST   {slug, name, body, quote?, prefix?, suffix?, offset?, parent_id?}
//   PATCH  {id, resolved}  mark a thread resolved / unresolved
//   DELETE ?id=<id>        delete a comment (client offers this only to its author)

const SCHEMA = `CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  slug       TEXT NOT NULL,
  parent_id  TEXT,
  name       TEXT NOT NULL,
  body       TEXT NOT NULL,
  quote      TEXT,
  prefix     TEXT,
  suffix     TEXT,
  offset     INTEGER,
  resolved   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
)`;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

const bad = (msg, status = 400) => json({ error: msg }, status);

async function ensureSchema(db) {
  await db.prepare(SCHEMA).run();
  // v2 block anchors (paragraph hash + index); ADD COLUMN is a no-op error
  // once applied, so swallow it
  for (const ddl of [
    "ALTER TABLE comments ADD COLUMN block_i INTEGER",
    "ALTER TABLE comments ADD COLUMN block_hash TEXT",
  ]) {
    try { await db.prepare(ddl).run(); } catch (_) { /* already applied */ }
  }
}

export async function onRequest({ request, env }) {
  const db = env.GL_DB;
  if (!db) return bad("no database bound", 500);

  const key = request.headers.get("x-gl-key");
  if (!env.GL_REVIEW_KEY || key !== env.GL_REVIEW_KEY) return bad("bad key", 403);

  await ensureSchema(db);
  const url = new URL(request.url);

  if (request.method === "GET") {
    const slug = url.searchParams.get("slug");
    if (!slug) return bad("slug required");
    const q =
      slug === "all"
        ? db.prepare("SELECT * FROM comments ORDER BY created_at")
        : db.prepare("SELECT * FROM comments WHERE slug = ? ORDER BY created_at").bind(slug);
    const { results } = await q.all();
    return json({ comments: results });
  }

  if (request.method === "POST") {
    const c = await request.json().catch(() => null);
    if (!c || !c.slug || !c.name?.trim() || !c.body?.trim()) return bad("slug, name, body required");
    const row = {
      id: crypto.randomUUID(),
      slug: c.slug,
      parent_id: c.parent_id ?? null,
      name: c.name.trim().slice(0, 60),
      body: c.body.trim().slice(0, 4000),
      quote: c.quote?.slice(0, 1000) ?? null,
      prefix: c.prefix?.slice(0, 64) ?? null,
      suffix: c.suffix?.slice(0, 64) ?? null,
      offset: Number.isFinite(c.offset) ? c.offset : null,
      block_i: Number.isFinite(c.block_i) ? c.block_i : null,
      block_hash: c.block_hash?.slice(0, 16) ?? null,
      resolved: 0,
      created_at: Date.now(),
    };
    await db
      .prepare(
        `INSERT INTO comments (id, slug, parent_id, name, body, quote, prefix, suffix, offset, block_i, block_hash, resolved, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(...Object.values(row))
      .run();
    return json({ comment: row }, 201);
  }

  if (request.method === "PATCH") {
    const { id, resolved } = (await request.json().catch(() => null)) ?? {};
    if (!id) return bad("id required");
    await db.prepare("UPDATE comments SET resolved = ? WHERE id = ?").bind(resolved ? 1 : 0, id).run();
    return json({ ok: true });
  }

  if (request.method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id) return bad("id required");
    await db.prepare("DELETE FROM comments WHERE id = ? OR parent_id = ?").bind(id, id).run();
    return json({ ok: true });
  }

  return bad("method not allowed", 405);
}
