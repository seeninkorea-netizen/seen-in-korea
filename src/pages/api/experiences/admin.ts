import type { APIRoute } from 'astro';
import { adminAllowed, database, reply } from '../../../lib/experiences';
export const prerender = false;
export const GET: APIRoute = async ({ request }) => {
  if(!await adminAllowed(request)) return reply({ok:false,error:'Unauthorized.'},401);
  const db=database();if(!db)return reply({ok:false,error:'Configure SIK_DB first.'},503);
  try {
    const [c, a, p] = await Promise.all([
      db.prepare('SELECT * FROM sik_campaigns ORDER BY created_at DESC LIMIT 200').all(),
      db.prepare('SELECT * FROM sik_campaign_applications ORDER BY created_at DESC LIMIT 500').all(),
      db.prepare('SELECT * FROM sik_creators ORDER BY created_at DESC LIMIT 200').all()
    ]);
    return reply({ok:true,campaigns:c.results,applications:a.results,creators:p.results});
  }catch(e){console.error('SIK admin list failed',e);return reply({ok:false,error:'Could not load the dashboard.'},500);}
};
