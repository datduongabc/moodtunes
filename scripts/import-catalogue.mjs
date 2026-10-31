// Catalogue import (CMP-BE-05): Jamendo tracks into public.songs, then seed tags from 20 seed profiles.
// Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... JAMENDO_CLIENT_ID=... node scripts/import-catalogue.mjs [count]
// Re-running refreshes the dates of seed tags so that weekly charts always have data.
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JAMENDO_CLIENT_ID } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !JAMENDO_CLIENT_ID) {
  console.error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and JAMENDO_CLIENT_ID');
  process.exit(1);
}
const TARGET = Number(process.argv[2] ?? 300);
const SEED_USERS = 20;
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Jamendo "vartags" and genres mapped to the eight moods
const MOOD_WORDS = {
  happy: ['happy', 'joyful', 'cheerful', 'fun', 'uplifting', 'positive', 'summer', 'pop'],
  sad: ['sad', 'melancholic', 'melancholy', 'dark', 'emotional', 'dramatic', 'piano'],
  motivated: ['energetic', 'powerful', 'motivational', 'epic', 'action', 'sport', 'electronic', 'dance'],
  relaxed: ['relaxing', 'calm', 'chill', 'peaceful', 'soft', 'lounge', 'ambient', 'acoustic'],
  focused: ['ambient', 'minimal', 'instrumental', 'lofi', 'study', 'meditative', 'classical', 'atmospheric'],
  romantic: ['romantic', 'love', 'tender', 'sensual', 'jazz', 'soul'],
  nostalgic: ['nostalgic', 'retro', 'vintage', 'folk', 'oldies', 'dreamy'],
  angry: ['aggressive', 'angry', 'metal', 'hardrock', 'punk', 'heavy', 'rock'],
};
const MOODS = Object.keys(MOOD_WORDS);

const licenseName = (url) => {
  const m = /licenses\/([a-z-]+)\/([0-9.]+)/i.exec(url ?? '');
  return m ? `CC ${m[1].toUpperCase()} ${m[2]}` : 'Creative Commons';
};

// deterministic pseudo-random numbers so a re-run produces the same tag distribution
let seed = 42;
const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

function moodScores(track) {
  const words = [...(track.musicinfo?.tags?.vartags ?? []), ...(track.musicinfo?.tags?.genres ?? [])].map((w) =>
    String(w).toLowerCase(),
  );
  const scores = Object.fromEntries(MOODS.map((m) => [m, 0]));
  for (const w of words) for (const m of MOODS) if (MOOD_WORDS[m].includes(w)) scores[m]++;
  if (track.musicinfo?.vocalinstrumental === 'instrumental') scores.focused += 0.5;
  return Object.entries(scores).sort((a, b) => b[1] - a[1]);
}

async function fetchTracks() {
  // Jamendo returns at most 200 results per ordering, so several orderings are combined without duplicates
  const orders = ['popularity_total', 'popularity_month', 'downloads_total', 'listens_total', 'popularity_week'];
  const byId = new Map();
  for (const order of orders) {
    if (byId.size >= TARGET) break;
    const url = new URL('https://api.jamendo.com/v3.0/tracks/');
    url.search = new URLSearchParams({
      client_id: JAMENDO_CLIENT_ID,
      format: 'json',
      limit: '200',
      order,
      include: 'musicinfo licenses',
      audioformat: 'mp32',
      imagesize: '300',
    }).toString();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Jamendo HTTP ${res.status}`);
    const body = await res.json();
    if (body.headers?.status !== 'success') throw new Error(`Jamendo: ${body.headers?.error_message}`);
    let added = 0;
    for (const t of body.results) {
      if (byId.has(t.id)) continue;
      if (t.audio?.startsWith('https://') && t.duration > 30 && /creativecommons\.org/.test(t.license_ccurl ?? '')) {
        byId.set(t.id, t);
        added++;
      }
    }
    console.log(`Jamendo order=${order}: ${body.results.length} results, ${added} new`);
  }
  if (byId.size === 0) throw new Error('Jamendo returned no usable tracks');
  return [...byId.values()].slice(0, TARGET);
}

async function seedUsers() {
  const ids = [];
  for (let i = 1; i <= SEED_USERS; i++) {
    const email = `seed${String(i).padStart(2, '0')}@seed.moodtunes.app`;
    const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
    let user = list.users.find((u) => u.email === email);
    if (!user) {
      const { data, error } = await db.auth.admin.createUser({
        email,
        password: crypto.randomUUID(),
        email_confirm: true,
      });
      if (error) throw error;
      user = data.user;
    }
    await db
      .from('profiles')
      .update({ is_seed: true, display_name: `Seed listener ${i}` })
      .eq('id', user.id);
    ids.push(user.id);
  }
  return ids;
}

async function main() {
  console.log(`Fetching ${TARGET} tracks from Jamendo`);
  const tracks = await fetchTracks();
  const rows = tracks.map((t) => ({
    jamendo_id: String(t.id),
    title: t.name,
    artist_name: t.artist_name,
    album_name: t.album_name || null,
    duration_sec: Number(t.duration),
    audio_url: t.audio,
    image_url: t.image || t.album_image || null,
    license_name: licenseName(t.license_ccurl),
    license_url: t.license_ccurl,
    is_seed: true,
  }));
  const { data: songs, error } = await db
    .from('songs')
    .upsert(rows, { onConflict: 'jamendo_id' })
    .select('id, jamendo_id');
  if (error) throw error;
  console.log(`Upserted ${songs.length} songs`);

  const users = await seedUsers();
  const byJamendo = new Map(songs.map((s) => [s.jamendo_id, s.id]));
  const tags = [];
  const now = Date.now();
  for (const t of tracks) {
    const songId = byJamendo.get(String(t.id));
    const ranked = moodScores(t);
    const primary = ranked[0][1] > 0 ? ranked[0][0] : pick(MOODS);
    const secondary = ranked[1][1] > 0 ? ranked[1][0] : pick(MOODS.filter((m) => m !== primary));
    const shuffled = [...users].sort(() => rand() - 0.5);
    const nPrimary = 5 + Math.floor(rand() * 9); // 5 to 13 votes
    const nSecondary = Math.floor(rand() * 5); // 0 to 4 votes
    shuffled.slice(0, nPrimary).forEach((u) => tags.push({ user_id: u, song_id: songId, mood_code: primary }));
    shuffled
      .slice(nPrimary, nPrimary + nSecondary)
      .forEach((u) => tags.push({ user_id: u, song_id: songId, mood_code: secondary }));
  }
  for (const tag of tags) {
    const at = new Date(now - Math.floor(rand() * 6 * 86_400_000)).toISOString(); // within the last 6 days
    tag.created_at = at;
    tag.updated_at = at;
    tag.context = rand() < 0.5 ? pick(['study', 'work', 'commute', 'workout']) : null;
  }
  for (let i = 0; i < tags.length; i += 500) {
    const { error: e } = await db
      .from('mood_tags')
      .upsert(tags.slice(i, i + 500), { onConflict: 'user_id,song_id,mood_code' });
    if (e) throw e;
  }
  console.log(`Upserted ${tags.length} seed tags`);
  const { error: e2 } = await db.rpc('refresh_charts');
  if (e2) throw e2;
  console.log('Charts refreshed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
