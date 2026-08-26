import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const storyRoot = resolve(root, 'reference', 'story-library', 'story-library');
const manifestPath = resolve(storyRoot, 'FILE_MANIFEST.md');
const statusPath = resolve(storyRoot, 'CURRENT_STATUS.json');
const indexPath = resolve(storyRoot, '00-index.md');
const htmlPath = resolve(root, 'reference', 'story-library.html');
const errors = [];
const warnings = [];

function walkMarkdown(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdown(path);
    return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
  });
}

function norm(path) {
  return path.replaceAll('\\', '/');
}

function storyManifestPath(absPath) {
  return `story-library/${norm(relative(storyRoot, absPath))}`;
}

function read(path) {
  return readFileSync(path, 'utf8');
}

for (const required of [storyRoot, manifestPath, statusPath, indexPath, htmlPath]) {
  if (!existsSync(required)) errors.push(`缺少 Story Library 必需路径：${relative(root, required)}`);
}

if (!errors.length) {
  const manifest = read(manifestPath);
  const manifestPaths = [...manifest.matchAll(/`(story-library\/[^`]+\.md)`/g)].map((match) => match[1]);
  const manifestSet = new Set(manifestPaths);
  if (manifestSet.size !== manifestPaths.length) {
    const seen = new Set();
    for (const path of manifestPaths) {
      if (seen.has(path)) errors.push(`FILE_MANIFEST.md 重复登记：${path}`);
      seen.add(path);
    }
  }

  for (const path of manifestSet) {
    const abs = resolve(storyRoot, path.replace(/^story-library\//, ''));
    if (!existsSync(abs)) errors.push(`FILE_MANIFEST.md 指向不存在文件：${path}`);
  }

  const actualMarkdown = walkMarkdown(storyRoot).map(storyManifestPath);
  for (const path of actualMarkdown) {
    if (!manifestSet.has(path)) errors.push(`实际 Markdown 未登记 FILE_MANIFEST.md：${path}`);
  }

  let status;
  try {
    status = JSON.parse(read(statusPath));
  } catch (error) {
    errors.push(`CURRENT_STATUS.json 无法解析：${error.message}`);
  }

  if (status?.games) {
    const index = read(indexPath);
    const today = new Date().toISOString().slice(0, 10);
    const coreFiles = ['README.md', '00-overview.md', '01-timeline.md', '02-factions.md', '03-characters.md', '04-mysteries.md', '05-video-hooks.md'];

    for (const [slug, game] of Object.entries(status.games)) {
      if (!game.maintenance) continue;
      const gameDir = resolve(storyRoot, 'games', slug);
      if (!existsSync(gameDir)) {
        errors.push(`CURRENT_STATUS 维护游戏目录不存在：${slug}`);
        continue;
      }
      for (const file of coreFiles) {
        if (!existsSync(resolve(gameDir, file))) errors.push(`${game.name} 缺少核心文件：${file}`);
      }
      if (!game.current_version) errors.push(`${game.name} 缺少 current_version`);
      if (!game.current_doc || !existsSync(resolve(gameDir, game.current_doc))) {
        errors.push(`${game.name} current_doc 不存在：${game.current_doc || '(empty)'}`);
      }
      const readme = existsSync(resolve(gameDir, 'README.md')) ? read(resolve(gameDir, 'README.md')) : '';
      if (game.current_version && !index.includes(game.current_version)) {
        errors.push(`根 00-index.md 未出现 ${game.name} 当前版本 ${game.current_version}`);
      }
      if (game.current_version && !readme.includes(game.current_version)) {
        errors.push(`${game.name} README 未出现当前版本 ${game.current_version}`);
      }
      if (game.library_version && game.library_version !== 'legacy' && !index.includes(game.library_version)) {
        errors.push(`根 00-index.md 未出现资料库版本 ${game.library_version}（${game.name}）`);
      }
      if (game.review_by && game.review_by < today) {
        warnings.push(`${game.name} 版本状态复核期限已过：review_by=${game.review_by}`);
      }
    }
  }

  const html = read(htmlPath);
  for (const marker of ['FILE_MANIFEST.md?catalog=', 'syncCatalogFromManifest', "cache:'no-store'", 'hiddenLegacyDocs']) {
    if (!html.includes(marker)) errors.push(`Story Library 前端缺少目录/缓存保护标记：${marker}`);
  }

  const requiredHiddenLegacy = [
    'games/honkai-star-rail/versions/1.0-1.3-xianzhou-luofu.md',
    'games/honkai-star-rail/versions/1.4-1.6-interlude.md',
    'games/honkai-star-rail/versions/2.0-2.3-penacony.md',
    'games/honkai-star-rail/versions/2.4-2.7-xianzhou-wardance.md',
    'games/honkai-star-rail/versions/3.0-3.7-amphoreus.md',
    'games/wuthering-waves/versions/2.1-2.3-rinascita-middle.md',
    'games/wuthering-waves/versions/2.4-2.6-rinascita-climax.md',
    'games/zenless-zone-zero/versions/0-prologue-phaethon.md',
    'games/arknights-endfield/versions/1.0-talos-ii-opening.md',
    'games/neverness-to-everness/versions/1.2-watchlist.md'
  ];
  for (const path of requiredHiddenLegacy) {
    if (!html.includes(path)) errors.push(`前端 hiddenLegacyDocs 缺少兼容路径：${path}`);
  }

  const compatBasenames = new Set([
    '1.0-1.3-xianzhou-luofu.md', '1.4-1.6-interlude.md', '2.0-2.3-penacony.md',
    '2.4-2.7-xianzhou-wardance.md', '3.0-3.7-amphoreus.md', '4.x-duoxiangleyuan.md',
    '2.1-2.3-rinascita-middle.md', '2.4-2.6-rinascita-climax.md',
    '0-prologue-phaethon.md', '1.0-cunning-hares-belobog-victoria.md', '1.1-public-security-jane.md',
    '1.2-sons-of-calydon.md', '1.3-1.4-section6-and-finale.md', '2.x-season-2-middle.md',
    '1.0-talos-ii-opening.md', '1.x-operator-and-region-notes.md',
    '1.0-hethereau-opening.md', '1.1-urban-anomaly-cases.md', '1.2-watchlist.md'
  ]);

  for (const abs of walkMarkdown(resolve(storyRoot, 'games'))) {
    const rel = norm(relative(storyRoot, abs));
    if (!rel.includes('/versions/')) continue;
    const basename = rel.split('/').pop();
    if (compatBasenames.has(basename)) continue;
    const source = read(abs);
    if (source.length < 2000) warnings.push(`正式版本章偏短，建议复核：${rel} (${source.length} chars)`);
    if (!/(来源锚点|来源与校对|校对依据|## 来源)/.test(source)) warnings.push(`正式版本章缺少来源区：${rel}`);
  }
}

for (const warning of warnings) console.warn(`WARN Story Library: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR Story Library: ${error}`);
  console.error(`Story Library check failed: ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}
console.log(`Story Library check passed: ${warnings.length} warning(s).`);
