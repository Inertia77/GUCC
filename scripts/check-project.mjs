import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
let checkedFiles = 0;

function walk(dir, extensions) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return walk(path, extensions);
    return extensions.has(extname(entry.name)) ? [path] : [];
  });
}

function checkSyntax(file, extraArgs = []) {
  const result = spawnSync(process.execPath, [...extraArgs, '--check', '--input-type=module'], {
    encoding: 'utf8',
    input: readFileSync(file, 'utf8')
  });
  checkedFiles += 1;
  if (result.status !== 0) {
    errors.push(`${file}: ${result.stderr?.trim() || result.stdout?.trim() || result.error?.message || `Node exited with status ${result.status}, signal ${result.signal}`}`);
  }
}

function checkTypeScriptModule(file) {
  const bootstrap = `
    globalThis.Deno = {
      env: { get: () => '' },
      serve: () => undefined
    };
    await import(${JSON.stringify(pathToFileURL(file).href)});
  `;
  const result = spawnSync(process.execPath, [
    '--experimental-strip-types',
    '--input-type=module',
    '--eval',
    bootstrap
  ], { encoding: 'utf8' });
  checkedFiles += 1;
  if (result.status !== 0) {
    errors.push(`${file}: ${result.stderr?.trim() || result.stdout?.trim() || result.error?.message || `Node exited with status ${result.status}, signal ${result.signal}`}`);
  }
}

function checkImports(file) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+)['"]/g)) {
    const target = resolve(dirname(file), match[1]);
    if (!existsSync(target)) errors.push(`${file}: 找不到导入文件 ${match[1]}`);
  }
}

