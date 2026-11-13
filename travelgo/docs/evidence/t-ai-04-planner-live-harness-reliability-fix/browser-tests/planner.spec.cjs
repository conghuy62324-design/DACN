// Independent actual-frontend acceptance. No production code or route is replaced.
// HTTP API is mocked; fixtures are sealed before browser launch.
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {test,expect}=require(path.resolve(__dirname,'../../../../frontend/node_modules/@playwright/test'));
const {runPlannerHarness}=require('../run-live.corrected.cjs');
const checks=require('../browser-checks.cjs');
const task=path.resolve(__dirname,'..'),fixture=JSON.parse(fs.readFileSync(path.join(task,'mock-browser-manifest.json'))),lock=JSON.parse(fs.readFileSync(path.join(task,'offline-input-lock-08.json')));
const browserDir='mock-browser-'+(process.env.PLANNER_MOCK_RUN||'02');
const user={id:'mock-planner-owner',fullName:'MOCK_ONLY Planner',email:'planner@example.test',roles:['CUSTOMER']};
const privacy={version:'LOCAL_DEMO_SLOTS_V1',mode:'LOCAL_DEMO',ttlSeconds:900,enabled:true,text:'MOCK_ONLY_BROWSER slots local/demo in RAM, 15 minutes.'};
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(task,f))).digest('hex');
async function scrollVisible(page,locator){
  const panel=page.getByRole('region',{name:'H\u1ed9i tho\u1ea1i',exact:true});
  await panel.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  await locator.evaluate(el=>{
    const container=el.closest('[role="region"][aria-label="H\u1ed9i tho\u1ea1i"]');
    if(!container)throw Error('CHAT_SCROLL_CONTAINER_REQUIRED');
    const r=el.getBoundingClientRect(),p=container.getBoundingClientRect();
    container.scrollBy({top:r.top-p.top-(container.clientHeight-r.height)/2,behavior:'instant'});
  });
}
async function setup(page){
  const audit={tier:'MOCK_ONLY_BROWSER',calls:[],blockedExternal:[],errors:[],requests:[],active:null};
  await page.clock.setFixedTime(new Date(fixture.clock));
  page.on('pageerror',error=>audit.errors.push(error.message));
  await page.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin!==fixture.origin){audit.blockedExternal.push({origin:url.origin,path:url.pathname});return route.abort('blockedbyclient');}
    if(!url.pathname.startsWith('/api/'))return route.continue();
    const call={method:request.method(),path:url.pathname,body:request.postData()?request.postDataJSON():null};audit.calls.push(call);
    const ok=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
    if(url.pathname==='/api/auth/me')return ok(user);
    if(url.pathname==='/api/favorites'&&request.method()==='GET')return ok([]);
    if(url.pathname==='/api/intelligence/consent')return ok({hasDecision:true,analyticsEnabled:false,personalizationEnabled:false,retentionDays:90});
    if(url.pathname==='/api/agent/verified-history/privacy')return ok(privacy);
    if(url.pathname==='/api/agent/chat'&&request.method()==='POST'){
      const item=audit.active;assert.ok(item,'HTTP_WITHOUT_ACTIVE_CASE');assert.equal(call.body.message,item.message,'LOCKED_MESSAGE');
      assert.equal(call.body.conversation.action,audit.requests.length?'continue':'start');
      assert.equal(call.body.conversation.consentVersion,privacy.version);
      if(audit.requests.length){assert.equal(call.body.conversation.id,fixture.id);assert.equal(call.body.conversation.revision,audit.requests.length);}
      assert.match(call.body.conversation.requestId,/^[0-9a-f-]{36}$/i);assert.ok(!audit.requests.some(x=>x.body.conversation.requestId===call.body.conversation.requestId));
      audit.requests.push({...call,caseId:item.id});
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(item.response)});
    }
    audit.errors.push('UNEXPECTED_API:'+request.method()+':'+url.pathname);return route.abort();
  });
  await page.addInitScript(({user})=>{localStorage.setItem('travelgo_token','MOCK_ONLY_PLANNER_TOKEN');localStorage.setItem('travelgo_user',JSON.stringify(user));},{user});
  await page.goto('/assistant');await expect(page.getByRole('heading',{name:'Tr\u1ee3 l\u00fd AI',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'D\u00f9ng G2 local/demo',exact:true}).click();
  await page.getByRole('button',{name:'\u0110\u1ed3ng \u00fd d\u00f9ng G2 local/demo',exact:true}).click();
  return audit;
}
test('MOCK_ONLY_BROWSER saved completed itinerary and both manual confirmations',async({page},info)=>{
  const audit=await setup(page),out=path.join(task,browserDir,info.project.name);fs.mkdirSync(out,{recursive:true});
  const ports={
    guards:{manifest:async()=>{for(const[f,h]of Object.entries(lock.hashes))assert.equal(hash(f),h);return true;},request:async item=>{assert.equal(audit.requests.length,fixture.cases.indexOf(item));return true;},session:async()=>true,authOwnership:async()=>true,toolSafety:async()=>true,nativeCap:async()=>true,quotaTtl:async()=>true,dbIsolation:async()=>true,runtimeSecurity:async()=>true},
    execute:async(item,ctx)=>ctx.agent(async()=>{
      audit.active=item;
      const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/agent/chat')&&r.request().method()==='POST');
      if(item.confirmation)await checks.clickConfirmation(page,item.confirmation);
      else{const input=page.getByLabel('Y\u00eau c\u1ea7u du l\u1ecbch c\u1ee7a b\u1ea1n');await input.fill(item.message);await page.getByRole('button',{name:'G\u1eedi y\u00eau c\u1ea7u',exact:true}).click();}
      const response=await responsePromise,body=await response.json();
      return{http:response.status(),body,result:body.data.result};
    }),
    checks:{response:async(item,o)=>{assert.equal(o.http,200);assert.deepEqual(o.body,item.response);return true;},rawExpected:async()=>true,sessionRevision:async(item,o)=>{assert.equal(o.body.data.conversation.revision,fixture.cases.indexOf(item)+1);return true;},toolExecution:async()=>true,dbMutation:async()=>true,runtimeSecurity:async()=>{assert.deepEqual(audit.errors,[]);return true;}},
    assertUi:async(item,o)=>{
      if(item.oracle){await checks.assertCompletedUi(page,o.result,expect);assert.equal(o.result.itinerary.daysCount,2);assert.equal(o.result.itinerary.nightsCount,1);assert.equal(o.result.itinerary.transportation,item.transport);await expect(page.getByTestId('agent-turn').last()).toContainText(item.message);}
      else{await expect(page.getByText('Agent \u0111ang y\u00eau c\u1ea7u b\u1ea1n x\u00e1c nh\u1eadn l\u1ea1i ph\u01b0\u01a1ng ti\u1ec7n.',{exact:true}).last()).toBeVisible();await checks.assertConfirmationControls(page);}
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      fs.writeFileSync(path.join(out,item.id+'.dom.txt'),await page.getByTestId('agent-turn').last().innerText(),{flag:'wx',encoding:'utf8'});
      if(item.id==='M-BASE'){
        const turn=page.getByTestId('agent-turn').last(),cost=turn.locator('section[aria-label="Chi ph\u00ed l\u1ecbch tr\u00ecnh"]');
        const show=locator=>scrollVisible(page,locator);
        const total=cost.getByText('3.500.000 \u20ab',{exact:true});await show(total);await expect(total).toBeInViewport();assert.ok((await total.boundingBox()).y>=70,'TOTAL_BELOW_FIXED_HEADER');
        await page.screenshot({path:path.join(out,'completed-viewport.png')});await page.screenshot({path:path.join(out,'completed-full.png'),fullPage:true});
        for(const n of [1,2]){
          const title=turn.getByText(n===1?'Kh\u00e1m ph\u00e1 [TEST FIXTURE] Planner DN A02 - synthetic sightseeing':'Kh\u00e1m ph\u00e1 [TEST FIXTURE] Planner DN A01 - synthetic sightseeing',{exact:true});
          await show(title);await expect(title).toBeInViewport();await page.screenshot({path:path.join(out,'day-'+n+'.png')});
        }
        const warning=turn.getByText(o.result.warnings[0],{exact:true});await show(warning);await expect(warning).toBeInViewport();await page.screenshot({path:path.join(out,'warnings.png')});
      }
      if(item.id==='M-ASK-BIKE'){await scrollVisible(page,page.getByRole('button',{name:checks.UI.motorbike,exact:true}));await expect(page.getByRole('button',{name:checks.UI.motorbike,exact:true})).toBeInViewport();await page.screenshot({path:path.join(out,'confirmation-viewport.png')});await page.screenshot({path:path.join(out,'confirmation.png'),fullPage:true});}
      return true;
    },cleanupPrecondition:async()=>true,cleanup:async()=>true,dispose:async()=>{audit.active=null;},
  };
  const result=await runPlannerHarness({cases:fixture.cases,ports});
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({tier:'MOCK_ONLY_BROWSER',result,audit,nativeHttp:0,database:false,guardNote:'DB/provider/ownership guards are MOCK ports; no LIVE claim.'},null,2)+'\n',{flag:'wx'});
  expect(result.status).toBe('PASS');expect(result.exitCode).toBe(0);expect(audit.errors).toEqual([]);expect(audit.requests).toHaveLength(5);
  expect(audit.requests[2].body.message).toBe('Ph\u01b0\u01a1ng ti\u1ec7n: motorbike');expect(audit.requests[4].body.message).toBe('Ph\u01b0\u01a1ng ti\u1ec7n: car');
  for(const file of ['completed-viewport.png','completed-full.png','confirmation.png']){const bytes=fs.readFileSync(path.join(out,file));expect(bytes.subarray(1,4).toString()).toBe('PNG');expect(bytes.readUInt32BE(16)).toBe(info.project.use.viewport.width);}
});
test('MOCK_ONLY_BROWSER corrupted and missing locator rejected immediately without dispatch',async({page},info)=>{
  const audit=await setup(page),started=performance.now();
  await expect(checks.clickConfirmation(page,'Xe m?y')).rejects.toThrow('UI_LITERAL_CORRUPT_BEFORE_LOCATOR');
  await expect(checks.clickConfirmation(page,'Xe m\u00e1y')).rejects.toThrow('UI_CONFIRMATION_BUTTON_MISSING');
  const elapsed=performance.now()-started;expect(elapsed).toBeLessThan(1000);expect(audit.requests).toHaveLength(0);expect(audit.errors).toEqual([]);
  const out=path.join(task,browserDir,info.project.name);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'locator-negative.json'),JSON.stringify({tier:'MOCK_ONLY_BROWSER',status:'PASS',elapsedMs:elapsed,agentRequests:0,timeout30Seconds:false,corruptionRejected:true,missingButtonRejected:true},null,2)+'\n',{flag:'wx'});
});
