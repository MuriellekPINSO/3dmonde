import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',timeout:45000,use:{baseURL:process.env.TEST_BASE_URL ?? 'http://127.0.0.1:5173',viewport:{width:1440,height:900},launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}}});