function checkHtmlLinks(file) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
    const value = match[1];
    if (/^(?:[a-z]+:|#|\/\/|\$)/i.test(value) || value.includes('${')) continue;
    const clean = decodeURIComponent(value.split(/[?#]/, 1)[0]);
    const target = resolve(dirname(file), clean);
    if (!existsSync(target)) errors.push(`${file}: 断开的相对链接 ${value}`);
    else if (clean.endsWith('/') && !statSync(target).isDirectory()) {
      errors.push(`${file}: ${value} 应该指向目录`);
    }
  }
}

function checkInlineScripts(file) {
  const source = readFileSync(file, 'utf8');
  const scripts = [...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter((script) => script.trim());
  scripts.forEach((script, index) => {
    checkedFiles += 1;
    try {
      new Function(script);
    } catch (error) {
      errors.push(`${file}: 内联脚本 ${index + 1} 语法错误：${error.message}`);
    }
  });
}

const appSource = resolve(root, 'apps', 'command-center', 'src');
const appScripts = walk(appSource, new Set(['.js', '.mjs']));
for (const file of appScripts) {
  checkSyntax(file);
  checkImports(file);
  if (/-v\d+(?:[._-]|$)/i.test(basename(file))) {
    errors.push(`Command Center 源码不应使用手工版本文件名：${basename(file)}；请使用 Git 历史管理版本`);
  }
}
checkSyntax(resolve(root, 'assets', 'access-guard.js'));
checkSyntax(resolve(root, 'assets', 'creator-dashboard-core.mjs'));
checkSyntax(resolve(root, 'assets', 'creator-dashboard.mjs'));
checkSyntax(resolve(root, 'assets', 'creator-pipeline-core.mjs'));
checkSyntax(resolve(root, 'assets', 'creator-pipeline-bridge.mjs'));
checkSyntax(resolve(root, 'assets', 'pwa-install.js'));
checkSyntax(resolve(root, 'sw.js'));
checkSyntax(resolve(root, 'reference', 'resource-library-v5.js'));

const researchSourcesPath = resolve(root, 'data', 'imports', 'gacha-leak-sources-2026-08-07.json');
try {
  const researchSources = JSON.parse(readFileSync(researchSourcesPath, 'utf8'));
  if (!Array.isArray(researchSources.sites) || researchSources.sites.length === 0) {
    errors.push('前瞻资料源 JSON 缺少 sites 列表');
  } else {
    const sourceIds = new Set();
    for (const source of researchSources.sites) {
      for (const field of ['id', 'name', 'url', 'status', 'reliability']) {
        if (!source[field]) errors.push(`前瞻资料源缺少 ${field}：${source.id || source.name || 'unknown'}`);
      }
      if (sourceIds.has(source.id)) errors.push(`前瞻资料源存在重复 id：${source.id}`);
      sourceIds.add(source.id);
    }
  }
} catch (error) {
  errors.push(`${researchSourcesPath}: 前瞻资料源 JSON 无法解析: ${error.message}`);
}

checkTypeScriptModule(resolve(root, 'supabase', 'functions', 'gameup-api', 'index.ts'));
checkTypeScriptModule(resolve(root, 'supabase', 'functions', 'creator-project-api', 'index.ts'));

const manifestPath = resolve(root, 'manifest.webmanifest');
try {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.display !== 'standalone') errors.push('PWA manifest display 必须为 standalone');
  if (manifest.start_url !== './') errors.push('PWA manifest start_url 必须保持在项目根目录');
  for (const icon of manifest.icons || []) {
    const iconPath = icon.src.split(/[?#]/, 1)[0];
    if (!existsSync(resolve(root, iconPath))) errors.push(`PWA 图标不存在: ${icon.src}`);
  }
} catch (error) {
  errors.push(`${manifestPath}: PWA manifest 无法解析: ${error.message}`);
}

const portalHtml = resolve(root, 'index.html');
const appHtml = resolve(root, 'apps', 'command-center', 'index.html');
const workspaceHtml = resolve(root, 'apps', 'video-workspace', 'index.html');
const workspacePrompts = resolve(root, 'apps', 'video-workspace', 'ai-prompts.js');
const productionSystemHtml = resolve(root, 'apps', 'video-workspace', 'production-system', 'index.html');
const productionSystemEngine = resolve(root, 'apps', 'video-workspace', 'production-system', 'engine.js');
const productionSystemApp = resolve(root, 'apps', 'video-workspace', 'production-system', 'app.js');
const coverGeneratorHtml = resolve(root, 'apps', 'cover-generator', 'index.html');
const publishingConsoleHtml = resolve(root, 'apps', 'publishing-console', 'index.html');
const publishingConsoleApp = resolve(root, 'apps', 'publishing-console', 'app.js');
const publishingConsoleRules = resolve(root, 'apps', 'publishing-console', 'platform-rules.js');
const publisherAssistantServer = resolve(root, 'scripts', 'publisher-assistant', 'server.cjs');
const publisherAssistantAdapters = resolve(root, 'scripts', 'publisher-assistant', 'adapters.cjs');
checkSyntax(workspacePrompts);
checkSyntax(productionSystemEngine);
checkSyntax(productionSystemApp);
checkSyntax(publishingConsoleApp);
checkSyntax(publishingConsoleRules);
checkSyntax(publisherAssistantServer);
checkSyntax(publisherAssistantAdapters);
const htmlEntrypoints = [
  portalHtml,
  appHtml,
  workspaceHtml,
  productionSystemHtml,
  coverGeneratorHtml,
  publishingConsoleHtml,
  resolve(root, 'apps', 'gameup-command-center', 'index.html'),
  resolve(root, 'docs', 'supabase-setup.html'),
  resolve(root, 'reference', 'ai-prompts.html'),
  resolve(root, 'reference', 'resource-library.html'),
  resolve(root, 'reference', 'story-library.html')
];
htmlEntrypoints.forEach(checkHtmlLinks);
checkInlineScripts(workspaceHtml);
checkInlineScripts(coverGeneratorHtml);
checkInlineScripts(resolve(root, 'reference', 'ai-prompts.html'));
checkInlineScripts(resolve(root, 'reference', 'story-library.html'));

const portalSource = readFileSync(portalHtml, 'utf8');
if (!portalSource.includes('href="./apps/video-workspace/"')) {
  errors.push('GUCC Portal 没有指向稳定的视频工作台入口');
}
if (!portalSource.includes('href="./apps/command-center/"')) {
  errors.push('GUCC Portal 没有指向 Command Center');
}
if (!portalSource.includes('href="./apps/cover-generator/"')) {
  errors.push('GUCC Portal 没有指向封面生成器');
}
if (!portalSource.includes('href="./apps/publishing-console/"')) {
  errors.push('GUCC Portal 没有指向发布与复盘控制台');
}

const publishingConsoleSource = readFileSync(publishingConsoleHtml, 'utf8');
for (const expected of [
  'data-state="project.title"',
  'id="platformForms"',
  'id="runChecksButton"',
  'id="executionList"',
  'id="snapshotForm"',
  'id="copyReviewPromptButton"',
  'id="oneClickPrepareButton"',
  'id="assistantState"',
  'data-state="common.videoPath"'
]) {
  if (!publishingConsoleSource.includes(expected)) errors.push(`发布控制台缺少关键工作流标记：${expected}`);
}
for (const legacyRootFile of ['CUCC_index_v3.8.8.html', 'CUCC_index_v3.8.9.html', 'GUCC_WorkSpace_v4.0.3.html']) {
  if (existsSync(resolve(root, legacyRootFile))) errors.push(`根目录不应保留版本化工作台文件：${legacyRootFile}`);
}

const workspaceSource = readFileSync(workspaceHtml, 'utf8');
if (!workspaceSource.includes('href="./production-system/"')) {
  errors.push('视频工作台缺少 AI Video Production System 入口');
}
const productionSystemSource = readFileSync(productionSystemHtml, 'utf8');
for (const expected of [
  'id="nextActionCard"',
  'id="lockGrid"',
  'id="projectList"',
  'data-action="sync-directory"',
  'src="./engine.js"',
  'src="./app.js?v=3"'
]) {
  if (!productionSystemSource.includes(expected)) errors.push(`AI Video Production System 缺少关键工作流标记：${expected}`);
}
const workspaceVersion = workspaceSource.match(/const TEMPLATE_VERSION = "([^"]+)"/)?.[1];
if (!workspaceVersion) {
  errors.push('视频工作台缺少 TEMPLATE_VERSION');
} else {
  for (const expected of [
    `<title>GUCC Studio v${workspaceVersion}`,
    `GUCC STUDIO · V${workspaceVersion.split('.')[0]}`,
    `value="v${workspaceVersion}"`
  ]) {
    if (!workspaceSource.includes(expected)) errors.push(`视频工作台版本显示不一致：缺少 ${expected}`);
  }
}
for (const expected of [
  'href="#sec-prestudy"><b>PS</b> 事前学习',
  'href="#sec-07"><b>07</b> 扩散',
  'href="#sec-08"><b>08</b> 复盘',
  'href="#sec-09"><b>09</b> 规则',
  'data-key="publishLog"',
  'data-key="diffusionPackage"',
  'data-key="diffusionLog"',
  'data-key="preStudyGoal"',
  'data-key="preStudyNotes"',
  'data-key="ckPreStudy"',
  'data-key="ckDiffuse"'
]) {
  if (!workspaceSource.includes(expected)) errors.push(`视频工作台缺少关键工作流标记：${expected}`);
}

const videoPublishBatch = readFileSync(resolve(root, 'automation', '创作中心', '01-publishing.bat'), 'utf8');
const diffusionBatch = readFileSync(resolve(root, 'automation', '创作中心', '02-post-diffusion.bat'), 'utf8');
for (const videoHost of ['member.bilibili.com', 'studio.youtube.com', 'tiktok.com/tiktokstudio/upload']) {
  if (!videoPublishBatch.includes(videoHost)) errors.push(`正式发布脚本缺少视频入口：${videoHost}`);
}
for (const nonVideoHost of ['mp.weixin.qq.com', 'weibo.com', 'x.com/compose/post', 'hoyolab.com/newArticle']) {
  if (videoPublishBatch.includes(nonVideoHost)) errors.push(`正式发布脚本仍混入非视频入口：${nonVideoHost}`);
  if (!diffusionBatch.includes(nonVideoHost)) errors.push(`后期扩散脚本缺少入口：${nonVideoHost}`);
}

const appSources = [readFileSync(appHtml, 'utf8'), ...appScripts.map((file) => readFileSync(file, 'utf8'))];
const characterFeatureSource = readFileSync(resolve(appSource, 'features', 'characters.js'), 'utf8');
const partyFeatureSource = readFileSync(resolve(appSource, 'features', 'parties.js'), 'utf8');
for (const [source, field] of [
  [characterFeatureSource, 'research_status'],
  [characterFeatureSource, 'build_status'],
  [partyFeatureSource, 'status'],
  [partyFeatureSource, 'hold_status']
]) {
  if (!source.includes(`<select name="${field}" required>`)) {
    errors.push(`固定状态字段 ${field} 必须在编辑器中使用必选下拉框`);
  }
  if (source.includes(`<input name="${field}"`)) {
    errors.push(`固定状态字段 ${field} 不应在编辑器中使用自由输入框`);
  }
}
const declaredIds = new Set();
const duplicateHtmlIds = new Set();
for (const match of appSources[0].matchAll(/\bid=["']([^"']+)["']/g)) {
  if (declaredIds.has(match[1])) duplicateHtmlIds.add(match[1]);
  declaredIds.add(match[1]);
}
for (const source of appSources.slice(1)) {
  for (const match of source.matchAll(/\bid=["']([^"']+)["']/g)) declaredIds.add(match[1]);
  for (const match of source.matchAll(/\.id\s*=\s*["']([A-Za-z][\w-]*)["']/g)) declaredIds.add(match[1]);
}
for (const id of duplicateHtmlIds) errors.push(`${appHtml}: 重复的 id="${id}"`);
for (const source of appSources.slice(1)) {
  for (const match of source.matchAll(/\$\(["']#([A-Za-z][\w-]*)["']\)/g)) {
    if (!declaredIds.has(match[1])) errors.push(`前端代码引用了不存在的 #${match[1]}`);
  }
}

const backendSql = readFileSync(resolve(root, 'supabase', 'sql', '02-install-command-center.sql'), 'utf8');
if (/\bg\.name\b/.test(backendSql)) errors.push('SQL 仍引用不存在的 games.name');
if (/\bcp\.like_level\b/.test(backendSql)) errors.push('SQL 仍从错误的 character_progress 读取 like_level');
if (/\bcp\.research_note\b/.test(backendSql)) errors.push('SQL 仍引用不存在的 character_progress.research_note');
if (!/\bcp\.progress_note\s+as\s+research_note\b/i.test(backendSql)) {
  errors.push('SQL 没有把 character_progress.progress_note 映射为前端 research_note');
}
if (/grant execute[\s\S]{0,120}\bto authenticated\b/i.test(backendSql)) {
  errors.push('管理 RPC 不应授权给 authenticated');
}

const windowsLauncher = readFileSync(resolve(root, 'scripts', 'serve-windows.bat'), 'utf8');
const macLauncher = readFileSync(resolve(root, 'scripts', 'serve-macos.command'), 'utf8');
if (!windowsLauncher.includes('%~dp0\\..')) errors.push('Windows 启动脚本没有切换到仓库根目录');
if (!macLauncher.includes('$(dirname "$0")/..')) errors.push('macOS 启动脚本没有切换到仓库根目录');

const requiredTopLevel = ['apps', 'assets', 'automation', 'data', 'docs', 'reference', 'scripts', 'supabase'];
for (const directory of requiredTopLevel) {
  if (!existsSync(resolve(root, directory))) errors.push(`缺少一级目录：${directory}`);
}
const topLevelNames = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const obsoleteTopLevel = [
  'BackupFromOld',
  'Batches_GameUp_Creator',
  'Batches_Games_Info',
  'Data',
  'Prompts',
  'Query_Manual',
  'Temp',
  'sql',
  'tools'
];
for (const directory of obsoleteTopLevel) {
  if (topLevelNames.includes(directory)) errors.push(`仍存在旧一级目录：${directory}`);
}

for (const batchFile of walk(resolve(root, 'automation'), new Set(['.bat']))) {
  const content = readFileSync(batchFile, 'utf8').trim();
  if (content.startsWith('```') || content.endsWith('```')) {
    errors.push(`${batchFile}: 批处理文件不应包含 Markdown 代码围栏`);
  }
}

if (errors.length) {
  console.error(`项目检查失败（${errors.length} 项）：`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`项目检查通过：${checkedFiles} 个脚本，应用入口、稳定模块名、工作台版本与 SQL 回归检查正常。`);
