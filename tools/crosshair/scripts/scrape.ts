import "dotenv/config";
import fs from "node:fs";
import { createId } from "@paralleldrive/cuid2";
import { chromium } from "playwright";
import { db } from "../src/db/client";
import { competitors, rawSignals } from "../src/db/schema";

const SESSION_FILE = "reddit-session.json";

// ------------------------------------------------------------------
// UTILITY: Random delay with jitter
// ------------------------------------------------------------------
function randomDelay(baseMs: number, jitterMs: number = 2000): Promise<void> {
	const delay = baseMs + Math.floor(Math.random() * jitterMs);
	return new Promise((r) => setTimeout(r, delay));
}

// ------------------------------------------------------------------
// REDDIT SCRAPER - Playwright + DuckDuckGo hop (single hop per session)
// ------------------------------------------------------------------

async function getRedditContext() {
	const browser = await chromium.launch({
		headless: false,
		args: ["--disable-blink-features=AutomationControlled"],
	});

	let storageState: any;
	if (fs.existsSync(SESSION_FILE)) {
		try {
			storageState = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
		} catch (_e) {
			console.log("⚠️ Invalid session file, re-creating.");
		}
	}

	const context = await browser.newContext({
		storageState,
		viewport: { width: 1280, height: 800 },
		userAgent:
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	});
	const page = await context.newPage();

	return { browser, context, page };
}

async function performDuckDuckGoHop(page: any) {
	console.log("🦆 Performing DuckDuckGo hop to unlock Reddit...");

	const ddgUrl = "https://html.duckduckgo.com/html/?q=site:reddit.com/r/okta";
	await page.goto(ddgUrl);
	await randomDelay(2000, 2000);

	const redirectUrl = await page.evaluate(() => {
		const link = document.querySelector(".result__a") as HTMLAnchorElement;
		return link?.href;
	});

	if (!redirectUrl) {
		throw new Error("Could not find DuckDuckGo redirect link");
	}

	await page.goto(redirectUrl);
	await randomDelay(3000, 2000);

	const title = await page.title();
	if (title.includes("Blocked") || title.includes("Access Denied")) {
		throw new Error("Reddit blocking detected after DDG hop");
	}

	console.log("✅ Reddit unlocked via DuckDuckGo hop");
}

// NEW: Fetch top-level comments for a given post
async function fetchComments(
	page: any,
	subreddit: string,
	postId: string,
): Promise<string> {
	const commentsUrl = `https://www.reddit.com/r/${subreddit}/comments/${postId}/`;
	console.log(`      💬 Fetching comments from ${commentsUrl}`);

	try {
		await page.goto(commentsUrl);
		await randomDelay(2000, 1500);

		// Wait for comment threads to appear
		const commentSelector = 'div[data-testid="comment"]'; // Reddit's new comment structure
		// Fallback to old selector if needed
		const fallbackSelector = ".comment";
		let hasComments = false;
		try {
			await page.waitForSelector(commentSelector, { timeout: 5000 });
			hasComments = true;
		} catch {
			try {
				await page.waitForSelector(fallbackSelector, { timeout: 5000 });
				hasComments = true;
			} catch {
				console.log(`      ⚠️ No comments found for post ${postId}`);
				return "";
			}
		}

		if (!hasComments) return "";

		// Extract text from top-level comments (limit to 10)
		const commentTexts = await page.evaluate(() => {
			const elements = document.querySelectorAll(
				'[data-testid="comment"], .comment',
			);
			const texts: string[] = [];
			let depth = 0;
			for (const el of elements) {
				const text = el.textContent?.trim();
				if (text && text.length > 10 && depth < 10) {
					texts.push(text);
					depth++;
				}
			}
			return texts;
		});

		if (commentTexts.length === 0) return "";

		// Join comments with separator
		const commentsString = commentTexts
			.map((t, i) => `[Reply ${i + 1}]: ${t}`)
			.join("\n");
		console.log(`      💬 Found ${commentTexts.length} top-level comments`);
		return commentsString;
	} catch (error) {
		console.error(
			`      ❌ Error fetching comments for post ${postId}:`,
			(error as Error).message,
		);
		return "";
	}
}

