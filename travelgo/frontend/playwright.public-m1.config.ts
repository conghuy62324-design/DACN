import { defineConfig } from '@playwright/test';
import path from 'node:path';
const evidence=process.env.M1_BROWSER_EVIDENCE;if(!evidence)throw Error('Fresh M1 evidence directory required');
export default defineConfig({testDir:'./e2e',testMatch:'public-m1.spec.ts',workers:1,retries:0,timeout:30000,outputDir:path.join(evidence,'artifacts'),reporter:[['list'],['json',{outputFile:path.join(evidence,'results.json')}]],
 use:{baseURL:'http://127.0.0.1:3356',channel:'msedge',headless:true,serviceWorkers:'block',screenshot:'only-on-failure',trace:'retain-on-failure'},
 projects:[{name:'desktop',use:{viewport:{width:1440,height:900}}},{name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
 webServer:{command:'npm.cmd run dev -- --host 127.0.0.1 --port 3356 --strictPort',url:'http://127.0.0.1:3356',reuseExistingServer:false,env:{VITE_PROXY_TARGET:'http://127.0.0.1:1',VITE_MAP_PROVIDER:'google',VITE_GOOGLE_MAPS_USAGE_APPROVED:'true',VITE_GOOGLE_MAPS_BROWSER_KEY:'MOCK_ONLY_BROWSER_KEY',VITE_GOOGLE_MAP_ID:'MOCK_ONLY_MAP_ID'}}});
