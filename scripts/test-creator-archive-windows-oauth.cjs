const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const oauth = await import(pathToFileURL(path.resolve(__dirname, '../scripts/creator-archive/google-drive-oauth.mjs')).href);
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&redirect_uri=http%3A%2F%2F127.0.0.1%3A7399%2Foauth2%2Fcallback&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file&state=test';
  const [command, args] = oauth.browserLaunchCommand(url, 'win32');
  assert.equal(command, 'explorer.exe');
  assert.deepEqual(args, [url]);
  assert.match(args[0], /&response_type=code&/);
  assert.notEqual(command.toLowerCase(), 'cmd', 'Windows OAuth must not use cmd /c start because & truncates query parameters');
  console.log('Creator Archive Windows OAuth browser launch test passed.');
})().catch((error) => { console.error(error); process.exit(1); });
