'use strict';
const assert=require('node:assert/strict');
class RealGuards{
 constructor(runtime){this.r=runtime;}
 async manifest(item,ctx){this.r.context(ctx);this.r.verify();this.r.stage(item.id);return true;}
 async request(item){const r=this.r;r.assertTemplate(item);return true;}
 async session(item){const r=this.r;r.assertSession(item);return true;}
 async authOwnership(){this.r.assertOwnership();return true;}
 async toolSafety(){this.r.assertToolBoundary();return true;}
 async nativeCap(){this.r.assertCap();return true;}
 async quotaTtl(){this.r.assertQuotaTtl();return true;}
 async dbIsolation(item){await this.r.assertFixtures('pre-'+item.id);return true;}
 async runtimeSecurity(item){await this.r.assertRuntime(item);return true;}
 async response(item,observed){this.r.assertResponse(item,observed);return true;}
 async rawExpected(item){this.r.assertRaw(item);return true;}
 async sessionRevision(item){this.r.assertHistory(item);return true;}
 async toolExecution(item){this.r.assertExecuted(item);return true;}
 async dbMutation(item){await this.r.assertFixtures('post-'+item.id);this.r.assertToolBoundary(false);return true;}
 async postRuntime(item){await this.r.assertRuntime(item,false);return true;}
}
function bindRealGuards(runtime){const g=new RealGuards(runtime);return{
 guards:Object.fromEntries(['manifest','request','session','authOwnership','toolSafety','nativeCap','quotaTtl','dbIsolation','runtimeSecurity'].map(k=>[k,g[k].bind(g)])),
 checks:{...Object.fromEntries(['response','rawExpected','sessionRevision','toolExecution','dbMutation'].map(k=>[k,g[k].bind(g)])),runtimeSecurity:g.postRuntime.bind(g)}
};}
function assertBindings(ports){for(const[k,list]of Object.entries({guards:['manifest','request','session','authOwnership','toolSafety','nativeCap','quotaTtl','dbIsolation','runtimeSecurity'],checks:['response','rawExpected','sessionRevision','toolExecution','dbMutation','runtimeSecurity']}))for(const name of list)assert.equal(typeof ports[k]?.[name],'function','MISSING_REAL_ADAPTER:'+k+'.'+name);for(const name of ['execute','assertUi','cleanupPrecondition','cleanup','dispose'])assert.equal(typeof ports[name],'function','MISSING_REAL_ADAPTER:'+name);return true;}
module.exports={RealGuards,bindRealGuards,assertBindings};
