export async function demanderIA(message:string,historique:{who:string;text:string}[]){
  const controleur=new AbortController(),timeout=window.setTimeout(()=>controleur.abort(),8000);
  try{
    const reponse=await fetch('/api/dialogue',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({message,historique:historique.slice(-8)}),signal:controleur.signal});
    if(!reponse.ok)return null;
    const data=await reponse.json() as {reply?:unknown};
    return typeof data.reply==='string'&&data.reply.trim()?data.reply.trim().slice(0,700):null;
  }catch{return null;}finally{clearTimeout(timeout);}
}
