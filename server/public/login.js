const form=document.getElementById("loginForm");const msg=document.getElementById("msg");
form.addEventListener("submit",async(e)=>{e.preventDefault();msg.textContent="Memproses…";
const username=document.getElementById("username").value.trim();
const password=document.getElementById("password").value;
try{const out=await api("/api/auth/login",{method:"POST",body:JSON.stringify({username,password})});
setAuth(out.token,out.user);location.href="/app";}catch(err){msg.textContent=`Gagal: ${err.message}`;}});
(function(){if(getToken()) location.href="/app";})();
