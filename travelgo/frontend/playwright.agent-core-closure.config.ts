import {defineConfig} from '@playwright/test';
import base from './playwright.agent-core.config';
export default defineConfig({...base,testMatch:['agent-core.spec.ts','agent-core-intent-v2.spec.ts']});
