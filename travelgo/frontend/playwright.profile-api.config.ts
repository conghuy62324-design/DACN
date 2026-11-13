import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  // Separate projects also separate the Sequelize fixture pools closed by each suite.
  projects: [
    { ...base.projects![0], name: 'edge-profile-api', testMatch: 't07-profile.api.spec.ts' },
    { ...base.projects![0], name: 'edge-booking-regression', testMatch: 't06-booking.spec.ts' },
  ],
  globalSetup: './e2e/t07-preflight.ts',
});