async function scrapeSubreddit(
	page: any,
	subreddit: string,
	competitorId: string,
	mappedApp: string,
	retries = 3,
) {
	const jsonUrl = `https://www.reddit.com/r/${subreddit}/new.json?limit=25`;

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			console.log(`   🔍 Fetching ${jsonUrl} (attempt ${attempt})`);

			await page.goto(jsonUrl);
			await randomDelay(1500, 1500);

			const data = await page.evaluate(() => {
				try {
					return JSON.parse(document.body.innerText);
				} catch (_e) {
					return { error: document.body.innerText.slice(0, 200) };
				}
			});

			if (data.error) {
				if (data.error.includes("404")) {
					console.log(
						`   ⚠️ Subreddit r/${subreddit} does not exist or is private. Skipping.`,
					);
					return 0;
				}
				console.log(`   ⚠️ Error fetching JSON: ${data.error}`);
				if (attempt < retries) {
					await randomDelay(5000, 3000);
					continue;
				}
				return 0;
			}

			const posts = data.data?.children || [];
			let inserted = 0;

			const painKeywords = [
				"expensive",
				"pricing",
				"support",
				"bug",
				"broken",
				"migrate",
				"alternative",
				"replace",
				"switch",
				"sucks",
				"terrible",
				"overpriced",
			];

			for (const child of posts) {
				const post = child.data;
				const fullText = `${post.title || ""} ${post.selftext || ""}`;
				if (fullText.length < 30) continue;

				const lowerText = fullText.toLowerCase();
				const hasPain = painKeywords.some((kw) => lowerText.includes(kw));
				if (!hasPain) continue;

				const sourceUrl = `https://reddit.com${post.permalink}`;
				const existing = await db.query.rawSignals.findFirst({
					where: (fields, { eq }) => eq(fields.source_url, sourceUrl),
				});
				if (existing) continue;

				// NEW: Fetch comments for this post to enrich context
				const commentsText = await fetchComments(page, subreddit, post.id);
				const threadContext = `${fullText}\n\n${commentsText}`.slice(0, 5000); // Limit length

				await db.insert(rawSignals).values({
					id: createId(),
					source: "reddit",
					source_url: sourceUrl,
					thread_id: post.id || "",
					thread_context: threadContext,
					author: post.author || "unknown",
					raw_text: fullText.slice(0, 2000),
					competitor_id: competitorId,
					mapped_app: mappedApp,
					status: "new",
				});
				inserted++;
				console.log(
					`      ✅ Inserted post with ${commentsText ? "comments" : "no comments"}`,
				);

				// Delay after fetching comments to be polite
				await randomDelay(1000, 1000);
			}

			console.log(
				`   ✅ r/${subreddit}: ${posts.length} posts, ${inserted} new`,
			);
			return inserted;
		} catch (error) {
			console.error(
				`   ❌ Error fetching r/${subreddit}:`,
				(error as Error).message,
			);
			if (attempt < retries) {
				await randomDelay(5000, 3000);
			} else {
				console.log(`   ❌ Skipping r/${subreddit} after ${retries} attempts.`);
			}
		}
	}
	return 0;
}

async function scrapeRedditForCompetitor(page: any, competitor: any) {
	const subredditMap: Record<string, string[]> = {
		HubSpot: ["hubspot"],
		Salesforce: ["salesforce"],
		Zapier: ["zapier"],
		Slack: ["slack"],
		Notion: ["notion"],
		Airtable: ["airtable"],
		ClickUp: ["clickup"],
		Asana: ["asana"],
		Typeform: ["typeform"],
		SurveyMonkey: ["surveymonkey"],
		Intercom: ["intercom"],
		Zendesk: ["zendesk"],
		Make: ["make"],
		Calendly: ["calendly"],
		Pipedrive: ["pipedrive"],
		NetSuite: ["netsuite"],
		Cin7: ["cin7"],
		BambooHR: ["bamboohr"],
		Personio: ["personio"],
		Tableau: ["tableau"],
		Metabase: ["metabase"],
		Okta: ["okta"],
		Auth0: ["auth0"],
		"1Password": ["1password"],
	};

	const subreddits = subredditMap[competitor.name] || [
		competitor.name.toLowerCase(),
	];
	let totalInserted = 0;

	for (const sub of subreddits) {
		const inserted = await scrapeSubreddit(
			page,
			sub,
			competitor.id,
			competitor.mapped_app,
		);
		totalInserted += inserted;
		await randomDelay(3000, 5000);
	}

	console.log(`   ✅ ${competitor.name}: ${totalInserted} new signals`);
	return totalInserted;
}

// ------------------------------------------------------------------
// MAIN
// ------------------------------------------------------------------
async function main() {
	console.log("📡 Starting Reddit scraping with Playwright...");

	const allCompetitors = await db.select().from(competitors);
	if (allCompetitors.length === 0) {
		console.log("⚠️ No competitors found. Run seed first.");
		process.exit(0);
	}

	const { browser, context, page } = await getRedditContext();

	try {
		if (!fs.existsSync(SESSION_FILE)) {
			await performDuckDuckGoHop(page);
			await context.storageState({ path: SESSION_FILE });
			console.log("💾 Session saved.");
		} else {
			console.log("♻️ Existing session found. Skipping hop.");
			await page.goto("https://www.reddit.com/r/okta/new.json?limit=1");
			const title = await page.title();
			if (title.includes("Blocked") || title.includes("Access Denied")) {
				console.log("⚠️ Session invalid, re-doing hop...");
				await performDuckDuckGoHop(page);
				await context.storageState({ path: SESSION_FILE });
				console.log("💾 Session saved.");
			}
		}

		for (let i = 0; i < allCompetitors.length; i++) {
			const comp = allCompetitors[i];
			console.log(`\n🔍 ${comp.name} (${i + 1}/${allCompetitors.length})...`);
			await scrapeRedditForCompetitor(page, comp);
			await context.storageState({ path: SESSION_FILE });
			if (i < allCompetitors.length - 1) {
				console.log("⏳ Pausing before next competitor...");
				await randomDelay(5000, 5000);
			}
		}
	} catch (error) {
		console.error("❌ Scraping failed:", error);
	} finally {
		await browser.close();
	}

	console.log("\n✅ Reddit scraping done.");
	process.exit(0);
}

main().catch(console.error);
