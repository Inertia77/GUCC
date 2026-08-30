(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GuccCreatorPublishCloudSafety = api;
  if (root && typeof root.fetch === "function" && typeof root.document !== "undefined") api.install(root);
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const GUARD_MARK = "__guccCreatorPublishCloudSafetyV1";

  function requestUrl(resource) {
    if (typeof resource === "string") return resource;
    if (resource && typeof resource.url === "string") return resource.url;
    return "";
  }

  function isCreatorApiUrl(resource) {
    return requestUrl(resource).includes("/functions/v1/creator-project-api");
  }

  function sanitizePublishState(state) {
    if (!state || typeof state !== "object" || Array.isArray(state)) return state;
    const next = { ...state };
    if (state.common && typeof state.common === "object" && !Array.isArray(state.common)) {
      next.common = { ...state.common };
      delete next.common.videoPath;
      delete next.common.coverPath;
    }
    return next;
  }

  function sanitizeFetchInit(resource, init) {
    if (!isCreatorApiUrl(resource) || !init || String(init.method || "GET").toUpperCase() !== "POST" || typeof init.body !== "string") return init;
    let payload;
    try { payload = JSON.parse(init.body); }
    catch { return init; }
    if (payload?.action !== "saveRelease" || !payload.publishState || typeof payload.publishState !== "object") return init;
    return {
      ...init,
      body: JSON.stringify({ ...payload, publishState: sanitizePublishState(payload.publishState) }),
    };
  }

  function install(target = root) {
    if (!target || typeof target.fetch !== "function" || target[GUARD_MARK]) return false;
    const originalFetch = target.fetch.bind(target);
    target.fetch = function guardedCreatorFetch(resource, init) {
      return originalFetch(resource, sanitizeFetchInit(resource, init));
    };
    Object.defineProperty(target, GUARD_MARK, { value: true, configurable: false, enumerable: false, writable: false });
    return true;
  }

  return Object.freeze({ sanitizePublishState, sanitizeFetchInit, install });
});
