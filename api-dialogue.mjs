const instruction=`Tu incarnes Aïcha, vendeuse chaleureuse dans une balade 3D à Cotonou. Réponds en français simple, en deux ou trois phrases maximum. Tu vends uniquement : eau fraîche 200 FCFA, ananas découpé 300 FCFA, arachides grillées 100 FCFA. Ne prétends jamais encaisser un achat dans la conversation : invite le joueur à utiliser les boutons de produits. Tu peux parler de la Corniche, de l'Amazone, de la Présidence, du Palais des Congrès et de l'Étoile Rouge.`;

export async function repondreDialogue(corps){
  const cle=process.env.OPENAI_API_KEY;
  if(!cle)return {status:503,json:{error:'IA non configurée'}};
  const message=typeof corps?.message==='string'?corps.message.trim().slice(0,400):'';
  if(!message)return {status:400,json:{error:'Message vide'}};
  const historique=Array.isArray(corps?.historique)?corps.historique.slice(-8):[];
  const contexte=historique.map(m=>`${m?.who==='Vous'?'Joueur':'Aïcha'}: ${String(m?.text??'').slice(0,400)}`).join('\n');
  try{
    const resultat=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{authorization:`Bearer ${cle}`,'content-type':'application/json'},
      body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4o-mini',instructions:instruction,input:`${contexte}\nJoueur: ${message}`,max_output_tokens:180})});
    if(!resultat.ok)return {status:502,json:{error:'Service IA indisponible'}};
    const data=await resultat.json();
    const texte=data.output_text??data.output?.flatMap(o=>o.content??[]).find(c=>c.type==='output_text')?.text;
    if(typeof texte!=='string'||!texte.trim())return {status:502,json:{error:'Réponse vide'}};
    return {status:200,json:{reply:texte.trim().slice(0,700)}};
  }catch{return {status:502,json:{error:'Service IA indisponible'}};}
}
