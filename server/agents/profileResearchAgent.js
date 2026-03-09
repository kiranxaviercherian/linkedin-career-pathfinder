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
    const maxPages = Number(session.config.maxPages || config.maxPages);
    const pageLoadDelay = Number(session.config.pageLoadDelay || config.pageLoadDelay);

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

            const profilesOnPage = await page.evaluate((tRole) => {
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

                    // Strict Phase 1 Filtering: Headline must contain the target role
                    if (tRole && !designation.toLowerCase().includes(tRole.toLowerCase())) {
                        continue;
                    }

                    // Skip internal UI stuff mistakenly caught
                    if (name.toLowerCase() === 'linkedin' || name.toLowerCase().includes('sign in')) continue;

                    // Extract Profile Photo URL
                    let photoUrl = '';
                    // Limit the search to the primary person's image container to avoid picking up mutual connections
                    const primaryAvatarImage = card.querySelector('div.presence-entity__image img[src^="https://media.licdn.com/dms/image/v2/"], a img[src^="https://media.licdn.com/dms/image/v2/"]');
                    if (primaryAvatarImage && primaryAvatarImage.src) {
                        photoUrl = primaryAvatarImage.src;
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
            }, targetRole);

            console.log(`[Agent1]   Found ${profilesOnPage.length} profiles on this page.`);
            if (profilesOnPage.length > 0) {
                profilesOnPage.forEach(p => console.log(`[Agent1]     • ${p.name} - ${p.currentDesignation}`));
                sessionStore.addProfiles(sessionId, profilesOnPage);
                totalScraped += profilesOnPage.length;
            }

            // Pagination via direct URL manipulation
            if (pageNum < maxPages) {
                console.log(`[Agent1]   Navigating directly to page ${pageNum + 1}...`);

                try {
                    // Extract the base search URL from the current page
                    const currentUrl = page.url();

                    // Safely manipulate LinkedIn's deeply nested search params
                    const urlObj = new URL(currentUrl);
                    urlObj.searchParams.set('page', (pageNum + 1).toString());
                    const nextUrl = urlObj.toString();

                    // Navigate to the next page directly
                    await page.goto(nextUrl, { waitUntil: 'domcontentloaded' });
                    await browserManager.sleep(pageLoadDelay);

                    // Wait for the new results container to load to ensure pagination succeeded
                    await page.waitForSelector('div[role="listitem"], .reusable-search__result-container', { timeout: 10000 }).catch(() => { });

                } catch (e) {
                    console.log(`[Agent1] Failed to navigate to next page: ${e.message}`);
                    break;
                }
            }
        }

        // ──────────────────────────────────────
        // STEP 5: Visit each profile for detailed experience
        // ──────────────────────────────────────
        const allProfiles = sessionStore.getSession(sessionId).agents.profileResearch.profiles;
        const profileVisitDelay = Number(session.config.profileVisitDelay || config.profileVisitDelay || 3000);
        console.log(`\n[Agent1] STEP 5: Visiting ${allProfiles.length} individual profiles for detailed experience...\n`);

        for (let i = 0; i < allProfiles.length; i++) {
            const profile = allProfiles[i];
            if (!profile.linkedinUrl) {
                console.log(`[Agent1]   [${i + 1}/${allProfiles.length}] Skipping ${profile.name} — no LinkedIn URL`);
                profile.experience = [];
                continue;
            }

            console.log(`[Agent1]   [${i + 1}/${allProfiles.length}] Visiting ${profile.name}...`);
            sessionStore.updateAgentStatus(sessionId, 'profileResearch', 'running', 90 + Math.round((i / allProfiles.length) * 10));

            try {
                await page.goto(profile.linkedinUrl, { waitUntil: 'domcontentloaded' });
                await browserManager.sleep(4000);

                // Scroll aggressively to trigger lazy-loading of Experience section
                for (let s = 0; s < 8; s++) {
                    await page.evaluate(() => window.scrollBy(0, 600));
                    await browserManager.sleep(800);
                }

                // Extract experience data using text-node walking
                // LinkedIn's current DOM uses deeply nested divs with obfuscated classes,
                // NOT <ul>/<li> or <span aria-hidden> for experience entries.
                const experience = await page.evaluate(() => {
                    const results = [];

                    // Find Experience section by h2 heading text
                    const sections = document.querySelectorAll('section');
                    let expSection = null;
                    for (const sec of sections) {
                        const h2 = sec.querySelector('h2');
                        if (h2 && h2.textContent.trim() === 'Experience') {
                            expSection = sec;
                            break;
                        }
                    }
                    if (!expSection) return results;

                    // Walk all visible text nodes in the Experience section
                    const textBlocks = [];
                    function walkText(el, depth = 0) {
                        if (depth > 20) return;
                        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
                        try {
                            const style = window.getComputedStyle(el);
                            if (style.display === 'none' || style.visibility === 'hidden') return;
                        } catch (e) { /* skip */ }

                        for (const child of el.childNodes) {
                            if (child.nodeType === Node.TEXT_NODE) {
                                const txt = child.textContent.trim();
                                if (txt.length > 0 && txt.length < 200) {
                                    textBlocks.push({ depth, text: txt });
                                }
                            } else if (child.nodeType === Node.ELEMENT_NODE) {
                                walkText(child, depth + 1);
                            }
                        }
                    }
                    walkText(expSection);

                    // Also collect company names from logo alt texts
                    const companyLogos = Array.from(expSection.querySelectorAll('img'))
                        .map(img => (img.alt || '').replace(/ logo$/i, '').trim())
                        .filter(name => name.length > 2 && !name.toLowerCase().includes('present') && !/\\d{4}/.test(name));

                    // Parse text blocks into experience entries
                    // Pattern: skip "Experience" heading, then look for:
                    //   - Role title (depth 14, plain text without date markers)
                    //   - Company · employment type (depth 14, contains " · ")
                    //   - Date range · duration (depth 12, matches date pattern)
                    //   - Location (depth 12, usually contains city/country)
                    // Entries are separated by company logos

                    const datePattern = /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+)?\d{4}\s*[-–—]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+)?(?:\d{4}|Present)/i;
                    const durationPattern = /\d+\s+(?:yr|yrs|mo|mos)/i;

                    let currentEntry = null;
                    let logoIdx = 0;

                    for (let i = 0; i < textBlocks.length; i++) {
                        const block = textBlocks[i];
                        const txt = block.text;

                        // Skip the section heading
                        if (txt === 'Experience') continue;
                        // Skip helper/promotional texts
                        if (txt.includes('helped me get this job') || txt.includes('Show all')) continue;

                        // Check if this looks like a date range line
                        if (datePattern.test(txt)) {
                            // This is a date/duration line — attach to current entry
                            if (currentEntry) {
                                // Parse into dateRange and duration
                                const parts = txt.split(' · ');
                                const dateRange = parts[0]?.trim() || txt;
                                const duration = parts[1]?.trim() || '';
                                if (currentEntry.roles.length > 0) {
                                    const lastRole = currentEntry.roles[currentEntry.roles.length - 1];
                                    if (!lastRole.dateRange) {
                                        lastRole.dateRange = dateRange;
                                        lastRole.duration = duration;
                                    }
                                }
                                // Check if this is a current role
                                if (txt.toLowerCase().includes('present')) {
                                    currentEntry.isCurrent = true;
                                }
                            }
                            continue;
                        }

                        // Check if this looks like a company + employment type line (contains " · ")
                        if (txt.includes(' · ') && !datePattern.test(txt) && !durationPattern.test(txt)) {
                            // e.g. "PRACYVA · Full-time" or "Google · Contract"
                            const companyPart = txt.split(' · ')[0].trim();
                            if (currentEntry && !currentEntry.company) {
                                currentEntry.company = companyPart;
                            } else if (currentEntry && currentEntry.company !== companyPart) {
                                // New entry
                                if (currentEntry.roles.length > 0) results.push(currentEntry);
                                currentEntry = { company: companyPart, isCurrent: false, roles: [] };
                            }
                            continue;
                        }

                        // Check if this looks like a role title (plain text, no special markers)
                        if (txt.length > 2 && txt.length < 100 && !txt.includes(' · ') && !datePattern.test(txt) && !durationPattern.test(txt)) {
                            // Skills lines: "+X skills" or comma-separated lists
                            if (txt.includes('skill')) continue;
                            // Location lines: contain comma + geographic keywords
                            const locationKeywords = ['India', 'United States', 'States', 'Remote', 'On-site', 'Hybrid',
                                'District', 'Pradesh', 'Karnataka', 'Tamil Nadu', 'Maharashtra', 'Telangana', 'Delhi',
                                'Bengaluru', 'Bangalore', 'Mumbai', 'Chennai', 'Hyderabad', 'Pune', 'Noida', 'Gurgaon',
                                'Gurugram', 'Kolkata', 'UK', 'USA', 'Singapore', 'Canada', 'Australia', 'Germany', 'France',
                                'London', 'New York', 'San Francisco', 'California', 'Bay Area', 'Seattle', 'Area'];
                            if (txt.includes(', ') && locationKeywords.some(kw => txt.includes(kw))) continue;
                            // Pure location format "City, State" 
                            if (/^[A-Z][a-zA-Z\s]+,\s+[A-Z][a-zA-Z\s]+/.test(txt) && txt.split(',').length >= 2) continue;
                            // Employment type strings
                            const empTypes = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship', 'Apprenticeship', 'Self-employed', 'Seasonal'];
                            if (empTypes.some(et => txt === et)) continue;
                            // Skip very short generic text
                            if (txt.length <= 3) continue;

                            // This is likely a role title
                            if (!currentEntry) {
                                const company = logoIdx < companyLogos.length ? companyLogos[logoIdx] : '';
                                logoIdx++;
                                currentEntry = { company, isCurrent: false, roles: [] };
                            }
                            currentEntry.roles.push({ title: txt, dateRange: '', duration: '' });
                        }
                    }

                    // Push the last entry
                    if (currentEntry && currentEntry.roles.length > 0) {
                        results.push(currentEntry);
                    }

                    return results;
                });

                profile.experience = experience;
                console.log(`[Agent1]     ✓ Found ${experience.length} experience entries`);

                // Strict Phase 2 Filtering: Deep Validation
                // Must have at least one CURRENT role that matches targetCompany AND targetRole
                const hasValidCurrentRole = experience.some(exp => {
                    if (!exp.isCurrent) return false;
                    const matchesCompany = exp.company.toLowerCase().includes(targetCompany.toLowerCase());
                    const matchesRole = exp.roles.some(r => r.title.toLowerCase().includes(targetRole.toLowerCase()));
                    return matchesCompany && matchesRole;
                });

                if (!hasValidCurrentRole) {
                    console.log(`[Agent1]     ⚠ Dropping profile (No current role matching "${targetRole}" at "${targetCompany}")`);
                    profile.invalid = true;
                    profile.experience = []; // clear to save space
                } else {
                    if (experience.length > 0) {
                        experience.forEach(exp => {
                            const tag = exp.isCurrent ? '🟢' : '⚪';
                            console.log(`[Agent1]       ${tag} ${exp.company} (${exp.roles.length} role${exp.roles.length > 1 ? 's' : ''})`);
                        });
                    }
                }

            } catch (err) {
                console.log(`[Agent1]     ⚠ Failed to scrape experience for ${profile.name}: ${err.message}`);
                profile.invalid = true;
                profile.experience = [];
            }

            // Rate-limit delay between profile visits
            if (i < allProfiles.length - 1) {
                await browserManager.sleep(profileVisitDelay);
            }
        }

        // Remove invalid strictly-filtered profiles from session store
        const validProfiles = allProfiles.filter(p => !p.invalid);
        sessionStore.getSession(sessionId).agents.profileResearch.profiles = validProfiles;
        console.log(`\n[Agent1] Strict Filtering Results: Managed to keep ${validProfiles.length} out of ${allProfiles.length} profiles.\n`);


        // ──────────────────────────────────────
        // STEP 6: Done
        // ──────────────────────────────────────
        sessionStore.updateAgentStatus(sessionId, 'profileResearch', 'complete', 100);
        console.log(`\n[Agent1] ✅ Complete. Extracted ${totalScraped} profiles with detailed experience.\n`);

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
