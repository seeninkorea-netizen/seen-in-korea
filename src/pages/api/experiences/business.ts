import type { APIRoute } from 'astro';
import { database, field, id, jsonInput, reply, sameOrigin, validEmail, errorMessage } from '../../../lib/experiences';
export const prerender = false;
export const POST: APIRoute = async ({ request }) => {
  if (!sameOrigin(request)) return reply({ ok: false, error: 'Invalid request origin.' }, 403);
  const db = database();
  if (!db) return reply({ ok: false, error: 'Applications are not available yet.' }, 503);
  const v = await jsonInput(request);
  if (!v) return reply({ ok: false, error: 'Invalid request.' }, 400);
  if (field(v, 'website', 100)) return reply({ ok: true }); // bot honeypot
  const business_name=field(v,'name',120), category=field(v,'type',80), address_ko=field(v,'location',200);
  const business_email=field(v,'email',180).toLowerCase(), offer_ko=field(v,'offer',700);
  const visit_window=field(v,'window',160), notes=field(v,'notes',600);
  const slots=Number(v.slots);
  if (!business_name || !category || !address_ko || !validEmail(business_email) || !offer_ko || !Number.isInteger(slots) || slots<1 || slots>30 || v.consent!==true || v.policy!==true)
    return reply({ ok:false, error:'Please check required fields and consent.' },400);
  try {
    await db.prepare(`INSERT INTO sik_campaigns(id,business_name,category,address_ko,business_email,offer_ko,visit_window,notes,slots)
      VALUES(?,?,?,?,?,?,?,?,?)`).bind(id(),business_name,category,address_ko,business_email,offer_ko,visit_window,notes,slots).run();
    return reply({ ok:true, message:'Your partner request was received. The campaign is not public until approved.' },201);
  } catch(e) { console.error('SIK business submit failed',e); return reply({ok:false,error:errorMessage(e)},500); }
};
