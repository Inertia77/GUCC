"use strict";
// Compatibility facade only; task rules and engine moved to Creator Governance.
if(typeof module==="object"&&module.exports)module.exports=require("../apps/video-workspace/creator-governance/creator-governance-runtime.js").aiTask;
else if(!globalThis.GuccCreatorAiTask)console.error("GUCC Creator Governance runtime missing for legacy AI task.");
