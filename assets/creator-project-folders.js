/* Optional local setup only. Never executes shell commands from the web page. */
(() => {
  const folders = ["01_Scripts","02_声音对齐字幕","03_视觉素材包","04_BGM 与音效包","05_正式封面","06_六平台发布包","07_SilentVideo","08_PRD"];
  const powershell = "@(\n" + folders.map(name=>"  '"+name+"'").join(",\n") + "\n) | ForEach-Object { New-Item -ItemType Directory -Path . -Name $_ -Force | Out-Null }";
  function buildHelper(expanded=false) {
    const details=document.createElement("details");details.className="creator-folder-command";details.open=expanded;
    const summary=document.createElement("summary");summary.textContent="本地项目目录 · 复制 PowerShell 命令";
    const note=document.createElement("p");note.textContent="先在 Windows 中打开已创建的本地项目文件夹，在该文件夹内打开 PowerShell，然后复制并执行下面的命令。只创建 8 个标准一级目录；已有目录和文件保留。";
    const text=document.createElement("textarea");text.readOnly=true;text.rows=9;text.defaultValue=powershell;text.value=powershell;text.setAttribute("aria-label","标准项目目录 PowerShell 命令");
    const copy=document.createElement("button");copy.type="button";copy.textContent="复制目录命令";
    const status=document.createElement("span");status.setAttribute("role","status");
    copy.addEventListener("click",async()=>{
      try{await navigator.clipboard.writeText(powershell);status.textContent="已复制 · 在本地项目文件夹的 PowerShell 中运行";}
      catch{text.focus();text.select();status.textContent=document.execCommand("copy")?"已复制":"已选中命令，请按 Ctrl+C 复制";}
    });
    details.append(summary,note,text,copy,status);
    return details;
  }
  function mount(form) {
    if(form.querySelector(".creator-folder-command"))return;
    const details=buildHelper();
    const actions=form.querySelector("footer, .gcc-actions");if(actions)actions.before(details);else form.append(details);
  }
  function openExistingProjectHelper() {
    let dialog=document.getElementById("projectFoldersDialog");
    if(!dialog){
      dialog=document.createElement("dialog");
      dialog.id="projectFoldersDialog";
      dialog.setAttribute("aria-label","本地项目目录");
      const content=document.createElement("div");content.className="dialog-card";
      const head=document.createElement("div");head.className="panel-head";
      const title=document.createElement("h2");title.textContent="本地项目目录";
      const dismiss=document.createElement("button");dismiss.type="button";dismiss.className="icon-button";dismiss.setAttribute("aria-label","关闭目录窗口");dismiss.textContent="×";dismiss.addEventListener("click",()=>dialog.close());
      head.append(title,dismiss);
      const intro=document.createElement("p");intro.textContent="适用于已创建、已完成或已归档项目。GUCC 只提供可复制的命令，不会访问本地文件或自动执行。";
      const footer=document.createElement("footer");
      const close=document.createElement("button");close.type="button";close.className="button ghost";close.textContent="关闭";close.addEventListener("click",()=>dialog.close());
      footer.append(close);
      content.append(head,intro,buildHelper(true),footer);
      dialog.append(content);
      document.body.append(dialog);
    }
    if(!dialog.open)dialog.showModal();
  }
  document.addEventListener("click",event=>{
    const trigger=event.target.closest("[data-open-project-folders]");
    if(trigger&&!trigger.disabled)openExistingProjectHelper();
  });
  const scan=()=>document.querySelectorAll("#createProjectForm, .gcc-dialog form").forEach(mount);
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
  scan();
})();