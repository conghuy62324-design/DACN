import {defineConfig} from '@playwright/test';
import base from './playwright.agent-core.config';
export default defineConfig({...base,testMatch:'natural-chat.spec.ts',webServer:{...base.webServer as any,env:{...(base.webServer as any).env,VITE_AGENT_DEBUG_CONTROLS:'true'}}});
