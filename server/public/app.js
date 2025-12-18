if(!mustAuth()) throw new Error("no auth");
const user=getUser();document.getElementById("sub").textContent=`${user.name} • ${user.role}`;
const usersLink=document.getElementById("usersLink");if(user.role==="ADMIN") usersLink.style.display="inline-flex";
document.getElementById("btnLogout").addEventListener("click",()=>{clearAuth();location.href="/";});

const CLASS_LABEL={OUTGOING:"Surat Keluar",CERTIFICATE:"Surat Keterangan"};
const form=document.getElementById("letterForm");
const classificationEl=document.getElementById("classification");
const dateEl=document.getElementById("letterDate");
const subjectEl=document.getElementById("subject");
const partyEl=document.getElementById("party");
const msg=document.getElementById("msg");

const filterClass=document.getElementById("filterClass");
const filterYear=document.getElementById("filterYear");
const searchEl=document.getElementById("search");
const btnRefresh=document.getElementById("btnRefresh");

const tbody=document.getElementById("tbody");
const stats=document.getElementById("stats");
const previewNo=document.getElementById("previewNo");

function ymdToYear(ymd){return Number(String(ymd).slice(0,4));}
async function refreshPreview(){
  try{
    const cls=classificationEl.value;const year=ymdToYear(dateEl.value);
    const out=await api("/api/letters/counters/current");const rows=out.data||[];
    const row=rows.find(r=>r.classification===cls && r.year===year);
    const last=row?row.last_number:0;const prefix=cls==="OUTGOING"?"OUT":"KET";
    previewNo.textContent=`${prefix}/${year}/${String(last+1).padStart(4,"0")}`;
  }catch{previewNo.textContent="—";}
}
async function loadLetters(){
  const cls=filterClass.value;const year=filterYear.value?Number(filterYear.value):"";const q=searchEl.value?searchEl.value.trim():"";
  const params=new URLSearchParams();if(cls&&cls!=="ALL") params.set("classification",cls);if(year) params.set("year",String(year));if(q) params.set("q",q);
  const out=await api("/api/letters?"+params.toString());return out.data||[];
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,(m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));}
function renderRows(rows){
  tbody.innerHTML="";
  for(const r of rows){
    const badge=r.status==="AKTIF"?`<span class="badge ok">● Aktif</span>`:`<span class="badge danger">● Batal</span>`;
    const tr=document.createElement("tr");
    tr.innerHTML=`<td class="mono"><b>${r.register_display}</b><div class="muted">${r.year} • #${r.register_no}</div></td>
    <td>${r.letter_date}</td><td>${CLASS_LABEL[r.classification]}</td><td>${escapeHtml(r.subject)}</td><td>${escapeHtml(r.party||"-")}</td><td>${badge}</td>
    <td><button class="btn secondary" data-act="copy" data-no="${r.register_display}">Copy</button>
    ${(r.status==="AKTIF" && (user.role==="ADMIN"||user.role==="OPERATOR"))?`<button class="btn danger" data-act="cancel" data-id="${r.id}">Batal</button>`:""}</td>`;
    tbody.appendChild(tr);
  }
  stats.textContent=`Tampil: ${rows.length}`;
}
async function render(){msg.textContent="Memuat…";const rows=await loadLetters();renderRows(rows);msg.textContent="—";await refreshPreview();}

form.addEventListener("submit",async(e)=>{e.preventDefault();msg.textContent="Menyimpan…";
try{
  const payload={classification:classificationEl.value,letter_date:dateEl.value,subject:subjectEl.value.trim(),party:partyEl.value.trim()};
  const out=await api("/api/letters",{method:"POST",body:JSON.stringify(payload)});
  subjectEl.value="";partyEl.value="";msg.textContent=`OK: ${out.data.register_display}`;await render();
}catch(err){if(err.status===401){clearAuth();location.href="/";return;}msg.textContent=`Gagal: ${err.message}`;}});
tbody.addEventListener("click",async(e)=>{const btn=e.target.closest("button");if(!btn) return;
const act=btn.dataset.act;
if(act==="copy"){await navigator.clipboard.writeText(btn.dataset.no);btn.textContent="Copied!";setTimeout(()=>btn.textContent="Copy",700);}
if(act==="cancel"){if(!confirm("Batalkan surat? (status jadi BATAL, nomor tetap)")) return;
try{await api(`/api/letters/${btn.dataset.id}/cancel`,{method:"POST"});await render();}catch(err){msg.textContent=`Gagal: ${err.message}`;}}
});
[classificationEl,dateEl].forEach(el=>el.addEventListener("change",refreshPreview));
[filterClass,filterYear,searchEl].forEach(el=>el.addEventListener("input",render));
btnRefresh.addEventListener("click",render);
(function init(){dateEl.value=new Date().toISOString().slice(0,10);render();})();
