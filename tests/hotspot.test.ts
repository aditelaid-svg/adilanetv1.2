import assert from 'node:assert/strict';
import { test } from 'node:test';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { chapMd5, entryToken, matchesEntryToken, hotspotFiles, zipHotspot } from '../src/server/hotspot-package';
import { portalUrl, contextUsable, registerHotspotRoutes, type ClientState } from '../src/server/hotspot-routes';
import { loginDestination } from '../src/lib/loginDestination';
import { isSellablePackage } from '../src/lib/packageCatalog';
import { verifyHotspotConnection } from '../src/lib/hotspot';

const config = { routerId: 1, loginUrl: 'http://hotspot.test/login', portalUrl: 'https://portal.test', enabled: true };
const secret = 'fixture-only-not-a-live-session-secret';
const context = () => ({ routerId:1,mac:'AA:BB:CC:DD:EE:FF',ip:'10.5.50.2',browserIp:'192.0.2.10',
  loginUrl:config.loginUrl,portalUrl:config.portalUrl,createdAt:Date.now(),error:null });
function harness(client: ClientState | Error = {present:true,active:false,idleSeconds:0}) {
  const routes = new Map<string, any>(), queries: any[] = [];
  let readerCalls = 0;
  const app: any = { get(path: string, ...handlers: any[]) {routes.set(`GET ${path}`, handlers);}, post(path: string,...handlers:any[]){routes.set(`POST ${path}`,handlers);} };
  const pool: any = { async query(sql: string,args: any[]) {
    queries.push([sql,args]);
    if (sql.includes('SELECT * FROM routers')) return {rows:[{id:1,name:'Fixture router'}]};
    if (sql.includes('SELECT name FROM routers')) return {rows:[{name:'Fixture router'}]};
    if (sql.includes('SELECT p.*')) return {rows:[{id:5,price:'5000',router_id:1}]};
    if (sql.includes('SELECT id FROM routers')) return {rows:[{id:1}],rowCount:1};
    if (sql.includes('SELECT config_value FROM settings')) return {rows:[{config_value:JSON.stringify([config])}],rowCount:1};
    return {rows:[]};
  }};
  pool.connect = async () => ({ query: pool.query, release() {} });
  const admin = (_req:any,_res:any,next:any) => next();
  registerHotspotRoutes(app,pool,async()=>({hotspotPortals:JSON.stringify([config])}),admin,secret,async()=>{
    readerCalls++; if(client instanceof Error) throw client; return client;
  });
  const invoke = async (method:string,path:string,patch: any = {}) => {
    const req:any = {ip:'192.0.2.10',body:{},query:{},params:{},session:{hotspot:context(),save:(fn:any)=>fn(null)},...patch};
    const res:any = {statusCode:200,headers:{},status(n:number){this.statusCode=n;return this;},
      json(data:any){this.body=data;return this;},send(data:any){this.body=data;return this;},
      type(t:string){this.headers.type=t;return this;},setHeader(n:string,v:string){this.headers[n]=v;},
      redirect(n:number,url:string){this.statusCode=n;this.redirectUrl=url;}};
    const handlers=routes.get(`${method} ${path}`); assert.ok(handlers);
    await handlers[handlers.length-1](req,res);
    return {req,res};
  };
  return {invoke,queries,routes,admin,get readerCalls(){return readerCalls;}};
}

