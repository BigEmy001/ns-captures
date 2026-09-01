import { describe, it, expect, vi, beforeEach } from "vitest";

const tables: Record<string, { data: unknown[] | null; error?: unknown }> = {};

/**
 * A thenable query builder: every chained call returns itself, and awaiting it
 * yields whatever that table was seeded with.
 */
function builderFor(table: string) {
  const result = tables[table] ?? { data: [], error: null };
  const builder: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  for (const method of ["select", "eq", "order", "in", "is", "limit"]) {
    builder[method] = () => builder;
  }
  return builder;
}

vi.mock("../../lib/supabase", () => ({
  supabase: { from: (table: string) => builderFor(table) },
  isSupabaseReady: () => true,
}));

const { fetchModerationQueue } = await import("./db");

const queueRow = (photoId: string, submitted: string) => ({
  id: `MOD-${photoId}`,
  photo_id: photoId,
  photographer: "Queued Photographer",
  reason: "New submission",
  submitted,
  status: "pending",
});

const pendingPhoto = (id: string, uploadedAt: string) => ({
  id,
  title: "Workshop After Hours",
  photographer_name: "Junghoon Sung",
  uploaded_at: uploadedAt,
  status: "pending_review",
});

beforeEach(() => {
  tables.moderation_queue = { data: [], error: null };
  tables.photos = { data: [], error: null };
});

describe("fetchModerationQueue", () => {
  it("lists what the queue holds", async () => {
    tables.moderation_queue = { data: [queueRow("photo-a", "2026-01-02")], error: null };

    const queue = await fetchModerationQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].photoId).toBe("photo-a");
    expect(queue[0].photographer).toBe("Queued Photographer");
  });

  it("shows a photograph awaiting review that never reached the queue", async () => {
    // The live case: row-level security refused the contributor's insert, so
    // the submission existed only as a status on the photograph itself.
    tables.photos = { data: [pendingPhoto("upload-1787495107835", "2026-08-19")], error: null };

    const queue = await fetchModerationQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].photoId).toBe("upload-1787495107835");
    expect(queue[0].photographer).toBe("Junghoon Sung");
    expect(queue[0].reason).toBe("Awaiting review");
  });

  it("does not list a photograph twice when it is queued as well", async () => {
    tables.moderation_queue = { data: [queueRow("photo-a", "2026-01-02")], error: null };
    tables.photos = { data: [pendingPhoto("photo-a", "2026-01-02")], error: null };

    const queue = await fetchModerationQueue();
    expect(queue).toHaveLength(1);
    // The queue row wins, because it carries the reason the contributor gave.
    expect(queue[0].reason).toBe("New submission");
  });

  it("puts the longest wait first, whichever source it came from", async () => {
    tables.moderation_queue = { data: [queueRow("queued-late", "2026-06-01")], error: null };
    tables.photos = { data: [pendingPhoto("stranded-early", "2026-01-01")], error: null };

    const queue = await fetchModerationQueue();
    expect(queue.map((m) => m.photoId)).toEqual(["stranded-early", "queued-late"]);
  });

  it("still surfaces stranded photographs when the queue read fails outright", async () => {
    tables.moderation_queue = { data: null, error: { message: "permission denied" } };
    tables.photos = { data: [pendingPhoto("upload-1", "2026-08-19")], error: null };

    const queue = await fetchModerationQueue();
    expect(queue.map((m) => m.photoId)).toEqual(["upload-1"]);
  });

  it("returns nothing when nothing is waiting", async () => {
    expect(await fetchModerationQueue()).toEqual([]);
  });
});
