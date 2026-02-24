// PM Career Pathfinder — Playwright Browser Manager
import { chromium } from 'playwright';
import config from './config.js';

let browser = null;
let context = null;

export async function launchBrowser() {
    console.log('[BrowserManager] launchBrowser called');
    if (context) {
        try {
            // If context exists but was somehow closed, remove it
            if (context.pages().length === 0) {
                context = null;
            } else {
                console.log('[BrowserManager] Reusing existing context');
                return context;
            }
        } catch (err) {
            // context.pages() throws if context is closed
            context = null;
        }
    }

    console.log('[BrowserManager] Creating new persistent context...');
    context = await chromium.launchPersistentContext('./.linkedin_session', {
        headless: config.headless,
        args: ['--start-maximized'],
        viewport: { width: 1280, height: 900 },
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    console.log('[BrowserManager] Chromium browser launched (persistent mode + visible).');
    return context;
}

/**
 * Navigate to LinkedIn and wait for user to manually log in.
 * The page stays open so agents can reuse it.
 */
export async function waitForLinkedInLogin() {
    await launchBrowser();

    // Check if we are already logged in by looking at cookies or jumping to feed
    let page = context.pages()[0] || await context.newPage();

    console.log('[BrowserManager] ================================================');
    console.log('[BrowserManager] Please log in to LinkedIn in the browser window...');
    console.log('[BrowserManager] ================================================');

    // Make sure we go to login to prompt the user
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

    // Wait up to 5 minutes for user to log in
    try {
        // Wait for any of these authenticated-page indicators
        await page.waitForFunction(() => {
            const url = window.location.href;
            return url.includes('/feed') || url.includes('/mynetwork') || url.includes('/in/') || url.includes('/search');
        }, { timeout: 300000 });
    } catch {
        const url = page.url();
        if (!url.includes('linkedin.com/feed') && !url.includes('linkedin.com/in/')) {
            throw new Error('LinkedIn login timed out after 5 minutes. Please try again.');
        }
    }

    console.log('[BrowserManager] ✅ LinkedIn login detected. Ready to work.');
    await page.close();
}

export async function newPage() {
    if (!context) {
        await launchBrowser();
    }
    try {
        return await context.newPage();
    } catch (e) {
        context = null;
        await launchBrowser();
        return await context.newPage();
    }
}

export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function closeBrowser() {
    if (context) {
        try {
            await context.close();
        } catch (e) { }
        browser = null;
        context = null;
        console.log('[BrowserManager] Browser closed.');
    }
}

export function getLoginStatus() {
    try {
        return !!context && context.pages().length > 0;
    } catch (err) {
        return false;
    }
}
