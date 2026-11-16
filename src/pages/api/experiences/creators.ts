import type { APIRoute } from 'astro';
import { database, field, id, jsonInput, reply, sameOrigin, validEmail, validSocialUrl, errorMessage } from '../../../lib/experiences';
export const prerender = false;
export const POST: APIRoute = async ({ request }) => {
  if (!sameOrigin(request)) return reply({ok:false,error:'Invalid request origin.'},403);
  const db=database(); if(!db) return reply({ok:false,error:'Registration is not available yet.'},503);
  const v=await jsonInput(request); if(!v) return reply({ok:false,error:'Invalid request.'},400);
  if(field(v,'website',100)) return reply({ok:true});
  const name=field(v,'name',100),email=field(v,'email',180).toLowerCase(), social=field(v,'social',300),followers=field(v,'followers',60);
  const area=field(v,'area',160), languages=field(v,'languages',120),audience=field(v,'audience',600);
  if(!name||!validEmail(email)||!validSocialUrl(social)||!followers||!area||!languages||v.adult!==true||v.eligibility!==true||v.disclosure!==true||v.consent!==true)
    return reply({ok:false,error:'Please check your profile and consent.'},400);
  try { await db.prepare(`INSERT INTO sik_creators(id,creator_name,email,social_url,followers,area,languages,audience) VALUES(?,?,?,?,?,?,?,?)`).bind(id(),name,email,social,followers,area,languages,audience).run();
    return reply({ok:true,message:'Your creator introduction was received. This is not an account or campaign selection.'},201);
  } catch(e){console.error('SIK creator submit failed',e);return reply({ok:false,error:errorMessage(e)},500);}
};
