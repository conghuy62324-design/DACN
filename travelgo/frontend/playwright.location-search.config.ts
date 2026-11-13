import {defineConfig} from '@playwright/test';
import path from 'node:path';
const evidence=process.env.LOCATION_EVIDENCE;if(!evidence)throw Error('Fresh location evidence required');
export default defineConfig({testDir:'./e2e',testMatch:'location-search.spec.ts',workers:1,retries:0,timeout:35000,expect:{timeout:7000},outputDir:path.join(evidence,'artifacts'),reporter:[['list'],['json',{outputFile:path.join(evidence,'results.json')}]],use:{baseURL:'http://127.0.0.1:5177',channel:'msedge',headless:true,serviceWorkers:'block',screenshot:'only-on-failure',trace:'retain-on-failure',timezoneId:'Asia/Ho_Chi_Minh'},projects:[{name:'desktop',use:{viewport:{width:1440,height:1000}}},{name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}]});