test('bridge CHAP MD5 matches standard vectors and binary RouterOS challenges',()=>{
  for (const s of ['', 'a','abc','message digest','A'.repeat(128)]) {
    const bytes = [...Buffer.from(s)]; assert.equal(chapMd5(bytes),crypto.createHash('md5').update(Buffer.from(bytes)).digest('hex'));
  }
  const bytes = [200,...Buffer.from('VOUCHER'),...Array.from({length:16},(_,i)=>i*13)];
  const embedded = vm.runInNewContext(`(${chapMd5.toString()})`);
  assert.equal(embedded(bytes),crypto.createHash('md5').update(Buffer.from(bytes)).digest('hex'));
});
test('installer validates URLs; credentials, scripts, query and arbitrary paths cannot be targets',()=>{
  assert.equal(portalUrl('https://portal.test/'),config.portalUrl);
  assert.equal(portalUrl(config.loginUrl,true),config.loginUrl);
  for(const url of ['javascript:alert(1)','https://u:p@portal.test','https://portal.test/path','https://portal.test/?token=x','https://portal.test/#x']) assert.throws(()=>portalUrl(url));
  assert.throws(()=>portalUrl('http://hotspot.test/admin',true));
});
test('customer package catalog only exposes packages that can provision a hotspot voucher',()=>{
  const ready={id:5,name:'1 Jam',speed:'2M',quota:'Unlimited',duration:'1 Jam',price:5000,badge_color:'blue',router_id:1,mikrotik_profile:'1jam'};
  assert.equal(isSellablePackage(ready),true);
  assert.equal(isSellablePackage({...ready,price:0}),false);
  assert.equal(isSellablePackage({...ready,router_id:null}),false);
  assert.equal(isSellablePackage({...ready,mikrotik_profile:'  '}),false);
});
test('bridge entry token binds router, gateway and portal and fails closed on malformed input',()=>{
  const token=entryToken(config,secret); assert.ok(matchesEntryToken(token,token));
  for(const value of ['',undefined,'é'.repeat(64),token.slice(0,63)]) assert.equal(matchesEntryToken(value,token),false);
  assert.notEqual(entryToken({...config,loginUrl:'http://other.test/login'},secret),token);
});
test('context rejects disabled, expired, changed network and changed gateway configuration',()=>{
  assert.ok(contextUsable(context(),{ip:'192.0.2.10'},config));
  assert.equal(contextUsable(context(),{ip:'192.0.2.11'},config),false);
  assert.equal(contextUsable(context(),{ip:'192.0.2.10'},{...config,enabled:false}),false);
  assert.equal(contextUsable(context(),{ip:'192.0.2.10'},{...config,loginUrl:'http://other.test/login'}),false);
  assert.equal(contextUsable({...context(),createdAt:Date.now()-31*60_000},{ip:'192.0.2.10'},config),false);
});
test('ZIP includes standalone bridge, success/redirect/status pages and safe installation guide',()=>{
  const files=hotspotFiles(config,secret), zip=zipHotspot(files);
  assert.equal(zip.readUInt32LE(0),0x04034b50);
  assert.equal(zip.readUInt32LE(zip.length-22),0x06054b50);
  assert.equal(zip.readUInt16LE(zip.length-12),Object.keys(files).length);
  assert.ok(files['login.html'].includes('$(chap-id)'));
  assert.ok(files['login.html'].includes('$(chap-challenge)'));
  assert.ok(files['login.html'].includes('an-voucher'));
  assert.ok(!files['login.html'].includes(secret));
  assert.ok(!files['login.html'].includes('src="/md5.js"'));
  for (const name of ['alogin.html','rlogin.html','redirect.html','logout.html','status.html']) assert.ok(files[name]);
});
test('GET bridge entry validates signed installation data and saves only expected gateway context',async()=>{
  const h=harness();
  const bad=await h.invoke('GET','/api/hotspot/entry',{query:{router:1,entry:'bad'}});assert.equal(bad.res.statusCode,403);
  const good=await h.invoke('GET','/api/hotspot/entry',{query:{router:1,entry:entryToken(config,secret),mac:'aa:bb:cc:dd:ee:ff',ip:'10.5.50.2',error:'invalid username or password',login:'https://evil.test'}});
  assert.equal(good.res.statusCode,303);assert.equal(good.res.redirectUrl,'/hotspot');
  assert.equal(good.req.session.hotspot.loginUrl,config.loginUrl);
  assert.equal(good.req.session.hotspot.mac,'AA:BB:CC:DD:EE:FF');
  assert.equal(good.req.session.hotspot.error,'Login ditolak MikroTik: invalid username or password');
});
test('automatic login only redirects verified hotspot client, no context never calls router',async()=>{
  const h=harness();
  const good=await h.invoke('POST','/api/hotspot/connect',{body:{code:'ABCD123',routerId:1,automatic:true}});
  assert.equal(good.res.body.data.on_network,true);
  assert.equal(new URL(good.res.body.data.redirect_url).origin,'http://hotspot.test');
  assert.equal(new URLSearchParams(new URL(good.res.body.data.redirect_url).hash.slice(1)).get('an-voucher'),'ABCD123');
  const outside=harness();
  const bad=await outside.invoke('POST','/api/hotspot/connect',{session:{},body:{code:'ABCD123',routerId:1,automatic:true}});
  assert.equal(bad.res.statusCode,409);assert.equal(outside.readerCalls,0);
  const moved=await h.invoke('POST','/api/hotspot/connect',{ip:'192.0.2.11',body:{code:'ABCD123',routerId:1,automatic:true}});
  assert.equal(moved.res.statusCode,409);
});
test('missing, idle or unavailable router presence does not force automatic login',async()=>{
  for (const client of [{present:false,active:false,idleSeconds:null},{present:true,active:false,idleSeconds:120},new Error('offline')]) {
    const h=harness(client);
    const {res}=await h.invoke('POST','/api/hotspot/connect',{body:{code:'ABCD123',routerId:1,automatic:true}});
    assert.equal(res.body.data.on_network,false);assert.equal(res.body.data.redirect_url,undefined);
  }
});
test('manual login may retry trusted gateway during API outage; wrong router or unsafe code rejected',async()=>{
  const h=harness(new Error('offline'));
  const manual=await h.invoke('POST','/api/hotspot/connect',{body:{code:'ABCD123',automatic:false}});
  assert.ok(manual.res.body.data.redirect_url);
  const wrong=await h.invoke('POST','/api/hotspot/connect',{body:{code:'ABCD123',routerId:2}});
  assert.equal(wrong.res.statusCode,409);
  for(const code of ['', '<bad code>', 'a'.repeat(129),123]) assert.equal((await h.invoke('POST','/api/hotspot/connect',{body:{code}})).res.statusCode,400);
});
test('internet active is independent of payment: only verified active router session reports true',async()=>{
  for(const active of [true,false]) {
    const h=harness({present:true,active,idleSeconds:0,uptime:'5 menit',sessionTimeLeft:'45 menit'});
    const {res}=await h.invoke('POST','/api/hotspot/connection',{body:{code:'ABCD123'}});
    assert.equal(res.body.data.active,active);
    assert.equal(res.body.data.uptime,active?'5 menit':null);
    assert.equal(res.body.data.session_time_left,active?'45 menit':null);
  }
});
test('catalog limits hotspot purchases to originating router but offers public catalog outside',async()=>{
  const h=harness();
  const inside=await h.invoke('GET','/api/hotspot/packages');
  assert.equal(inside.res.body.data[0].price,5000);
  assert.deepEqual(h.queries.at(-1)[1],[1]);
  await h.invoke('GET','/api/hotspot/packages',{session:{}});
  assert.deepEqual(h.queries.at(-1)[1],[null]);
});
test('installer admin config and downloads are protected with existing admin middleware',()=>{
  const h=harness();
  for(const route of ['GET /api/hotspot/admin/config','POST /api/hotspot/admin/config','GET /api/hotspot/admin/package/:routerId']) assert.equal(h.routes.get(route)[0],h.admin);
});
test('admin installation save consumes one config object and returns the normalized object',async()=>{
  const h=harness();
  const {res}=await h.invoke('POST','/api/hotspot/admin/config',{body:{...config,portalUrl:config.portalUrl+'/'}});
  assert.equal(res.statusCode,200);assert.equal(Array.isArray(res.body.data),false);
  assert.deepEqual(res.body.data,config);
  const write=h.queries.find(([sql])=>sql.includes('INSERT INTO settings'));
  assert.deepEqual(JSON.parse(write[1][0]),[config]);
  const bad=await h.invoke('POST','/api/hotspot/admin/config',{body:[config]});
  assert.equal(bad.res.statusCode,400);
});
test('saldo login destination accepts only a safe internal package path and leaves admin routing unchanged',()=>{
  const next='/user/buy?packageId=11',search=`?next=${encodeURIComponent(next)}`;
  assert.equal(loginDestination('user',search),next);
  assert.equal(loginDestination('admin',search),'/admin');
  assert.equal(loginDestination('superadmin',search),'/admin');
  for(const value of ['https://evil.example/path','//evil.example','/admin','/user/buy?packageId=0','/user/buy?packageId=11&redirect=evil','/user/buy?packageId=99999999999999999999']) {
    assert.equal(loginDestination('user',`?next=${encodeURIComponent(value)}`),'/user');
  }
});
test('hotspot installation form is independent from general-settings and password forms',()=>{
  const path = new URL('../src/pages/admin/AdminSettings.tsx',import.meta.url);
  const source = ts.createSourceFile('AdminSettings.tsx',readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let count=0;
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source)==='HotspotSetup') {
      count++;
      for(let parent=node.parent;parent;parent=parent.parent) {
        assert.ok(!ts.isJsxElement(parent) || parent.openingElement.tagName.getText(source)!=='form','HotspotSetup must not submit general settings');
      }
    }
    ts.forEachChild(node,visit);
  };
  visit(source);assert.equal(count,1);
});
test('hotspot portal shows MikroTik login rejection before the customer retries',()=>{
  const path=new URL('../src/pages/HotspotPortal.tsx',import.meta.url);
  const source=readFileSync(path,'utf8');
  assert.match(source,/context\?\.error && !code/);
});

