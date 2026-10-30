import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePage, seriesKey, collectEpisodes, cleanName } from '../../extension/lib/titles.js';
import { validatePack } from '../../extension/lib/packs/schema.js';
import { verifyPack, sha256Hex } from '../../extension/lib/packs/verify.js';
import { matchHost } from '../../extension/lib/packs/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(__dirname, '..');

const dizipal = JSON.parse(fs.readFileSync(path.join(repoDir, 'packs', 'dizipal.json'), 'utf8'));
const hdfilm = JSON.parse(fs.readFileSync(path.join(repoDir, 'packs', 'hdfilmcehennemi.json'), 'utf8'));
const tranime = JSON.parse(fs.readFileSync(path.join(repoDir, 'packs', 'tranimeizle.json'), 'utf8'));

test('all packs pass schema validation and signature verification', async () => {
  assert.strictEqual(validatePack(dizipal).ok, true);
  assert.strictEqual(validatePack(hdfilm).ok, true);
  assert.deepStrictEqual(validatePack(tranime).errors, []);

  const repo = JSON.parse(fs.readFileSync(path.join(repoDir, 'repo.json'), 'utf8'));
  const index = JSON.parse(fs.readFileSync(path.join(repoDir, 'index.json'), 'utf8'));
  assert.strictEqual(index.packs.length, 3);

  for (const entry of index.packs) {
    const raw = new Uint8Array(fs.readFileSync(path.join(repoDir, entry.file)));
    const sig = fs.readFileSync(path.join(repoDir, entry.file + '.sig'), 'utf8').trim();
    assert.strictEqual(await sha256Hex(raw), entry.sha256, `sha256 match for ${entry.id}`);
    assert.strictEqual(await verifyPack(raw, sig, repo.publicKey), true, `sig valid for ${entry.id}`);
  }
});

test('dizipal host patterns match numbered domains', () => {
  assert.ok(dizipal.hosts.some(h => matchHost(h, 'dizipal1822.com')));
  assert.ok(dizipal.hosts.some(h => matchHost(h, 'dizipal1823.com')));
  assert.ok(dizipal.hosts.some(h => matchHost(h, 'www.dizipal1822.com')));
});

test('dizipal episode page parsing and slug fallback', () => {
  const r = parsePage({
    url: 'https://dizipal1822.com/dizi/mobland/2-sezon/6-bolum',
    title: 'MobLand 2. Sezon 6. Bölüm İzle | Dizipal',
    ogTitle: 'MobLand 2. Sezon 6. Bölüm İzle | Dizipal',
    h1: '6. Bölüm',
  }, dizipal);
  assert.deepStrictEqual(r, { kind: 'episode', name: 'MobLand', season: 2, episode: 6, year: null });

  const slugFallback = parsePage({
    url: 'https://dizipal1822.com/dizi/the-last-of-us/1-sezon/3-bolum',
    title: '',
  }, dizipal);
  assert.strictEqual(slugFallback.name, 'The Last Of Us');
  assert.strictEqual(slugFallback.season, 1);
  assert.strictEqual(slugFallback.episode, 3);

  assert.strictEqual(
    cleanName('Breaking Bad 1. Sezon 2. Bölüm Türkçe Altyazılı İzle - Dizipal', dizipal),
    'Breaking Bad',
  );
});

test('dizipal seriesKey and collectEpisodes', () => {
  const page = 'https://dizipal1822.com/dizi/mobland/2-sezon/6-bolum';
  assert.strictEqual(seriesKey(page, dizipal), 'dizipal1822.com/mobland');
  const eps = collectEpisodes(page, [
    { href: 'https://dizipal1822.com/dizi/mobland/2-sezon/7-bolum', text: '7. Bölüm' },
    { href: 'https://dizipal1822.com/dizi/mobland/1-sezon/1-bolum', text: '1. Bölüm' },
    { href: 'https://dizipal1822.com/dizi/other/2-sezon/1-bolum', text: 'x' },
    { href: 'https://dizipal1822.com/dizi/mobland/2-sezon/7-bolum#c', text: 'dup' },
    { href: 'https://dizipal1822.com/yeni', text: 'Yeni' },
  ], dizipal);
  assert.deepStrictEqual(eps.map(e => `${e.season}x${e.episode}`), ['1x1', '2x7']);
});

test('hdfilmcehennemi movie page parsing', () => {
  assert.ok(hdfilm.hosts.some(h => matchHost(h, 'www.hdfilmcehennemi.nl')));
  assert.ok(hdfilm.hosts.some(h => matchHost(h, 'hdfilmcehennemi.nl')));

  const r = parsePage({
    url: 'https://www.hdfilmcehennemi.nl/clean-hands-2026/',
    title: 'Clean Hands izle | Hdfilmcehennemi | Film izle | HD Film izle',
  }, hdfilm);
  assert.deepStrictEqual(r, { kind: 'movie', name: 'Clean Hands', season: null, episode: null, year: 2026 });
});

