import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
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
    errors.push(`${file}: ${result.stderr.trim() || result.stdout.trim()}`);
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
    errors.push(`${file}: ${result.stderr.trim() || result.stdout.trim()}`);
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
    if (/^(?:[a-z]+:|#|\/\/)/i.test(value) || value.includes('${')) continue;
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
}

checkTypeScriptModule(resolve(root, 'supabase', 'functions', 'gameup-api', 'index.ts'));

const portalHtml = resolve(root, 'index.html');
const appHtml = resolve(root, 'apps', 'command-center', 'index.html');
const workspaceHtml = resolve(root, 'apps', 'video-workspace', 'index.html');
const coverGeneratorHtml = resolve(root, 'apps', 'cover-generator', 'index.html');
checkHtmlLinks(portalHtml);
checkHtmlLinks(appHtml);
checkHtmlLinks(workspaceHtml);
checkHtmlLinks(coverGeneratorHtml);
checkInlineScripts(workspaceHtml);
checkInlineScripts(coverGeneratorHtml);

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
for (const legacyRootFile of ['CUCC_index_v3.8.8.html', 'CUCC_index_v3.8.9.html', 'GUCC_WorkSpace_v4.0.3.html']) {
  if (existsSync(resolve(root, legacyRootFile))) errors.push(`根目录不应保留版本化工作台文件：${legacyRootFile}`);
}

const workspaceSource = readFileSync(workspaceHtml, 'utf8');
const workspaceVersion = workspaceSource.match(/const TEMPLATE_VERSION = "([^"]+)"/)?.[1];
if (!workspaceVersion) {
  errors.push('视频工作台缺少 TEMPLATE_VERSION');
} else {
  for (const expected of [
    `<title>GUCC WorkSpace v${workspaceVersion}`,
    `GUCC WorkSpace v${workspaceVersion} ·`,
    `value="v${workspaceVersion}"`
  ]) {
    if (!workspaceSource.includes(expected)) errors.push(`视频工作台版本显示不一致：缺少 ${expected}`);
  }
}

const appSources = [readFileSync(appHtml, 'utf8'), ...appScripts.map((file) => readFileSync(file, 'utf8'))];
const declaredIds = new Set();
const duplicateHtmlIds = new Set();
for (const match of appSources[0].matchAll(/\bid=["']([^"']+)["']/g)) {
  if (declaredIds.has(match[1])) duplicateHtmlIds.add(match[1]);
  declaredIds.add(match[1]);
}
for (const source of appSources.slice(1)) {
  for (const match of source.matchAll(/\bid=["']([^"']+)["']/g)) declaredIds.add(match[1]);
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

console.log(`项目检查通过：${checkedFiles} 个脚本，应用入口、工作台版本与 SQL 回归检查正常。`);