test('installed bridge submits voucher to RouterOS with fresh CHAP instead of redirecting back to entry',()=>{
  const voucher='FIXTURE-ONLY',challenge=Array.from({length:16},(_,i)=>i*13);
  const octal=(bytes:number[])=>bytes.map(b=>`\\${b.toString(8).padStart(3,'0')}`).join('');
  for(const chap of [false,true]) {
    const html=hotspotFiles(config,secret)['login.html']
      .replaceAll('$(chap-id)',chap?octal([7]):'')
      .replaceAll('$(chap-challenge)',chap?octal(challenge):'');
    const script=html.match(/<script>([\s\S]*?)<\/script>/)![1];
    let nativeSubmits=0,entrySubmits=0;
    const native={elements:{username:{value:''},password:{value:''}},submit(){nativeSubmits++;}};
    const elements:any={native,entry:{submit(){entrySubmits++;}},message:{textContent:''}};
    vm.runInNewContext(script,{
      URLSearchParams,
      location:{hash:`#${new URLSearchParams({'an-voucher':voucher})}`,pathname:'/login',search:''},
      history:{replaceState(){}},document:{getElementById:(id:string)=>elements[id]},
    });
    assert.equal(nativeSubmits,1);
    assert.equal(entrySubmits,0);
    assert.equal(native.elements.username.value,voucher);
    assert.equal(native.elements.password.value,chap?
      crypto.createHash('md5').update(Buffer.from([7,...Buffer.from(voucher),...challenge])).digest('hex'):voucher);
  }
});

