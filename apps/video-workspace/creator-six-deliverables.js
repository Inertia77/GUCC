"use strict";
// Compatibility API only. Normative rules moved to GUCC Creator Governance.
if(typeof module==="object"&&module.exports)module.exports=require("./creator-governance/creator-governance-runtime.js").six;
else if(!globalThis.GuccCreatorSix)console.error("GUCC Creator Governance runtime is missing.");
