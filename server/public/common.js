const TOKEN_KEY="sr_token";const USER_KEY="sr_user";
function setAuth(token,user){localStorage.setItem(TOKEN_KEY,token);localStorage.setItem(USER_KEY,JSON.stringify(user));}
function getToken(){return localStorage.getItem(TOKEN_KEY);}
function getUser(){try{return JSON.parse(localStorage.getItem(USER_KEY)||"null");}catch{return null;}}
function clearAuth(){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(USER_KEY);}
async function api(path,opts={}){
  const token=getToken();
  const headers=Object.assign({"Content-Type":"application/json"},opts.headers||{});
  if(token) headers["Authorization"]=`Bearer ${token}`;
  const res=await fetch(path,Object.assign({},opts,{headers}));
  const body=await res.json().catch(()=>({}));
  if(!res.ok){const err=new Error(body.error||"REQUEST_FAILED");err.status=res.status;throw err;}
  return body;
}
function mustAuth(){if(!getToken()){location.href="/";return false;}return true;}
