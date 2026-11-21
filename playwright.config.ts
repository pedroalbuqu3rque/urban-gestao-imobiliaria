import {defineConfig, devices} from '@playwright/test';

const baseURL=process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100';
export default defineConfig({
  testDir:'./tests',
  testMatch:'**/*.spec.ts',
  timeout:45000,
  workers:1,
  use:{
    baseURL,
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}
      : {},
  },
  projects:[
    {name:'Desktop Chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
    {name:'Mobile Chromium',use:{...devices['Pixel 7'],viewport:{width:390,height:844}}},
  ],
  webServer:process.env.PLAYWRIGHT_BASE_URL ? undefined : {
    command:'npm run dev -- --hostname 127.0.0.1 --port 3100',
    url:baseURL, reuseExistingServer:!process.env.CI, timeout:120000,
  },
});
