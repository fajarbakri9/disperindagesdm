(function(){
  "use strict";
  const esc=value=>String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const safeUrl=value=>{const url=String(value||"").trim();return /^(https?:\/\/|\.?\.?\/|assets\/)/i.test(url)?url:""};
  const norm=value=>String(value||"").toLocaleLowerCase("id-ID");
  document.addEventListener("DOMContentLoaded",()=>{
    const grid=document.getElementById("ppidDocsGrid"); if(!grid)return;
    const keyword=document.getElementById("ppidDocKeyword"), subject=document.getElementById("ppidDocSubject"), status=document.getElementById("ppidDocStatus"), count=document.getElementById("ppidDocsCount"), empty=document.getElementById("ppidDocsEmpty");
    let docs=[];
    try{docs=typeof getStorage==="function"?getStorage("disperindag_documents",window.DEFAULT_DOCUMENTS||[]):(window.DEFAULT_DOCUMENTS||[])}catch(_){docs=window.DEFAULT_DOCUMENTS||[]}
    docs=Array.isArray(docs)?docs:[];
    const fill=(select,values)=>values.filter(Boolean).sort((a,b)=>a.localeCompare(b,"id")).forEach(value=>select.add(new Option(value,value)));
    fill(subject,[...new Set(docs.map(d=>d.subject||d.document_type))]); fill(status,[...new Set(docs.map(d=>d.legal_status))]);
    const requested=new URLSearchParams(location.search).get("id");
    function render(){
      const query=norm(keyword.value), selectedSubject=subject.value, selectedStatus=status.value;
      const filtered=docs.filter(d=>{const hay=norm([d.title,d.number,d.issuer,d.responsible_unit,d.subject,d.document_type,d.year].join(" "));return(!query||hay.includes(query))&&(selectedSubject==="all"||(d.subject||d.document_type)===selectedSubject)&&(selectedStatus==="all"||d.legal_status===selectedStatus)}).sort((a,b)=>(Number(b.year)||0)-(Number(a.year)||0)||String(a.title).localeCompare(String(b.title),"id"));
      count.textContent=filtered.length; empty.hidden=filtered.length>0;
      grid.innerHTML=filtered.map(d=>{const file=safeUrl(d.file_url), source=safeUrl(d.source_portal_url), statusClass=norm(d.legal_status).includes("arsip")?" arsip":"";return `<article class="ppid-doc-card${requested&&String(d.id)===requested?" is-target":""}" data-doc-id="${esc(d.id)}"><div class="ppid-doc-badges"><span class="ppid-doc-badge">${esc(d.subject||d.document_type||"Dokumen Publik")}</span><span class="ppid-doc-badge status${statusClass}">${esc(d.legal_status||"Berlaku")}</span>${d.year?`<span class="ppid-doc-badge">${esc(d.year)}</span>`:""}</div><h3>${esc(d.title||"Dokumen Publik")}</h3><p class="ppid-doc-number">${esc(d.number||"Nomor dokumen tidak dicantumkan")}</p><div class="ppid-doc-meta"><span>🏛️ ${esc(d.issuer||"Disperindag ESDM Kabupaten Pinrang")}</span>${d.issued_at?`<span>📅 ${esc(d.issued_at)}</span>`:""}${d.responsible_unit?`<span>👤 ${esc(d.responsible_unit)}</span>`:""}${d.file_size?`<span>📄 ${esc(d.file_size)}</span>`:""}</div><div class="ppid-doc-actions">${file?`<a href="${esc(file)}" target="_blank" rel="noopener noreferrer">Buka dokumen ↗</a>`:""}${source&&source!==file?`<a class="secondary" href="${esc(source)}" target="_blank" rel="noopener noreferrer">Sumber resmi ↗</a>`:""}</div></article>`}).join("");
    }
    [keyword,subject,status].forEach(el=>el.addEventListener(el===keyword?"input":"change",render));
    document.getElementById("ppidDocReset").addEventListener("click",()=>{keyword.value="";subject.value="all";status.value="all";render();keyword.focus()});
    render(); if(requested)setTimeout(()=>document.querySelector(`[data-doc-id="${CSS.escape(requested)}"]`)?.scrollIntoView({behavior:"smooth",block:"center"}),120);
  });
})();
