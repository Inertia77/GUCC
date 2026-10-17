/* Optional local setup only. Never executes shell commands from the web page. */
(() => {
  const folders = ["01_Scripts","02_声音对齐字幕","03_视觉素材包","04_BGM 与音效包","05_正式封面","06_六平台发布包","07_SilentVideo","08_PRD"];
  const powershell = "@(\n" + folders.map(name=>"  '"+name+"'").join(",\n") + "\n) | ForEach-Object { New-Item -ItemType Directory -Path . -Name $_ -Force | Out-Null }";
  function mount(form) {
    if(form.querySelector(".creator-folder-command"))return;
    const details=document.createElement("details");details.className="creator-folder-command";
    const summary=document.createElement("summary");summary.textContent="本地项目目录 · 复制 PowerShell 命令";
    const note=document.createElement("p");note.textContent="先自行创建并命名项目文件夹，在该空文件夹打开 PowerShell，再粘贴运行。仅创建 8 个标准一级目录；已有目录和文件保留。";
    const text=document.createElement("textarea");text.readOnly=true;text.rows=6;text.defaultValue=powershell;text.value=powershell;text.setAttribute("aria-label","标准项目目录 PowerShell 命令");
    const copy=document.createElement("button");copy.type="button";copy.textContent="复制目录命令";
    const status=document.createElement("span");status.setAttribute("role","status");
    copy.addEventListener("click",async()=>{
      try{await navigator.clipboard.writeText(powershell);status.textContent="已复制 · 在项目目录的 PowerShell 运行";}
      catch{text.focus();text.select();status.textContent=document.execCommand("copy")?"已复制":"已选中命令，请按 Ctrl+C 复制";}
    });
    details.append(summary,note,text,copy,status);
    const actions=form.querySelector("footer, .gcc-actions");if(actions)actions.before(details);else form.append(details);
  }
  const scan=()=>document.querySelectorAll('#createProjectForm, .gcc-dialog form').forEach(mount);
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
  scan();
})();