test('verification waits for RouterOS session visibility but never infers success from a redirect',async()=>{
  let reads=0,pauses=0;
  const result=await verifyHotspotConnection('FIXTURE-ONLY',{
    read:async()=>({on_network:true,active:++reads===3,uptime:'1s'}),
    pause:async()=>{pauses++;},
  });
  assert.equal(result.active,true);assert.equal(reads,3);assert.equal(pauses,2);
  reads=0;
  const inactive=await verifyHotspotConnection('FIXTURE-ONLY',{
    read:async()=>{reads++;return {on_network:true,active:false};},pause:async()=>{},
  });
  assert.equal(inactive.active,false);assert.equal(reads,5);
});

test('verification preserves router rejection, handles transient errors, and supports cancellation',async()=>{
  let reads=0;
  const denied=await verifyHotspotConnection('FIXTURE-ONLY',{
    read:async()=>{reads++;return {on_network:true,active:false,error:'Login ditolak MikroTik: invalid username or password'};},
    pause:async()=>{assert.fail('Router rejection must not be retried');},
  });
  assert.match(denied.error!,/invalid username/);assert.equal(reads,1);
  reads=0;
  const recovered=await verifyHotspotConnection('FIXTURE-ONLY',{
    read:async()=>{if(++reads===1)throw new Error('Temporary outage');return {on_network:true,active:true};},pause:async()=>{},
  });
  assert.equal(recovered.active,true);assert.equal(reads,2);
  const controller=new AbortController();
  reads=0;
  await assert.rejects(verifyHotspotConnection('FIXTURE-ONLY',{
    signal:controller.signal,
    read:async()=>{reads++;return {on_network:true,active:false};},
    pause:async()=>{controller.abort();},
  }),{name:'AbortError'});
  assert.equal(reads,1);
});