(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.GuccCreatorHandoff=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function build(project,video){
  if(!project?.projectId||!video?.videoId)throw Error('需要明确的项目与视频身份');
  return {schemaVersion:'gucc-creator-handoff-1',projectId:project.projectId,videoId:video.videoId,branch:video.branch,
   projectName:project.name,projectTitle:(video.name||video.videoId)+' · '+project.name,game:project.game||'',server:project.server||'',version:project.version||'',productType:project.productType||'preview',
   context:{title:(video.name||video.videoId)+' · '+project.name,game:project.game||'',server:project.server||'',version:project.version||'',notes:project.projectBriefMarkdown||project.idea||''},
   sharedResearch:{verifiedFacts:project.verifiedFacts||[],reasonedAnalysis:project.reasonedAnalysis||[],unknowns:project.unknowns||[]},
   locks:JSON.parse(JSON.stringify(project.videoLocks?.[video.branch]||{})),exportedAt:new Date().toISOString(),
   evidence:{filesTransferred:false,qualityVerified:false,published:false}};
 }
 return {build};
});
