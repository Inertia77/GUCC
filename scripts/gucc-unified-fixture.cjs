"use strict";
// Isolated browser fixture; never contacts production or creates authentication users.
const fs = require("node:fs/promises"),
  path = require("node:path");
const root = path.resolve(__dirname, ".."),
  origin = "https://gucc.test",
  api = "https://api.gucc.test";
function fixture() {
  const projectRows = [
    {
      projectId: "A",
      name: "绝区零双视频",
      game: "绝区零",
      version: "3.3",
      lifecycle: "completed",
    },
    {
      projectId: "B",
      name: "鸣潮角色专题",
      game: "鸣潮",
      version: "3.7",
      lifecycle: "active",
    },
  ];
  const snapshots = {
    A: {
      projectId: "A",
      name: "绝区零双视频",
      videos: [
        { videoId: "FIONI", name: "菲欧妮解析" },
        { videoId: "SEVERIAN", name: "赛维里安解析" },
      ],
      promptFlow: [],
    },
    B: {
      projectId: "B",
      name: "鸣潮角色专题",
      videos: [{ videoId: "MAIN", name: "鸣潮角色解析" }],
      promptFlow: [],
    },
  };
  const O = require("../apps/video-workspace/production-system/orchestrator.js");
  for (const [id, s] of Object.entries(snapshots)) {
    snapshots[id] = O.createProject({
      ...s,
      workflowMode: "six",
      game: projectRows.find((p) => p.projectId === id).game,
      version: projectRows.find((p) => p.projectId === id).version,
    });
    O.buildWorkflow(snapshots[id]);
    O.compilePromptFlow(snapshots[id]);
    snapshots[id].status = "FLOW_READY";
  }
  const revisions = { A: 1, B: 1 };
  const videos = new Map(),
    deliverables = new Map(),
    versions = new Map(),
    writes = [],
    errors = [];
  for (const [id, s] of Object.entries(snapshots))
    for (const v of s.videos)
      videos.set(JSON.stringify([id, v.videoId, ""]), {
        project_id: id,
        video_id: v.videoId,
        title: v.name,
        legacy_branch: v.branch || v.videoId,
      });
  const key = (p, v, k = "") => JSON.stringify([p, v, k]);
  const reqJson = (route) => {
    try {
      return route.request().postDataJSON();
    } catch {
      return null;
    }
  };

  async function install(context) {
    const guard = await fs.readFile(
        path.join(root, "assets/access-guard.js"),
        "utf8",
      ),
      hash = guard.match(/ACCESS_HASH = '([^']+)'/)[1];
    await context.addInitScript((h) => {
      localStorage.setItem("gucc_access_hash_v2", h);
      localStorage.setItem(
        "gameup_session_v5",
        JSON.stringify({ access_token: "fixture", user: { id: "owner" } }),
      );
    }, hash);
    const handleRoute = async (route) => {
      const u = new URL(route.request().url()),
        method = route.request().method(),
        data = reqJson(route);
      if (u.origin === api) {
        const name = u.pathname.replace("/rest/v1/", "");
        if (name === "rpc/creator_os_save_project") {
          const id = data.p_project.projectId;
          if ((revisions[id] || null) !== data.p_expected_revision)
            return route.fulfill({
              status: 409,
              json: { message: "CREATOR_OS_REVISION_CONFLICT" },
            });
          snapshots[id] = data.p_project;
          revisions[id] = (revisions[id] || 0) + 1;
          if (!projectRows.some((p) => p.projectId === id))
            projectRows.push({
              projectId: id,
              name: data.p_project.name,
              game: data.p_project.game,
              version: data.p_project.version,
              lifecycle: "active",
            });
          for (const v of data.p_project.videos || [])
            videos.set(key(id, v.videoId), {
              project_id: id,
              video_id: v.videoId,
              title: v.name,
            });
          return route.fulfill({
            json: {
              project_id: id,
              project_data: snapshots[id],
              revision: revisions[id],
            },
          });
        }
        if (name === "rpc/creator_workspace_register_video") {
          const id = data.p_project_id,
            v = {
              videoId: data.p_video_id,
              branch: data.p_video_id,
              name: data.p_title,
            };
          snapshots[id].videos.push(v);
          revisions[id]++;
          const row = { project_id: id, video_id: v.videoId, title: v.name };
          videos.set(key(id, v.videoId), row);
          return route.fulfill({
            json: {
              video: row,
              snapshot: {
                project_id: id,
                project_data: snapshots[id],
                revision: revisions[id],
              },
            },
          });
        }
        if (name === "creator_os_publish_drafts")
          return route.fulfill({ json: [] });
        if (name === "rpc/creator_os_save_publish_draft")
          return route.fulfill({
            json: {
              conflict: false,
              current: {
                project_id: data.p_project_id,
                video_id: data.p_video_id,
                draft_data: data.p_draft,
                revision: 1,
              },
            },
          });
        if (name === "rpc/creator_os_portal_dashboard")
          return route.fulfill({ json: projectRows });
        if (name === "creator_os_workspace_snapshots") {
          const id = u.searchParams.get("project_id")?.replace(/^eq\./, "");
          return route.fulfill({
            json: (id && snapshots[id]
              ? [id]
              : id
                ? []
                : Object.keys(snapshots)
            ).map((id) => ({
              project_id: id,
              project_data: snapshots[id],
              revision: revisions[id],
            })),
          });
        }
        if (name === "creator_deliverable_versions") {
          const p = u.searchParams.get("project_id")?.replace(/^eq\./, ""),
            v = u.searchParams.get("video_id")?.replace(/^eq\./, ""),
            k = u.searchParams.get("deliverable_key")?.replace(/^eq\./, "");
          return route.fulfill({ json: versions.get(key(p, v, k)) || [] });
        }
        if (name === "creator_video_workspaces") {
          if (method === "POST") {
            writes.push({ kind: "video", data });
            const id = key(data.project_id, data.video_id);
            if (!videos.has(id)) videos.set(id, data);
            return route.fulfill({ json: [videos.get(id)] });
          }
          const id = u.searchParams.get("project_id")?.replace(/^eq\./, "");
          return route.fulfill({
            json: [...videos.values()].filter(
              (v) => !id || v.project_id === id,
            ),
          });
        }
        if (name === "creator_deliverable_records") {
          const p = u.searchParams.get("project_id")?.replace(/^eq\./, ""),
            v = u.searchParams.get("video_id")?.replace(/^eq\./, "");
          const k = u.searchParams.get("deliverable_key")?.replace(/^eq\./, "");
          if (method === "GET")
            return route.fulfill({
              json: [...deliverables.values()].filter(
                (r) => (!p || r.project_id === p) &&
                  (!v || r.video_id === v) && (!k || r.deliverable_key === k)
              ).sort((a,b)=>(a.video_id+":"+a.deliverable_key).localeCompare(b.video_id+":"+b.deliverable_key))
                .slice(Number(u.searchParams.get("offset")||0), Number(u.searchParams.get("offset")||0)+Number(u.searchParams.get("limit")||1000)),
            });
        }
        if (name === "rpc/creator_workspace_save_deliverable") {
          writes.push({ kind: "deliverable", data });
          const id = key(data.p_project_id, data.p_video_id, data.p_key),
            cur = deliverables.get(id);
          if ((cur?.revision || 0) !== data.p_expected_revision)
            return route.fulfill({
              status: 400,
              json: { message: "Revision conflict" },
            });
          if (
            data.p_status === "confirmed" &&
            (!data.p_evidence?.humanConfirmed ||
              (!(data.p_evidence?.confirmationMethod === "manual" && data.p_evidence?.confirmationSource === "human_ui") &&
                (!data.p_evidence?.fileName || !(data.p_evidence?.sizeBytes > 0))))
          )
            return route.fulfill({
              status: 400,
              json: {
                message: "Confirmed requires observed file and human QC",
              },
            });
          const row = {
            project_id: data.p_project_id,
            video_id: data.p_video_id,
            deliverable_key: data.p_key,
            status: data.p_status,
            evidence: data.p_evidence,
            review_note: data.p_note,
            revision: (cur?.revision || 0) + 1,
          };
          deliverables.set(id, row);
          versions.set(id, [
            {
              revision: row.revision,
              record: structuredClone(row),
              created_at: new Date().toISOString(),
            },
            ...(versions.get(id) || []),
          ]);
          return route.fulfill({ json: row });
        }
        return route.fulfill({
          status: 404,
          json: { message: "unmocked API " + u.pathname },
        });
      }
      if (u.origin !== origin) return route.abort();
      if (u.pathname === "/apps/command-center/src/config.js")
        return route.fulfill({
          contentType: "text/javascript",
          body: 'export const CONFIG={SUPABASE_URL:"https://api.gucc.test",SUPABASE_ANON_KEY:"fixture"};',
        });
      if (u.pathname === "/apps/command-center/src/auth.js")
        return route.fulfill({
          contentType: "text/javascript",
          body: 'export const getSession=()=>({access_token:"fixture",user:{id:"owner"}});export const getAccessToken=async()=>"fixture";',
        });
      const target = path.resolve(
        root,
        "." + decodeURIComponent(u.pathname),
        u.pathname.endsWith("/") ? "index.html" : "",
      );
      if (!target.startsWith(root + path.sep)) return route.abort();
      try {
        const contentType =
          {
            ".html": "text/html",
            ".js": "text/javascript",
            ".mjs": "text/javascript",
            ".css": "text/css",
            ".json": "application/json",
            ".svg": "image/svg+xml",
            ".png": "image/png",
          }[path.extname(target)] || "application/octet-stream";
        return route.fulfill({ body: await fs.readFile(target), contentType });
      } catch {
        return route.fulfill({ status: 404, body: "missing fixture" });
      }
    };

    await context.route("**/*", handleRoute);
  }
  return {
    install,
    projectRows,
    snapshots,
    revisions,
    videos,
    deliverables,
    versions,
    writes,
    key,
    origin,
  };
}
module.exports = { fixture };
