// PM Career Pathfinder — Agent 1: High-Speed Profile Search
// Flow:
// 1. Search global bar for `targetRole`
// 2. Click "People" filter
// 3. Click "Current companies" filter for `targetCompany`
// 4. Scrape [Name, Designation] directly from search cards over `maxPages` pages

import * as browserManager from '../browserManager.js';
import * as sessionStore from '../sessionStore.js';
import config from '../config.js';
import fs from 'fs';

export async function run(sessionId) {
    const session = sessionStore.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const { targetCompany, targetRole } = session;
    const maxPages = session.config.maxPages || config.maxPages;
    const pageLoadDelay = session.config.pageLoadDelay || config.pageLoadDelay;

    sessionStore.updateAgentStatus(sessionId, 'profileResearch', 'running', 0);
    console.log(`\n[Agent1] ═══ High-Speed Search: "${targetRole}" at "${targetCompany}" ═══\n`);

    const page = await browserManager.newPage();

    try {
        // ──────────────────────────────────────
        // STEP 1 & 2: Direct Navigation to People Search & Apply Company Filter
        // ──────────────────────────────────────
        console.log(`[Agent1] STEP 1: Direct navigation to People search for "${targetRole}"...`);
        const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(targetRole)}&origin=GLOBAL_SEARCH_HEADER`;
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });
        await browserManager.sleep(3000);

        // Ensure we are actually on the "People" tab. The SPA might fall back to "All" (blended).
        console.log(`[Agent1] Verifying we are on the People tab...`);
        try {
            const showAllPeopleBtn = page.locator('button', { hasText: 'Show all people results' }).first();
            if (await showAllPeopleBtn.isVisible()) {
                console.log(`[Agent1] Clicked 'Show all people results' button, waiting for results to load...`);
                await showAllPeopleBtn.click();
                await browserManager.sleep(3000);
            } else {
                const peopleLabel = page.locator('label', { hasText: /^People$/ }).first();
                if (await peopleLabel.isVisible()) {
                    console.log(`[Agent1] Clicked 'People' filter label, waiting for results to load...`);
                    await peopleLabel.click();
                    await browserManager.sleep(3000);
                }
            }
        } catch (e) {
            console.log(`[Agent1] Could not click People navigation: ${e.message}`);
        }

        console.log(`[Agent1] STEP 2: Applying "Current companies" filter for "${targetCompany}"...`);
        try {
            const currentCompanyBtn = page.locator('label', { hasText: 'Current companies' }).first();
            await currentCompanyBtn.waitFor({ state: 'visible', timeout: 10000 });
            await currentCompanyBtn.click();
        } catch (e) {
            console.log(`[Agent1] Failed to find "Current companies" filter: ${e.message}`);
            // Fallback: It might be under "All filters" or renamed. Let's dump for debug if it fails here
            try {
                await page.screenshot({ path: 'debug_filter_error.png' });
                fs.writeFileSync('debug_filter_error.html', await page.content());
            } catch (err) { }
            throw new Error('"Current companies" filter chip not found.');
        }
        await browserManager.sleep(2000);

        const companyInput = await page.waitForSelector('input[placeholder="Add a company"]', { timeout: 8000 });
        await companyInput.click();
        await companyInput.fill('');
        await companyInput.type(targetCompany, { delay: 100 });
        await browserManager.sleep(3000);

        const option = await page.waitForSelector('div[role="option"]', { timeout: 8000 });
        await option.click();
        await browserManager.sleep(1500);

        const showBtn = await page.waitForSelector('button:has-text("Show results")', { timeout: 8000 });
        await showBtn.click();
        await browserManager.sleep(5000);

        // ──────────────────────────────────────
        // STEP 4: Scrape Results & Paginate
        // ──────────────────────────────────────
        console.log('[Agent1] STEP 4: Scraping search result cards...');
        let totalScraped = 0;

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            console.log(`[Agent1]   ─ Page ${pageNum}/${maxPages} ─`);
            sessionStore.updateAgentStatus(sessionId, 'profileResearch', 'running', Math.round((pageNum / maxPages) * 90));

            await autoScroll(page);
            await browserManager.sleep(2000);

            // DEBUG DUMP
            try {
                const debugHtml = await page.evaluate(() => {
                    const el = document.querySelector('div[role="listitem"], .reusable-search__result-container');
                    return el ? el.outerHTML : 'NO LIST ITEM FOUND';
                });
                fs.writeFileSync('debug_card.html', debugHtml);
                console.log('[Agent1] Wrote debug_card.html');
            } catch (e) { console.error('Debug dump failed', e); }

            const profilesOnPage = await page.evaluate(() => {
                const results = [];
                const cards = document.querySelectorAll('div[role="listitem"]');

                for (const card of cards) {
                    // Extract Name
                    let name = 'Unknown';
                    let linkedinUrl = '';
                    let nameEl = card.querySelector('a[data-view-name="search-result-lockup-title"]');
                    if (!nameEl) {
                        const links = Array.from(card.querySelectorAll('a[href*="linkedin.com/in/"]'));
                        nameEl = links.find(l => l.textContent.trim().length > 0 && !l.querySelector('img, figure, svg'));
                    }
                    if (nameEl) {
                        const hiddenSpan = nameEl.querySelector('span[aria-hidden="true"]');
                        if (hiddenSpan && hiddenSpan.textContent.trim()) {
                            name = hiddenSpan.textContent.trim();
                        } else {
                            name = nameEl.textContent.trim();
                        }
                        // Remove newlines and anything following (like "Verified Profile")
                        name = name.split('\\n')[0].trim();
                        linkedinUrl = nameEl.href || '';
                    }

                    // Extract Designation/Headline
                    let designation = 'Unknown';
                    const textElements = Array.from(card.querySelectorAll('p, .entity-result__primary-subtitle'));
                    for (const el of textElements) {
                        const txt = el.textContent.trim().replace(/\\n+/g, ' ').replace(/\\s+/g, ' ');
                        // If it's not the name line, check if it looks like a headline or 'Current' role
                        if (txt.length > 5 && txt.length < 150 && !txt.startsWith(name)) {
                            if (txt.includes('Current:') || txt.toLowerCase().includes('data scientist') || txt.toLowerCase().includes('manager')) {
                                designation = txt.replace(/^Current:\\s*/i, '').trim();
                                break;
                            } else if (designation === 'Unknown') {
                                // Default to the first valid-looking paragraph after the name
                                designation = txt;
                            }
                        }
                    }

                    // Skip internal UI stuff mistakenly caught
                    if (name.toLowerCase() === 'linkedin' || name.toLowerCase().includes('sign in')) continue;

                    // Extract Profile Photo URL
                    let photoUrl = '';
                    const imgEl = card.querySelector('img[src^="https://media.licdn.com/dms/image/"], img.presence-entity__image');
                    if (imgEl && imgEl.src) {
                        photoUrl = imgEl.src;
                    }

                    if (name !== 'Unknown') {
                        results.push({
                            name,
                            currentDesignation: designation, // Map to existing field used by frontend
                            currentCompany: '', // Irrelevant now, but prevents undefined
                            previousRoles: [], // Empty for compatibility
                            linkedinUrl,
                            photoUrl
                        });
                    }
                }
                return results;
            });

            console.log(`[Agent1]   Found ${profilesOnPage.length} profiles on this page.`);
            if (profilesOnPage.length > 0) {
                profilesOnPage.forEach(p => console.log(`[Agent1]     • ${p.name} - ${p.currentDesignation}`));
                sessionStore.addProfiles(sessionId, profilesOnPage);
                totalScraped += profilesOnPage.length;
            }

            // Pagination
            if (pageNum < maxPages) {
                const hasNext = await page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                    const nextBtn = document.querySelector('button[aria-label="Next"], .artdeco-pagination__button--next');
                    if (nextBtn && !nextBtn.disabled) {
                        nextBtn.click();
                        return true;
                    }
                    return false;
                });

                if (!hasNext) {
                    console.log('[Agent1]   No more pages available.');
                    break;
                }
                await browserManager.sleep(pageLoadDelay);
            }
        }

        // ──────────────────────────────────────
        // STEP 5: Done
        // ──────────────────────────────────────
        sessionStore.updateAgentStatus(sessionId, 'profileResearch', 'complete', 100);
        console.log(`\n[Agent1] ✅ High-Speed Search Complete. Extracted ${totalScraped} profiles.\n`);

    } catch (err) {
        console.error(`[Agent1] ❌ Fatal error: ${err.message}`);
        sessionStore.updateAgentStatus(sessionId, 'profileResearch', 'error', 0);
        throw err;
    } finally {
        await page.close();
    }
}

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let total = 0;
            const distance = 500;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                total += distance;
                if (total >= document.body.scrollHeight - window.innerHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 250);
            setTimeout(() => { clearInterval(timer); resolve(); }, 4000);
        });
    });
}
