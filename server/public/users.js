if(!mustAuth()) throw new Error("no auth");
const user=getUser();if(user.role!=="ADMIN") location.href="/app";
document.getElementById("btnLogout").addEventListener("click",()=>{clearAuth();location.href="/";});
const msg=document.getElementById("msg");const form=document.getElementById("userForm");const tbody=document.getElementById("tbody");const btnReload=document.getElementById("btnReload");
function escapeHtml(s){return String(s).replace(/[&<>"']/g,(m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));}
async function loadUsers(){const out=await api("/api/users");return out.data||[];}
function renderRows(rows){
  tbody.innerHTML="";
  for(const r of rows){
    const tr=document.createElement("tr");
    tr.innerHTML=`<td class="mono">${r.id}</td><td>${escapeHtml(r.name)}</td><td class="mono">${escapeHtml(r.username)}</td><td class="mono"><b>${r.role}</b></td><td>${r.is_active?"Ya":"Tidak"}</td>
    <td><button class="btn secondary" data-act="toggle" data-id="${r.id}" data-active="${r.is_active}">${r.is_active?"Nonaktifkan":"Aktifkan"}</button>
    <button class="btn secondary" data-act="reset" data-id="${r.id}">Reset Password</button></td>`;
    tbody.appendChild(tr);
  }
}
async function render(){msg.textContent="Memuat…";const rows=await loadUsers();renderRows(rows);msg.textContent="—";}
form.addEventListener("submit",async(e)=>{e.preventDefault();msg.textContent="Menyimpan…";
const payload={name:document.getElementById("name").value.trim(),username:document.getElementById("username").value.trim(),password:document.getElementById("password").value,role:document.getElementById("role").value};
try{await api("/api/users",{method:"POST",body:JSON.stringify(payload)});form.reset();msg.textContent="OK";await render();}catch(err){msg.textContent=`Gagal: ${err.message}`;}});
tbody.addEventListener("click",async(e)=>{const btn=e.target.closest("button");if(!btn) return;
const act=btn.dataset.act;const id=btn.dataset.id;
if(act==="toggle"){const active=btn.dataset.active==="1"||btn.dataset.active==="true";await api(`/api/users/${id}`,{method:"PATCH",body:JSON.stringify({is_active:!active})});await render();}
if(act==="reset"){const pass=prompt("Password baru:");if(!pass) return;await api(`/api/users/${id}/reset-password`,{method:"POST",body:JSON.stringify({password:pass})});alert("OK");}});
btnReload.addEventListener("click",render);
render();
