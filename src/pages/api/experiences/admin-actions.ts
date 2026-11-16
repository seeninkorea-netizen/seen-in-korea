import type { APIRoute } from 'astro';
import { adminAllowed, database, field, jsonInput, reply, sameOrigin, errorMessage } from '../../../lib/experiences';
export const prerender = false;
export const POST: APIRoute = async ({ request }) => {
  if(!sameOrigin(request)) return reply({ok:false,error:'Invalid request origin.'},403);
  if(!await adminAllowed(request)) return reply({ok:false,error:'Unauthorized.'},401);
  const db=database();if(!db)return reply({ok:false,error:'Configure SIK_DB first.'},503);
  const v=await jsonInput(request);if(!v)return reply({ok:false,error:'Invalid request.'},400);
  const action=field(v,'action',40),campaignId=field(v,'campaignId',80),applicationId=field(v,'applicationId',80),creatorId=field(v,'creatorId',80);
  try {
    if(action==='publish') {
      const title=field(v,'title_en',140),description=field(v,'description_en',800),location=field(v,'location_en',180),offer=field(v,'offer_en',450),deliverables=field(v,'deliverables_en',450),slots=Number(v.slots);
      if(!campaignId||!title||!description||!location||!offer||!deliverables||!Number.isInteger(slots)||slots<1||slots>30)
        return reply({ok:false,error:'English title, description, location, offer, deliverables and 1–30 slots are required.'},400);
      const res=await db.prepare(`UPDATE sik_campaigns SET status='published',title_en=?,description_en=?,location_en=?,offer_en=?,deliverables_en=?,slots=?,
        published_at=COALESCE(published_at,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        WHERE id=? AND status IN ('pending','published','paused','closed')
        AND (SELECT COUNT(*) FROM sik_campaign_applications WHERE campaign_id=? AND status='selected')<=?`)
        .bind(title,description,location,offer,deliverables,slots,campaignId,campaignId,slots).run();
      if(!res.meta?.changes)return reply({ok:false,error:'Campaign could not be published. Check status and selected count.'},409);
      return reply({ok:true,message:'Campaign published.'});
    }
    if(['pause','close','reject'].includes(action)) {
      const target=action==='pause'?'paused':action==='close'?'closed':'rejected';
      const res=await db.prepare(`UPDATE sik_campaigns SET status=? WHERE id=? AND status IN ('pending','published','paused','closed')`).bind(target,campaignId).run();
      return res.meta?.changes?reply({ok:true,message:'Status updated.'}):reply({ok:false,error:'Campaign not found or status cannot be changed.'},404);
    }
    if(['select','decline'].includes(action)) {
      // Single SQLite UPDATE statement ensures selected count cannot exceed capacity even under concurrent requests.
      if(action==='select') {
        const res=await db.prepare(`UPDATE sik_campaign_applications SET status='selected',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
          WHERE id=? AND status='pending'
            AND EXISTS (SELECT 1 FROM sik_campaigns c WHERE c.id=sik_campaign_applications.campaign_id AND c.status='published'
              AND (SELECT COUNT(*) FROM sik_campaign_applications a WHERE a.campaign_id=c.id AND a.status='selected') < c.slots)`)
          .bind(applicationId).run();
        return res.meta?.changes?reply({ok:true,message:'Selected. Notify the creator separately.'}):reply({ok:false,error:'No available slot, unpublished campaign or already processed application.'},409);
      }
      const res=await db.prepare(`UPDATE sik_campaign_applications SET status='rejected',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status='pending'`).bind(applicationId).run();
      return res.meta?.changes?reply({ok:true,message:'Application declined. Notify the creator separately.'}):reply({ok:false,error:'Application already processed or missing.'},409);
    }
    if(action==='deleteCampaign') {
      const res=await db.prepare('DELETE FROM sik_campaigns WHERE id=?').bind(campaignId).run();
      return res.meta?.changes?reply({ok:true,message:'Campaign and associated applications deleted.'}):reply({ok:false,error:'Not found.'},404);
    }
    if(action==='deleteCreator') {
      const res=await db.prepare('DELETE FROM sik_creators WHERE id=?').bind(creatorId).run();
      return res.meta?.changes?reply({ok:true}):reply({ok:false,error:'Not found.'},404);
    }
    if(action==='deleteApplication') {
      const res=await db.prepare('DELETE FROM sik_campaign_applications WHERE id=?').bind(applicationId).run();
      return res.meta?.changes?reply({ok:true}):reply({ok:false,error:'Not found.'},404);
    }
    return reply({ok:false,error:'Unsupported action.'},400);
  } catch(e) { console.error('SIK admin action failed',e);return reply({ok:false,error:errorMessage(e)},500); }
};
