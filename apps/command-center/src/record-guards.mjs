function normalizeIdentity(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase();
}

function rowCharacterName(row) {
  return row?.character_name ?? row?.name ?? '';
}

export function findDuplicateCharacter(rows, payload = {}) {
  if (payload.id) return null;
  const gameCode = normalizeIdentity(payload.game_code);
  const name = normalizeIdentity(payload.name);
  if (!gameCode || !name) return null;

  return (Array.isArray(rows) ? rows : []).find((row) => (
    normalizeIdentity(row?.game_code) === gameCode
    && normalizeIdentity(rowCharacterName(row)) === name
  )) || null;
}

export function assertNewCharacterUnique(rows, payload = {}) {
  const duplicate = findDuplicateCharacter(rows, payload);
  if (!duplicate) return;
  const displayName = String(payload.name || '').trim() || '该角色';
  throw new Error(`“${displayName}”在这个游戏中已经存在。为避免覆盖旧资料，请从列表进入“详情/编辑”，不要重复新增。`);
}

export function findDuplicateVersion(rows, payload = {}) {
  if (payload.id) return null;
  const gameCode = normalizeIdentity(payload.game_code);
  const versionNo = normalizeIdentity(payload.version_no);
  if (!gameCode || !versionNo) return null;

  return (Array.isArray(rows) ? rows : []).find((row) => (
    normalizeIdentity(row?.game_code) === gameCode
    && normalizeIdentity(row?.version_no) === versionNo
  )) || null;
}

export function assertNewVersionUnique(rows, payload = {}) {
  const duplicate = findDuplicateVersion(rows, payload);
  if (!duplicate) return;
  const displayVersion = String(payload.version_no || '').trim() || '该版本';
  throw new Error(`版本“${displayVersion}”在这个游戏中已经存在。为避免覆盖旧卡池资料，请编辑已有版本，不要重复新增。`);
}
