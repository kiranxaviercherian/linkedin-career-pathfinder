# LinkedIn Profile Search Agent

An automated tool that searches LinkedIn for professionals matching a target **role** and **company**, extracts their detailed work experience, and displays the results in a sleek, real-time dashboard.

---

## ✨ Features

* **Automated LinkedIn Search:** Enter a role (e.g., "Product Manager") and a company (e.g., "Google"), and the agent scrapes LinkedIn search results using a headless Chromium browser via Playwright.
* **Two-Phase Strict Filtering:**
    * **Phase 1 (Headline Filter):** Profiles whose headline doesn't contain the target role keyword are immediately skipped during search result scraping.
    * **Phase 2 (Deep Experience Validation):** After visiting each profile, the agent validates that at least one *current* role matches both the target company and the target role. Profiles that don't pass are dropped. ***Implementation in-progress**
* **Detailed Experience Extraction:** Visits each individual LinkedIn profile to extract structured work experience data, including company names, role titles, date ranges, durations, and current/previous status.**Implementation in-progress**
* **Expandable Profile Cards:** Click on any profile card in the dashboard to reveal a detailed career timeline, grouped by "Current" and "Previous" experience.
* **Real-Time Progress:** The dashboard polls the backend and updates live as profiles are discovered and processed.
* **Configurable:** Adjust max pages to scrape, page load delays, and profile visit delays via the config file.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, React Router, Vite |
| **Backend** | Node.js, Express 5 |
| **Browser Automation** | Playwright (Chromium) |
| **Styling** | Vanilla CSS (dark glassmorphism theme) |
| **Charting** | Recharts, D3.js |

---

## 📁 Project Structure

```text
pm-career-pathfinder/
├── index.html                          # App entry point
├── package.json
├── vite.config.js
├── server/
│   ├── index.js                        # Express server entry
│   ├── config.js                       # Default configuration
│   ├── browserManager.js               # Playwright browser lifecycle
│   ├── sessionStore.js                 # In-memory session & agent data store
│   ├── agents/
│   │   └── profileResearchAgent.js     # Core scraping & filtering agent
│   └── routes/
│       └── agentRoutes.js              # REST API routes
├── src/
│   ├── main.jsx                        # React entry
│   ├── App.jsx                         # Router setup
│   ├── index.css                       # Global styles & design tokens
│   ├── pages/
│   │   ├── HomePage.jsx                # Search form UI
│   │   └── DashboardPage.jsx           # Real-time results dashboard
│   ├── components/
│   │   └── PMProfileList.jsx           # Expandable profile cards with career timelines
│   └── hooks/
│       └── useAgentData.js             # Polling hook for agent status
└── testAgent.js                        # CLI test script for the agent