// ---------- tranimeizle ----------
// Series page: /anime/<slug>[-<s>-sezon]-izle[-<n>]. Episode page: /<slug>[-<s>-sezon]-<e>-bolum-izle[-<n>].
// The first season carries no season in the address. Titles seen on 2026-10-30:
// "Ranma 2024 İzle - Anime izle" (series), "Ranma 2024 1. Bölüm İzle - Anime izle" (episode).

test('tranimeizle hosts', () => {
  for (const h of ['www.tranimeizle.live', 'tranimeizle.live', 'www.tranimeizle.io', 'tranimeizle.net']) {
    assert.ok(tranime.hosts.some(p => matchHost(p, h)), h);
  }
  assert.ok(!tranime.hosts.some(p => matchHost(p, 'tranimeizle.live.evil.example')));
});

test('tranimeizle episode page: season 1 without a season in the address', () => {
  const r = parsePage({
    url: 'https://www.tranimeizle.live/ranma-2024-1-bolum-izle',
    title: 'Ranma 2024 1. Bölüm İzle - Anime izle',
    ogTitle: 'Ranma 2024 1. Bölüm İzle',
    h1: 'Ranma 2024 1. Bölüm İzle',
  }, tranime);
  assert.deepStrictEqual(r, { kind: 'episode', name: 'Ranma 2024', season: 1, episode: 1, year: null });

  const s2 = parsePage({
    url: 'https://www.tranimeizle.live/ranma-2024-2-sezon-5-bolum-izle-1',
    title: 'Ranma 2024 2. Sezon 5. Bölüm İzle - Anime izle',
    ogTitle: 'Ranma 2024 2. Sezon 5. Bölüm İzle',
  }, tranime);
  assert.deepStrictEqual(s2, { kind: 'episode', name: 'Ranma 2024', season: 2, episode: 5, year: null });

  const noTitle = parsePage({ url: 'https://www.tranimeizle.live/kami-no-tou-tower-of-god-2-sezon-13-bolum-izle', title: '' }, tranime);
  assert.deepStrictEqual(noTitle, { kind: 'episode', name: 'Kami No Tou Tower Of God', season: 2, episode: 13, year: null });
});

test('tranimeizle series page is not an episode and keeps the series name', () => {
  const r = parsePage({
    url: 'https://www.tranimeizle.live/anime/Ranma-2024-izle-1',
    title: 'Ranma 2024 İzle - Anime izle',
    ogTitle: 'Ranma 2024 izle',
    h1: 'Ranma 2024 İzle',
  }, tranime);
  assert.strictEqual(r.kind, 'movie');
  assert.strictEqual(r.name, 'Ranma 2024');
  assert.strictEqual(r.episode, null);
});

test('tranimeizle: series page and its episodes share one key; a bot-trap link is not an episode', () => {
  const page = 'https://www.tranimeizle.live/anime/Ranma-2024-izle-1';
  const key = seriesKey(page, tranime);
  assert.strictEqual(key, 'tranimeizle.live/ranma-2024');
  assert.strictEqual(seriesKey('https://www.tranimeizle.live/ranma-2024-12-bolum-izle', tranime), key);
  assert.strictEqual(seriesKey('https://www.tranimeizle.live/anime/Ranma-2024-2-sezon-izle-1', tranime), key);
  assert.strictEqual(seriesKey('https://www.tranimeizle.live/ranma-2024-2-sezon-3-bolum-izle', tranime), key);
  // Another series whose slug is a prefix of this one is another series.
  assert.notStrictEqual(seriesKey('https://www.tranimeizle.live/anime/ranma-izle', tranime), key);
  assert.notStrictEqual(seriesKey('https://www.tranimeizle.live/ranma-3-bolum-izle', tranime), key);

  const eps = collectEpisodes(page, [
    { href: 'https://www.tranimeizle.live/ranma-2024-1-bolum-izle', text: 'Ranma 2024 1. Bölüm İzle 06 Eki 2024' },
    { href: 'https://www.tranimeizle.live/ranma-2024-12-bolum-izle', text: 'Ranma 2024 12. Bölüm İzle Final 21 Ara 2024' },
    { href: 'https://www.tranimeizle.live/ranma-2024-2-sezon-1-bolum-izle', text: '1. Bölüm' },
    { href: 'https://www.tranimeizle.live/ranma-3-bolum-izle', text: 'other series' },
    // The page carries a hidden link to a made-up episode address (a bot trap); it is not this series.
    { href: 'https://www.tranimeizle.live/icerik-denetim-q4x9-1-bolum-izle', text: '.' },
    { href: 'https://www.tranimeizle.live/anime/Ranma-2024-2-sezon-izle-1', text: '2. Sezon' },
  ], tranime);
  assert.deepStrictEqual(eps.map(e => `${e.season}x${e.episode}`), ['1x1', '1x12', '2x1']);
});
