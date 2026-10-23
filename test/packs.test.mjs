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

test('both packs pass schema validation and signature verification', async () => {
  assert.strictEqual(validatePack(dizipal).ok, true);
  assert.strictEqual(validatePack(hdfilm).ok, true);

  const repo = JSON.parse(fs.readFileSync(path.join(repoDir, 'repo.json'), 'utf8'));
  const index = JSON.parse(fs.readFileSync(path.join(repoDir, 'index.json'), 'utf8'));
  assert.strictEqual(index.packs.length, 2);

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
