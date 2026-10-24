
import { createClient } from "npm:@supabase/supabase-js@2";
const SUPABASE_API_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUB = Deno.env.get("SUPABASE_ANON_KEY")!;
const adminDb = createClient(SUPABASE_API_URL, SERVICE, {auth:{persistSession:false}});
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Content-Type":"application/json"};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
const questionIds = Array.from({length:24},(_,i)=>"q"+(i+1));
async function isAdmin(req:Request) {
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token) return false;
 const client=createClient(SUPABASE_API_URL,PUB,{auth:{persistSession:false}});
 const {data:{user},error}=await client.auth.getUser(token);
 if(error||!user) return false;
 const {data}=await adminDb.from("profiles").select("role").eq("id",user.id).maybeSingle();
 return data?.role==="admin";
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response(null,{headers:cors});
 try {
  const u=new URL(req.url);
  const action=u.searchParams.get("action");
  if(req.method==="GET" && (action==="status" || action==="preview-status")) {
    if(action==="preview-status" && !await isAdmin(req)) return reply({error:"Geen beheerdersrechten"},403);
    const {data,error}=await adminDb.from("optsch_surveys").select("id,title,survey_year,is_open").eq("survey_year",2026).single();
    if(error) throw error;
    return reply({survey:action==="preview-status" ? {...data,is_open:true,preview:true} : data});
  }
  if(req.method==="POST" && (action==="submit" || action==="preview-submit")){
    const testing=action==="preview-submit";
    if(testing && !await isAdmin(req))return reply({error:"Geen beheerdersrechten"},403);
    if(Number(req.headers.get("content-length")||0)>30000) return reply({error:"Inzending te groot"},413);
    const b=await req.json();
    if(b?.website) return reply({ok:true});
    const a=b?.answers;
    if(!a||typeof a!=="object"||Array.isArray(a)) return reply({error:"Ongeldige antwoorden"},400);
    if(Object.keys(a).some(k=>!questionIds.includes(k))) return reply({error:"Onbekende vraag"},400);
    for(const [k,v] of Object.entries(a)) {
      if(typeof v!=="string" && !Array.isArray(v)) return reply({error:"Ongeldig antwoord: "+k},400);
      if(typeof v==="string" && v.length>3000) return reply({error:"Antwoord te lang"},400);
      if(Array.isArray(v) && (v.length>12 || v.some(s=>typeof s!=="string"||s.length>150)))return reply({error:"Ongeldige keuze"},400);
    }
    const ns=[1,2,3,4].map(i=>Number(a["q"+i]));
    if(ns.some(n=>!Number.isInteger(n)||n<0||n>1000)||ns.some((n,i)=>i>0&&n<ns[i-1]))return reply({error:"Controleer de aantallen deelnames."},400);
    for(const id of ["q5","q8","q10","q12","q14","q16","q18","q19","q21","q22"])if(!a[id]||(Array.isArray(a[id])&&!a[id].length))return reply({error:"Verplichte vraag ontbreekt: "+id},400);
    for(const id of ["q12","q21","q22"])if((a[id]||[]).length>3)return reply({error:"Maximaal drie keuzes toegestaan."},400);
    const {data:s,error:e}=await adminDb.from("optsch_surveys").select("id,is_open").eq("survey_year",2026).single();
    if(e||!s||(!testing&&!s.is_open))return reply({error:"De enquête is momenteel gesloten."},403);
    const {error}=await adminDb.from(testing?"optsch_survey_test_responses":"optsch_survey_responses").insert({survey_id:s.id,answers:a});
    if(error)throw error;
    return reply({ok:true,preview:testing},201);
  }
  if(req.method==="GET" && (action==="results"||action==="csv"||action==="test-results"||action==="moderation"||action==="test-moderation")){

    if(!await isAdmin(req))return reply({error:"Geen beheerdersrechten"},403);
    const {data:s,error:e}=await adminDb.from("optsch_surveys").select("id").eq("survey_year",2026).single();
    if(e)throw e;
    const rows:{id:string,answers:Record<string,unknown>,excluded_questions:string[]}[]=[];
    const isTest=action==="test-results"||action==="test-moderation";
    let from=0; const page=500;
    while(true){
      const {data,error}=await adminDb.from(isTest?"optsch_survey_test_responses":"optsch_survey_responses").select("id,answers,excluded_questions").eq("survey_id",s.id).order("created_at",{ascending:true}).range(from,from+page-1);
      if(error)throw error; rows.push(...(data||[])); if((data||[]).length<page)break; from+=page;
    }
    if(action==="moderation"||action==="test-moderation"){
      return reply({count:rows.length,entries:rows.map(x=>({id:x.id,answers:x.answers,excluded_questions:x.excluded_questions||[]}))});
    }
    return reply({count:rows.length,answers:rows.map(x=>{
      const a={...x.answers};
      for(const q of (x.excluded_questions||[])) delete a[q];
      return a;
    })});
  }
  if(req.method==="POST" && action==="set-moderation"){
    if(!await isAdmin(req))return reply({error:"Geen beheerdersrechten"},403);
    const b=await req.json();
    const id=typeof b?.id==="string"?b.id:"";
    const question=typeof b?.question==="string"?b.question:"";
    const test=b?.test===true;
    if(!/^[0-9a-fA-F-]{36}$/.test(id)||!questionIds.includes(question)||typeof b.exclude!=="boolean")
      return reply({error:"Ongeldige moderatieaanvraag"},400);
    const table=test?"optsch_survey_test_responses":"optsch_survey_responses";
    const {data:s,error:e}=await adminDb.from("optsch_surveys").select("id").eq("survey_year",2026).single();
    if(e)throw e;
    const {data:row,error:readError}=await adminDb.from(table).select("excluded_questions,answers").eq("survey_id",s.id).eq("id",id).maybeSingle();
    if(readError)throw readError;
    if(!row)return reply({error:"Inzending niet gevonden"},404);
    const current=new Set<string>(row.excluded_questions||[]);
    if(b.exclude) current.add(question);else current.delete(question);
    const {error:updateError}=await adminDb.from(table).update({excluded_questions:[...current]}).eq("survey_id",s.id).eq("id",id);
    if(updateError)throw updateError;
    return reply({ok:true,excluded_questions:[...current]});
  }
  if(req.method==="POST" && action==="clear-test-results"){
    if(!await isAdmin(req))return reply({error:"Geen beheerdersrechten"},403);
    const {data:s,error:e}=await adminDb.from("optsch_surveys").select("id").eq("survey_year",2026).single();
    if(e)throw e;
    const {error}=await adminDb.from("optsch_survey_test_responses").delete().eq("survey_id",s.id);
    if(error)throw error;
    return reply({ok:true});
  }
  return reply({error:"Onbekende actie"},404);
 } catch(error){console.error("optsch-survey request failed:", error instanceof Error ? error.message : String(error));return reply({error:"Er is een technische fout opgetreden."},500);}
});
