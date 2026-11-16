import type { APIRoute } from 'astro';
import { database, field, id, jsonInput, reply, sameOrigin, validEmail, validSocialUrl, errorMessage } from '../../../lib/experiences';
export const prerender = false;
export const POST: APIRoute = async ({request}) => {
  if(!sameOrigin(request)) return reply({ok:false,error:'Invalid request origin.'},403);
  const db=database();if(!db)return reply({ok:false,error:'Applications are not available yet.'},503);
  const v=await jsonInput(request);if(!v)return reply({ok:false,error:'Invalid request.'},400);
  if(field(v,'website',100))return reply({ok:true});
  const campaignId=field(v,'campaignId',80),name=field(v,'name',100),email=field(v,'email',180).toLowerCase(),social=field(v,'social',300),message=field(v,'message',500);
  if(!campaignId||!name||!validEmail(email)||!validSocialUrl(social)||v.adult!==true||v.eligibility!==true||v.disclosure!==true||v.consent!==true)
    return reply({ok:false,error:'Please check your application and consent.'},400);
  try {
    const result=await db.prepare(`INSERT INTO sik_campaign_applications(id,campaign_id,creator_name,email,social_url,message)
      SELECT ?,c.id,?,?,?,? FROM sik_campaigns c WHERE c.id=? AND c.status='published' AND (SELECT COUNT(*) FROM sik_campaign_applications a WHERE a.campaign_id=c.id AND a.status='selected') < c.slots`)
      .bind(id(),name,email,social,message,campaignId).run();
    if (!result.meta?.changes) return reply({ok:false,error:'This campaign is not currently open.'},404);
    return reply({ok:true,message:'Your application was received. Selection is not guaranteed.'},201);
  } catch(e){console.error('SIK campaign apply failed',e);return reply({ok:false,error:errorMessage(e)},500);}
};
