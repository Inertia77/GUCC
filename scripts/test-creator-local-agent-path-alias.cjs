"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const Core = require("./creator-local-agent/core.cjs");

(async () => {
  const workspaceRealRoot = path.resolve(path.sep, "canonical-workspace");
  const realProjectRoot = path.join(workspaceRealRoot, "project");
  const aliasProjectRoot = path.resolve(path.sep, "workspace-alias", "project");
  const relativePath = "03_AUDIO/AUDIO_MASTER.wav";
  const aliasFile = path.join(aliasProjectRoot, "03_AUDIO", "AUDIO_MASTER.wav");
  const realFile = path.join(realProjectRoot, "03_AUDIO", "AUDIO_MASTER.wav");
  const now = Date.now();
  const fakeStat = {
    size: 12,
    mtimeMs: now,
    isSymbolicLink: () => false,
    isFile: () => true,
  };
  const fsApi = {
    lstat: async (candidate) => {
      assert.equal(path.resolve(candidate), path.resolve(aliasFile));
      return fakeStat;
    },
    realpath: async (candidate) => {
      assert.equal(path.resolve(candidate), path.resolve(aliasFile));
      return realFile;
    },
  };

  const observed = await Core.observeLogicalArtifact({
    workspaceRealRoot,
    project: {
      projectId: "project_alias_test",
      projectRoot: aliasProjectRoot,
      realProjectRoot,
    },
    logicalFile: {
      id: "logical-audio",
      file_key: "AUDIO_MASTER",
      relative_path: relativePath,
    },
    cache: { version: 1, files: {} },
    fsApi,
    hashFile: async (candidate) => {
      assert.equal(path.resolve(candidate), path.resolve(realFile));
      return `sha256:${"a".repeat(64)}`;
    },
  });

  assert.equal(observed.availability, "present");
  assert.equal(observed.relativePath, relativePath);
  assert.equal(observed.checksum, `sha256:${"a".repeat(64)}`);

  await assert.rejects(() => Core.observeLogicalArtifact({
    workspaceRealRoot,
    project: {
      projectId: "project_escape_test",
      projectRoot: aliasProjectRoot,
      realProjectRoot: path.resolve(path.sep, "outside-workspace", "project"),
    },
    logicalFile: {
      id: "logical-audio",
      file_key: "AUDIO_MASTER",
      relative_path: relativePath,
    },
    cache: { version: 1, files: {} },
    fsApi,
  }), /Project resolves outside Workspace Root/);

  console.log("Creator Local Agent path-alias regression tests passed.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
