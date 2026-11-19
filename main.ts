// Token Radar: a working token-radar-01 entry (Node 22, standard library only).
//
// The program reads the sealed snapshot from /input/snapshot.json (or --input <file|dir>),
// scores every pre-token protocol with the radar-2 model in lib/model.ts, writes the ranked
// board to /output/board.json, and copies this repository's dashboard/ and screenshots/ to
// /output. Last, it writes /output/dossier.json, the summary the judge reads, with the
// vendored make.fun library.
//
// radar-2, in one sentence: implied value is TVL times the category multiple (the median
// market-cap-per-TVL of the live-token protocols in that category, shrunk toward the global
// median so one comparable cannot set the price alone), times a growth multiplier from the
// seven-day change and a maturity multiplier from the time the protocol has run with no token.
// The multiples are computed from the snapshot at run time, never hardcoded, so the model
// follows the snapshot's own figures. Pre-token protocols are ranked by that implied value;
// live-token protocols are set aside with their market caps shown, never ranked.
//
// The dashboard is a static page, no framework and no network: dashboard/index.html,
// dashboard/app.css and dashboard/app.js read /output/data.js, which this program writes
// from the same board. It covers the watchlist, states the model, gives every protocol a
// farm plan, and lets the reader sort, filter and open a detail view with the model's own
// equation. The page recomputes each row from the snapshot figures, so its code and the
// board's data are visibly the same arithmetic.
//
// Before the board is written, validateBoard checks the gate's own shape: ranks exactly
// 1..N, implied values non-increasing, all 40 watchlist slugs present, every farm plan
// 3 to 12 steps of 20 to 600 characters. A board that fails any of those is refused here,
// not by the scorer. Pass --summary to print the top five rows and the category multiples
// after the write, for a quick human check of what was scored.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot, summarizeRadar } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

/** The scorer's own caps (reference/gate.json): the text cap shapes the bytes, the rest refuse. */
const TEXT_MAX_BYTES = 65_536;
const SCREENSHOT_CAPS = { max: 4, max_bytes: 524_288 };
const IMAGE_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

/** --name <value> out of the arguments, or the fallback. */
function arg(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  const withEquals = process.argv.find((a) => a.startsWith(`--${name}=`));
  return withEquals === undefined ? fallback : withEquals.slice(name.length + 3);
}

/** True when the flag is present on the command line, in either spelling. */
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`) || process.argv.includes(`--${name}=true`);
}

const inputArg = arg('input', '/input');
const inputFile = inputArg.endsWith('.json') ? inputArg : join(inputArg, 'snapshot.json');
if (!existsSync(inputFile)) {
  process.stderr.write(`token radar: no snapshot at ${inputFile}: pass --input <snapshot.json|directory> or mount the sealed /input\n`);
  process.exit(2);
}
const out = arg('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const snapshot = parseSnapshot(readFileSync(inputFile, 'utf8'));
const { board, radar } = buildRadar(snapshot);
const issue = boardIssue(board, snapshot);
if (issue !== null) {
  process.stderr.write(`token radar: the model wrote a board the gate refuses: ${issue}\n`);
  process.exit(1);
}

/**
 * The gate's own shape, checked here before anything is written: ranks exactly 1..N,
 * implied values non-increasing down the board, every watchlist slug present, and every
 * farm plan within its step and length bounds. Returns the first problem, or null.
 */
function validateBoard(rows: typeof board, watchlist: string[]): string | null {
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]!.rank !== i + 1) return `rank ${rows[i]!.rank} at position ${i + 1}: ranks must run 1..${rows.length}`;
    if (i > 0 && rows[i]!.implied_value_usd > rows[i - 1]!.implied_value_usd) {
      return `row ${i + 1} (${rows[i]!.slug}) implies more than row ${i} (${rows[i - 1]!.slug}): values must not increase`;
    }
    if (rows[i]!.implied_value_usd <= 0) return `row ${i + 1} (${rows[i]!.slug}) has no positive implied value`;
    const steps = rows[i]!.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `row ${i + 1} (${rows[i]!.slug}) has ${steps.length} farm steps, not 3 to 12`;
    for (const s of steps) {
      if (s.length < 20 || s.length > 600) return `row ${i + 1} (${rows[i]!.slug}) has a farm step of ${s.length} characters, not 20 to 600`;
    }
  }
  const seen = new Set(rows.map((r) => r.slug));
  for (const slug of watchlist) {
    if (!seen.has(slug)) return `watchlist slug ${slug} is missing from the board`;
  }
  return null;
}

const validation = validateBoard(board, snapshot.watchlist);
if (validation !== null) {
  process.stderr.write(`token radar: the board fails its own validation: ${validation}\n`);
  process.exit(1);
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
writeFileSync(join(out, 'data.js'), dataScript(radar));

/** Copy one directory's regular files into `to`, skipping names that start with a dot. */
function copyFiles(from: string, to: string): string[] {
  if (!existsSync(from)) return [];
  mkdirSync(to, { recursive: true });
  const copied: string[] = [];
  for (const name of readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const path = join(from, name);
    if (!statSync(path).isFile()) continue;
    copyFileSync(path, join(to, name));
    copied.push(name);
  }
  return copied;
}

copyFiles(join(here, 'dashboard'), join(out, 'dashboard'));
const shots = copyFiles(join(here, 'screenshots'), join(out, 'screenshots'));
if (shots.length < 3) {
  process.stderr.write(`token radar: screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view\n`);
  process.exit(1);
}
for (const name of shots) {
  if (!IMAGE_NAME.test(name)) {
    process.stderr.write(`token radar: screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters\n`);
    process.exit(1);
  }
}

// The dossier is written last: the scorer rebuilds it from this /output and compares bytes.
writeFileSync(join(out, 'dossier.json'), buildDossier(out, { text_max_bytes: TEXT_MAX_BYTES, screenshots: SCREENSHOT_CAPS, dashboard: { max_files: 400, max_bytes: 4_194_304 } }));

process.stdout.write(
  `token radar: ${snapshot.protocols.length} protocols, ${snapshot.watchlist.length} on the watchlist, ${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live set aside)\n` +
    `token radar: wrote ${join(out, 'board.json')}, ${join(out, 'data.js')}, ${join(out, 'dashboard')} (3 files), ${join(out, 'screenshots')} (${shots.length} images) and ${join(out, 'dossier.json')}\n`,
);

if (flag('summary')) {
  process.stdout.write(summarizeRadar(board, radar, snapshot) + '\n');
}
