import {defineConfig} from '@playwright/test';
import path from 'node:path';
const evidence=process.env.CATALOG_BROWSER_EVIDENCE;
if(!evidence)throw Error('Fresh catalog evidence required');
export default defineConfig({testDir:'./e2e',testMatch:'catalog-staging.spec.ts',workers:1,retries:0,timeout:40000,expect:{timeout:8000},outputDir:path.join(evidence,'artifacts'),reporter:[['list'],['json',{outputFile:path.join(evidence,'results.json')}]],
 use:{baseURL:'http://127.0.0.1:5177',channel:'msedge',headless:true,serviceWorkers:'block',screenshot:'only-on-failure',trace:'retain-on-failure',timezoneId:'Asia/Ho_Chi_Minh'},
 projects:[{name:'desktop',use:{viewport:{width:1440,height:1000}}},{name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
 webServer:[{command:'node ../backend/scripts/catalog-staging-server.cjs',url:'http://127.0.0.1:5057/api/health',reuseExistingServer:false,timeout:30000},
 {command:'npm.cmd run dev -- --host 127.0.0.1 --port 5177 --strictPort',url:'http://127.0.0.1:5177',reuseExistingServer:false,timeout:30000,env:{VITE_PROXY_TARGET:'http://127.0.0.1:5057',VITE_MAP_PROVIDER:'leaflet',VITE_GOOGLE_MAPS_USAGE_APPROVED:'false'}}]});
