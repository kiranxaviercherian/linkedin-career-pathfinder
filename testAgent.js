import * as browserManager from './server/browserManager.js';
import * as sessionStore from './server/sessionStore.js';
import { run } from './server/agents/profileResearchAgent.js';
import fs from 'fs';

async function testScraper() {
    console.log("Starting debug scraper...");

    // Create a mock session
    const targetCompany = "H&R Block";
    const targetRole = "Product Manager";
    const session = sessionStore.createSession(targetCompany, targetRole, { maxPages: 1 });

    try {
        await browserManager.launchBrowser();
        await browserManager.waitForLinkedInLogin();

        await run(session.id);

        // Output results
        const sess = sessionStore.getSession(session.id);
        console.log("EXTRACTED PROFILES:");
        console.log(JSON.stringify(sess.agents.profileResearch.profiles, null, 2));

        // Let's dump the HTML of the active page to see why it didn't match
        const page = await browserManager.newPage();

        const html = await page.evaluate(() => {
            const cards = document.querySelectorAll('div[role="listitem"], .reusable-search__result-container');
            if (cards.length > 0) {
                return cards[0].outerHTML;
            }
            return "NO CARDS FOUND on current page.";
        });
        fs.writeFileSync('debug_card.html', html);
        await page.screenshot({ path: 'debug_search.png' });
        console.log("Saved debug_card.html and debug_search.png");

    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        await browserManager.closeBrowser();
    }
}

testScraper();
