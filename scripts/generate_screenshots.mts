/* oxlint-disable no-console -- CLI script */

/**
 * Script to generate the screenshots used in the README using Playwright.
 *
 * As of when it was written, this script is capable of updating all of the
 * screenshots in the README without any manual intervention. However, it is
 * intended to be somewhat gestural; it's not tied into any sort of automated
 * processes, and should be assumed to require occasional manual updates as the
 * UI changes.
 */

import {
  type ChildProcess,
  execFile,
  execFileSync,
  spawn,
} from "node:child_process";
import { mkdir, mkdtemp, rm, stat, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  type Browser,
  type BrowserContext,
  chromium,
  type Locator,
  type Page,
} from "playwright";
import FixtureHunt from "../imports/FixtureHunt.ts";
import {
  CHAT_PUZZLE_TITLE,
  COLLAPSE_LIST_TAGS,
  DINGWORD_PUZZLE_TITLE,
  GUESS_PUZZLE_TITLE,
  PRIMARY_USER,
  SECONDARY_USER,
  SPARKLINE_PUZZLE_TITLE,
  TAG_HOVER_PUZZLE_TITLE,
  TAG_HOVER_TAG,
} from "../imports/ScreenshotFixture.ts";

const execFileAsync = promisify(execFile);

// Ambient types for Meteor globals available in the browser context
// when using page.evaluate() / page.waitForFunction().
declare const DDP: {
  _allSubscriptionsReady(): boolean;
};
declare const Meteor: {
  callAsync(method: string, ...args: unknown[]): Promise<unknown>;
  loginWithPassword(
    email: string,
    password: string,
    callback: (err?: unknown) => void,
  ): void;
};

const PORT = 4000;
const BASE_URL = `http://localhost:${PORT}`;

const HUNT_ID = FixtureHunt._id;

function findFixturePuzzle(title: string): string {
  const puzzle = FixtureHunt.puzzles.find((p) => p.title === title);
  if (!puzzle) throw new Error(`Fixture puzzle not found: ${title}`);
  return puzzle._id;
}

const VIEWPORT = { width: 1280, height: 800 };

const HERO_FRAME_DURATION = 2; // seconds per frame
const HERO_FPS = 15;
const HERO_BAR_HEIGHT = 48;

async function waitForServer(url: string, timeoutMs = 120_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server not ready yet
    }
    await new Promise((r) => {
      setTimeout(r, 1000);
    });
  }
  throw new Error(
    `Server at ${url} did not become ready within ${timeoutMs}ms`,
  );
}

function startMeteor(meteorLocalDir: string): ChildProcess {
  return spawn("meteor", ["--port", String(PORT)], {
    env: {
      ...process.env,
      METEOR_LOCAL_DIR: meteorLocalDir,
    },
    stdio: ["ignore", "inherit", "inherit"],
  });
}

/**
 * Call a Meteor method from within the Playwright page context.
 */
function callMethod(
  page: Page,
  method: string,
  ...args: unknown[]
): Promise<unknown> {
  return page.evaluate(
    ({ method, args }) => Meteor.callAsync(method, ...args),
    { method, args },
  );
}

/**
 * Log in as a user on a fresh page: wait for Meteor, authenticate, and set up profile.
 */
async function loginAs(
  page: Page,
  user: { email: string; password: string; displayName: string },
): Promise<void> {
  await page.goto(`${BASE_URL}/`);
  await page.waitForFunction(() => typeof Meteor !== "undefined", {
    timeout: 30_000,
  });
  await page.evaluate(
    ({ email, password }) => {
      return new Promise<void>((resolve, reject) => {
        Meteor.loginWithPassword(email, password, (err) => {
          if (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          } else {
            resolve();
          }
        });
      });
    },
    { email: user.email, password: user.password },
  );
  await page.waitForTimeout(1000);
  await callMethod(page, "Users.methods.updateProfile", {
    displayName: user.displayName,
    dingwords: [],
  });
}

/**
 * Try to wait until the page is "stable" (all subscriptions ready, React
 * rendered, and fonts loaded).
 */
async function waitForStable(page: Page): Promise<void> {
  await page.waitForFunction(
    async () => {
      // Wait until subscriptions are ready, then let React paint, then
      // confirm subscriptions are still ready (in case rendering created
      // new ones). Repeat if not.
      do {
        while (!DDP._allSubscriptionsReady()) {
          await new Promise<void>((r) => {
            requestAnimationFrame(() => r());
          });
        }
        await new Promise<void>((r) => {
          requestAnimationFrame(() => requestAnimationFrame(() => r()));
        });
      } while (!DDP._allSubscriptionsReady());

      // Wait for web fonts (Source Sans Pro, etc.) to finish loading
      await document.fonts.ready;
    },
    { timeout: 30_000 },
  );
}

/**
 * Get a padded bounding box for an element, clamped to the viewport.
 */
async function paddedBoundingBox(
  page: Page,
  target: Locator,
  padding: number,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await target.boundingBox();
  if (!box) throw new Error("Element has no bounding box");
  const vp = page.viewportSize()!;
  const x = Math.max(0, box.x - padding);
  const y = Math.max(0, box.y - padding);
  const right = Math.min(vp.width, box.x + box.width + padding);
  const bottom = Math.min(vp.height, box.y + box.height + padding);
  return { x, y, width: right - x, height: bottom - y };
}

type ScreenshotOptions = {
  name: string;
  url?: string;
  /** Extra setup to run after navigation but before screenshot/animation */
  setup?: (page: Page) => Promise<void>;
  /** Animation to record as a GIF. When defined, video is captured instead of a static screenshot. */
  animate?: (page: Page) => Promise<void>;
  /** Crop to a specific element instead of the full viewport */
  element?: {
    locator: (page: Page) => Locator;
    /** Padding (in px) around the element. */
    padding?: number;
  };
  /** Cleanup to run after screenshot is captured */
  teardown?: (page: Page) => Promise<void>;
  /** Subtitle text for the hero GIF. Only screenshots with this field are included in the hero. */
  subtitle?: string;
};

async function captureScreenshot(
  browser: Browser,
  storageState: string,
  tempDir: string,
  opts: ScreenshotOptions,
): Promise<void> {
  const { name, url, setup, animate, element, teardown } = opts;
  const screenshotsDir = join(process.cwd(), "screenshots");

  for (const scheme of ["light", "dark"] as const) {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      storageState,
      colorScheme: scheme,
      ...(animate
        ? { recordVideo: { dir: tempDir, size: VIEWPORT } }
        : undefined),
    });
    const page = await context.newPage();
    // Record when the page was created so we can compute video offsets
    const pageCreatedAt = Date.now();

    try {
      if (url) {
        await page.goto(url, { waitUntil: "load" });
      }

      await waitForStable(page);

      if (setup) {
        await setup(page);
      }

      if (animate) {
        // Capture wall-clock timestamps to trim the video to just the
        // animated portion (the video records from context creation)
        const animateStart = Date.now();
        await animate(page);
        const animateDuration = (Date.now() - animateStart) / 1000;

        // Compute crop rect if element is specified
        let crop:
          | { x: number; y: number; width: number; height: number }
          | undefined;
        if (element) {
          const loc = element.locator(page);
          await loc.waitFor({ timeout: 10_000 });
          crop = await paddedBoundingBox(page, loc, element.padding ?? 0);
        }

        if (teardown) {
          await teardown(page);
        }

        // Save the video to a known path. saveAs() waits for the video
        // to be fully written (unlike path(), which just returns the path
        // of a potentially-incomplete file).
        const video = page.video()!;
        const videoPath = join(tempDir, `${name}-${scheme}.webm`);
        await page.close();
        await video.saveAs(videoPath);

        // Build ffmpeg filter
        const filters: string[] = [];
        if (crop) {
          filters.push(
            `crop=${Math.round(crop.width)}:${Math.round(crop.height)}:${Math.round(crop.x)}:${Math.round(crop.y)}`,
          );
        }
        filters.push("fps=15");
        filters.push("split[s0][s1]");
        const filterComplex = `${filters.join(",")};[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5`;

        const outputPath = join(screenshotsDir, `${name}-${scheme}.gif`);
        const startOffset = (animateStart - pageCreatedAt) / 1000;
        await execFileAsync("ffmpeg", [
          "-y",
          "-ss",
          String(startOffset),
          "-t",
          String(animateDuration),
          "-i",
          videoPath,
          "-filter_complex",
          filterComplex,
          outputPath,
        ]);

        // Also save an MP4 version (for linking from README)
        const mp4OutputPath = join(screenshotsDir, `${name}-${scheme}.mp4`);
        const mp4Filters: string[] = [];
        if (crop) {
          mp4Filters.push(
            `crop=${Math.round(crop.width)}:${Math.round(crop.height)}:${Math.round(crop.x)}:${Math.round(crop.y)}`,
          );
        }
        mp4Filters.push("fps=15");
        await execFileAsync("ffmpeg", [
          "-y",
          "-ss",
          String(startOffset),
          "-t",
          String(animateDuration),
          "-i",
          videoPath,
          "-filter_complex",
          mp4Filters.join(","),
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          mp4OutputPath,
        ]);

        // Clean up temp video
        await unlink(videoPath);

        console.log(`  captured ${outputPath}`);
        console.log(`  captured ${mp4OutputPath}`);
      } else {
        // Static screenshot
        const path = join(screenshotsDir, `${name}-${scheme}.png`);

        if (element) {
          const loc = element.locator(page);
          await loc.waitFor({ timeout: 10_000 });
          const clip = await paddedBoundingBox(page, loc, element.padding ?? 0);
          await page.screenshot({ path, clip });
        } else {
          await page.screenshot({ path });
        }

        console.log(`  captured ${path}`);

        if (teardown) {
          await teardown(page);
        }
      }
    } finally {
      await context.close();
    }
  }
}

/**
 * Close all notification toasts by clicking their close buttons.
 */
async function dismissAllNotifications(page: Page): Promise<void> {
  for (const btn of await page.$$(".toast .btn-close")) {
    await btn.click();
  }
}

/**
 * Close all notification toasts except the announcement toast.
 */
async function dismissNonAnnouncementNotifications(page: Page): Promise<void> {
  for (const btn of await page.$$(
    '.toast:not([class*="AnnouncementToast__StyledToast"]) .btn-close',
  )) {
    await btn.click();
  }
}

/**
 * Use Playwright to render a subtitle bar PNG (white text on dark background).
 * This avoids font/encoding issues with ImageMagick.
 */
async function generateSubtitleBar(
  browser: Browser,
  outputPath: string,
  subtitle: string,
  width: number,
): Promise<void> {
  const context = await browser.newContext({
    viewport: { width, height: HERO_BAR_HEIGHT },
  });
  const page = await context.newPage();
  await page.setContent(`
    <body style="margin: 0; padding: 0;">
      <div style="
        width: ${width}px;
        height: ${HERO_BAR_HEIGHT}px;
        background: rgba(0, 0, 0, 0.75);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font: bold 20px system-ui, -apple-system, sans-serif;
      ">${subtitle.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</div>
    </body>
  `);
  await page.screenshot({ path: outputPath, omitBackground: true });
  await context.close();
}

async function generateHeroMp4(
  browser: Browser,
  screenshots: ScreenshotOptions[],
  tempDir: string,
): Promise<void> {
  const screenshotsDir = join(process.cwd(), "screenshots");

  const frameWidth = VIEWPORT.width;
  const frameHeight = VIEWPORT.height;
  const totalHeight = frameHeight + HERO_BAR_HEIGHT;

  for (const scheme of ["light", "dark"] as const) {
    const padColor = scheme === "light" ? "white" : "black";
    // pad=W:H:x:y:color — center the source image in a frame of uniform
    // dimensions, leaving room at the bottom for the subtitle bar
    const padFilter = `pad=${frameWidth}:${totalHeight}:(${frameWidth}-iw)/2:(${frameHeight}-ih)/2:${padColor}`;
    console.log(`\nGenerating hero-${scheme}.gif...`);

    const segmentPaths: string[] = [];

    for (let i = 0; i < screenshots.length; i++) {
      const s = screenshots[i]!;
      const { subtitle } = s;
      if (!subtitle) continue;

      const isAnimated = !!s.animate;
      const srcPath = join(
        screenshotsDir,
        `${s.name}-${scheme}.${isAnimated ? "gif" : "png"}`,
      );
      const segmentPath = join(tempDir, `hero-segment-${scheme}-${i}.mp4`);
      segmentPaths.push(segmentPath);

      const barPath = join(tempDir, `bar-${scheme}-${i}.png`);
      await generateSubtitleBar(browser, barPath, subtitle, frameWidth);

      // For static PNGs, -loop 1 tells ffmpeg to loop the single input
      // frame, and -t caps the duration. For animated GIFs, we use the
      // native duration (no time-stretching).
      const inputArgs: string[] = isAnimated ? [] : ["-loop", "1"];
      const durationArgs: string[] = isAnimated
        ? []
        : ["-t", String(HERO_FRAME_DURATION)];

      // filter_complex pipeline:
      //   1. [0:v] (source) → pad to uniform frame size
      //   2. overlay the subtitle bar PNG ([1:v]) at the bottom edge
      const videoFilter = `[0:v]${padFilter}[padded];[padded][1:v]overlay=0:${frameHeight}`;

      // Encode each segment as h264 mp4 so they can be concatenated later
      await execFileAsync("ffmpeg", [
        "-y",
        ...inputArgs,
        "-i",
        srcPath,
        "-i",
        barPath,
        "-filter_complex",
        videoFilter,
        ...durationArgs,
        "-r",
        String(HERO_FPS),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        segmentPath,
      ]);

      await unlink(barPath).catch(() => {});
    }

    // Concatenate all segments and convert to an optimized GIF.
    // The concat demuxer joins the mp4 segments, then the filter:
    //   1. split — duplicates the stream for two-pass palette optimization
    //   2. palettegen — analyzes all frames to build an optimal 128-color palette
    //   3. paletteuse — re-encodes using that palette with Bayer dithering
    // -loop 0 makes the GIF loop forever.
    const concatListPath = join(tempDir, `concat-${scheme}.txt`);
    await writeFile(
      concatListPath,
      segmentPaths.map((p) => `file '${p}'`).join("\n"),
    );

    // Generate MP4 version first (for linking from README)
    const mp4OutputPath = join(screenshotsDir, `hero-${scheme}.mp4`);
    await execFileAsync("ffmpeg", [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatListPath,
      "-filter_complex",
      `fps=${HERO_FPS}`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      mp4OutputPath,
    ]);
    const mp4FileSize = (await stat(mp4OutputPath)).size;
    console.log(
      `  hero-${scheme}.mp4: ${(mp4FileSize / 1024 / 1024).toFixed(1)}MB`,
    );

    // Clean up temp files
    for (const p of [...segmentPaths, concatListPath]) {
      await unlink(p).catch(() => {});
    }
  }
}

async function main() {
  // Create temp directory for isolated Meteor data
  const meteorLocalDir = await mkdtemp(join(tmpdir(), "jr-screenshots-"));
  console.log(`Using temp METEOR_LOCAL_DIR: ${meteorLocalDir}`);

  // Puzzle IDs used for screenshot navigation
  const chatPuzzleId = findFixturePuzzle(CHAT_PUZZLE_TITLE);
  const tagHoverPuzzleId = findFixturePuzzle(TAG_HOVER_PUZZLE_TITLE);
  const guessPuzzleId = findFixturePuzzle(GUESS_PUZZLE_TITLE);
  const dingwordPuzzleId = findFixturePuzzle(DINGWORD_PUZZLE_TITLE);

  // Ensure screenshots directory exists
  await mkdir(join(process.cwd(), "screenshots"), { recursive: true });

  let meteor: ChildProcess | undefined;
  let browser: Browser | undefined;
  try {
    // Start Meteor
    console.log("Starting Meteor...");
    meteor = startMeteor(meteorLocalDir);
    // Wait for server ready
    console.log("Waiting for server...");
    await waitForServer(BASE_URL);
    console.log("Server ready.");

    // Launch Playwright
    // Generate brown noise WAV for fake audio capture (spectrally similar
    // to human voice, makes spectrum visualizers look interesting)
    const noiseWavPath = join(meteorLocalDir, "brown-noise.wav");
    await execFileAsync("ffmpeg", [
      "-f",
      "lavfi",
      "-i",
      "anoisesrc=d=30:c=brown:r=48000:a=0.5",
      "-f",
      "wav",
      noiseWavPath,
    ]);

    browser = await chromium.launch({
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        `--use-file-for-fake-audio-capture=${noiseWavPath}`,
      ],
    });
    const provisionContext = await browser.newContext({ viewport: VIEWPORT });
    const provisionPage = await provisionContext.newPage();

    // Provision first user and log in
    console.log("Provisioning first user...");
    await provisionPage.goto(`${BASE_URL}/`);
    await provisionPage.waitForFunction(() => typeof Meteor !== "undefined", {
      timeout: 30_000,
    });
    await callMethod(provisionPage, "Users.methods.provisionFirst", {
      email: PRIMARY_USER.email,
      password: PRIMARY_USER.password,
    });

    console.log("Logging in as primary user...");
    await loginAs(provisionPage, PRIMARY_USER);

    // Create fixture hunt
    console.log("Creating fixture hunt...");
    await callMethod(provisionPage, "Hunts.methods.createFixture");
    await provisionPage.waitForTimeout(2000);

    // Provision supplemental data: Google Sheet link, chat messages,
    // bookmarks, guesses (all hard-coded in the server method).
    console.log("Provisioning screenshot data...");
    await callMethod(provisionPage, "Screenshots.methods.provisionData");
    await provisionPage.waitForTimeout(1000);

    // Capture storage state for primary user
    const primaryStorageState = join(meteorLocalDir, "primary-storage.json");
    await provisionContext.storageState({ path: primaryStorageState });

    // Set up secondary user and capture storage state
    console.log("Logging in as secondary user...");
    const secondaryProvisionContext = await browser.newContext({
      viewport: VIEWPORT,
    });
    const secondaryProvisionPage = await secondaryProvisionContext.newPage();
    await loginAs(secondaryProvisionPage, SECONDARY_USER);
    const secondaryStorageState = join(
      meteorLocalDir,
      "secondary-storage.json",
    );
    await secondaryProvisionContext.storageState({
      path: secondaryStorageState,
    });

    // Close provisioning contexts
    await provisionContext.close();
    await secondaryProvisionContext.close();

    // Create temp dir for video recordings
    const videoTempDir = join(meteorLocalDir, "videos");
    await mkdir(videoTempDir, { recursive: true });

    // Check for ffmpeg if any screenshots use animate
    const puzzleListUrl = `${BASE_URL}/hunts/${HUNT_ID}/puzzles`;
    const puzzlePageUrl = `${BASE_URL}/hunts/${HUNT_ID}/puzzles/${chatPuzzleId}`;

    /**
     * Helper to create a secondary user context+page for screenshots that
     * need a second participant (audio-call, dingword).
     */
    async function createSecondaryPage(): Promise<{
      context: BrowserContext;
      page: Page;
    }> {
      const ctx = await browser!.newContext({
        viewport: VIEWPORT,
        storageState: secondaryStorageState,
      });
      const p = await ctx.newPage();
      return { context: ctx, page: p };
    }

    const screenshots: ScreenshotOptions[] = [
      {
        name: "puzzle-page",
        subtitle: "Google Sheets \u2014 auto-created and shared per puzzle",
        url: puzzlePageUrl,
        setup: async (p) => {
          await dismissAllNotifications(p);
          // Wait for the Google Sheets iframe to load
          const iframe = p.locator("iframe");
          await iframe.waitFor({ timeout: 30_000 });
          await p.waitForTimeout(2000);
        },
      },
      {
        name: "puzzle-list",
        subtitle:
          "Tags \u2014 flexible grouping, nesting, and meta-puzzle tracking",
        url: puzzleListUrl,
        setup: async (p) => {
          await dismissAllNotifications(p);
          // Collapse tags so that more interesting groups are visible
          for (const tag of COLLAPSE_LIST_TAGS) {
            await p.locator(`[data-group-name="${tag}"]`).click();
          }
        },
      },
      {
        name: "chat",
        subtitle: "Chat \u2014 persistent, rich-text, with @-mentions",
        url: puzzlePageUrl,
        setup: async (p) => {
          await dismissAllNotifications(p);
          const editor = p.locator('[class*="ChatInput"] [role="textbox"]');
          await editor.click();
          // Pre-type the beginning of the message instantly
          await editor.pressSequentially("Has anyone tried **reading", {
            delay: 0,
          });
        },
        animate: async (p) => {
          // Small delay so the video is rolling before typing starts
          await p.waitForTimeout(300);
          const editor = p.locator('[class*="ChatInput"] [role="textbox"]');
          await editor.pressSequentially(" the first letters**?", {
            delay: 80,
          });
          await p.waitForTimeout(1500);
        },
        element: { locator: (p) => p.locator('[class*="ChatSectionDiv"]') },
      },
      {
        name: "audio-call",
        subtitle: "Audio calls \u2014 built-in WebRTC via mediasoup",
        url: puzzlePageUrl,
        setup: async (p) => {
          await dismissAllNotifications(p);

          const secondary = await createSecondaryPage();

          // Primary user starts the call
          const startBtn = p.locator("button", { hasText: "audio call" });
          await startBtn.click();
          await p.locator("button", { hasText: "Leave call" }).waitFor({
            timeout: 15_000,
          });

          // Secondary user joins the call on the same puzzle
          await secondary.page.goto(puzzlePageUrl, { waitUntil: "load" });
          await waitForStable(secondary.page);
          await dismissAllNotifications(secondary.page);
          const joinBtn = secondary.page.locator("button", {
            hasText: "audio call",
          });
          await joinBtn.click();
          await secondary.page
            .locator("button", { hasText: "Leave call" })
            .waitFor({ timeout: 15_000 });

          // Wait for both callers to appear in the primary page's UI
          await p.locator("text=2 callers").waitFor({ timeout: 10_000 });

          // Wait for both spectrum visualizers (one per caller) to confirm
          // audio streams have fully negotiated
          await p
            .locator('[class*="SpectrumCanvas"]')
            .nth(1)
            .waitFor({ timeout: 15_000 });

          // Stash secondary context for teardown
          (p as unknown as Record<string, unknown>).__secondary = secondary;
        },
        animate: async (p) => {
          // Let the spectrum visualizers animate for a few seconds
          await p.waitForTimeout(3000);
        },
        element: {
          locator: (p) =>
            p.locator("section", {
              has: p.locator("button", { hasText: "Leave call" }),
            }),
          padding: 8,
        },
        teardown: async (p) => {
          const secondary = (p as unknown as Record<string, unknown>)
            .__secondary as { context: BrowserContext; page: Page };
          // Leave call on both pages
          await secondary.page
            .locator("button", { hasText: "Leave call" })
            .click();
          await p.locator("button", { hasText: "Leave call" }).click();
          await p.waitForTimeout(500);
          await secondary.context.close();
        },
      },
      {
        name: "tag-hover",
        url: `${BASE_URL}/hunts/${HUNT_ID}/puzzles/${tagHoverPuzzleId}`,
        setup: async (p) => {
          await dismissAllNotifications(p);
          const tag = p.locator(`[data-tag-name="${TAG_HOVER_TAG}"]`);
          await tag.hover();
          await p.waitForSelector('div[role="tooltip"]', { timeout: 5_000 });
          // Wait for the hover tooltip animation to finish
          await p.waitForTimeout(500);
        },
        element: {
          locator: (p) => p.locator('div[role="tooltip"]'),
          padding: 40,
        },
      },
      {
        name: "activity-sparkline",
        subtitle: "Activity signals \u2014 viewer counts and sparklines",
        url: puzzleListUrl,
        setup: async (p) => {
          await dismissAllNotifications(p);
          // Target an unsolved puzzle's sparkline (sparklines are only
          // rendered for unsolved puzzles)
          const puzzleRow = p.locator('[class*="PuzzleDiv"]', {
            has: p.locator("a", { hasText: SPARKLINE_PUZZLE_TITLE }),
          });
          const sparkline = puzzleRow.locator(
            '[class*="PuzzleActivitySparkline"]',
          );
          await sparkline.scrollIntoViewIfNeeded();
          await sparkline.hover();
          await p.waitForSelector('div[role="tooltip"]', { timeout: 5_000 });
          // Wait for the hover tooltip animation to finish
          await p.waitForTimeout(500);
        },
        element: {
          locator: (p) => p.locator('div[role="tooltip"]'),
          padding: 40,
        },
      },
      {
        name: "filter-search",
        subtitle: "Search \u2014 instant filter by title, answer, or tag",
        url: puzzleListUrl,
        setup: async (p) => {
          await dismissAllNotifications(p);
          await p.waitForTimeout(500);
        },
        animate: async (p) => {
          await p.locator('input[type="text"]').fill("");
          await p
            .locator('input[type="text"]')
            .pressSequentially("word", { delay: 150 });
          await p.waitForTimeout(500);
        },
      },
      {
        name: "guess-submission",
        url: `${BASE_URL}/hunts/${HUNT_ID}/puzzles/${guessPuzzleId}`,
        setup: async (p) => {
          await dismissAllNotifications(p);
          const guessBtn = p.locator("button", { hasText: "Guess" });
          await guessBtn.click();
          await p.waitForSelector(".modal-dialog", { timeout: 5_000 });
          await p.locator("[id$='-guess']").fill("BRAZENLY EVIL");
          await p.locator("[id$='-guess-direction']").fill("10");
          await p.locator("[id$='-guess-confidence']").fill("100");
          // Click the modal title to dismiss any slider tooltip
          await p.locator(".modal-title").click();
          await p.waitForTimeout(300);
        },
        element: {
          locator: (p) => p.locator(".modal-dialog"),
          padding: 24,
        },
      },
      {
        name: "guess-queue",
        subtitle: "Operator queue \u2014 moderated guess submission to Hunt HQ",
        url: `${BASE_URL}/hunts/${HUNT_ID}/guesses`,
      },
      {
        name: "dingword",
        subtitle: "Notifications \u2014 dingword mentions and bookmark alerts",
        url: puzzleListUrl,
        setup: async (p) => {
          await dismissAllNotifications(p);

          const secondary = await createSecondaryPage();
          await secondary.page.goto(`${BASE_URL}/`, { waitUntil: "load" });
          await waitForStable(secondary.page);

          // Set a dingword for the primary user
          await callMethod(p, "Users.methods.updateProfile", {
            displayName: PRIMARY_USER.displayName,
            dingwords: ["cryptic"],
          });

          // Secondary user sends a message containing the dingword
          await callMethod(secondary.page, "ChatMessages.methods.send", {
            puzzleId: dingwordPuzzleId,
            content: JSON.stringify({
              type: "message",
              children: [
                {
                  text: "I think this puzzle might be a cryptic crossword",
                },
              ],
            }),
          });

          await secondary.context.close();

          // Wait for the dingword notification toast to appear
          await p.locator(".toast").waitFor({ timeout: 10_000 });
        },
        element: {
          locator: (p) => p.locator(".toast-container"),
          padding: 16,
        },
        teardown: async (p) => {
          // Clear the dingword so it doesn't fire on later screenshots
          await callMethod(p, "Users.methods.updateProfile", {
            displayName: PRIMARY_USER.displayName,
            dingwords: [],
          });
          await dismissAllNotifications(p);
        },
      },
      {
        name: "announcements",
        subtitle: "Announcements \u2014 teamwide broadcast messages",
        url: puzzleListUrl,
        // Post the announcement in setup so that earlier screenshots'
        // dismissAllNotifications calls don't permanently remove it.
        setup: async (p) => {
          // Dismiss any existing toasts (including announcements from
          // prior color-scheme iterations) before posting a fresh one
          await dismissAllNotifications(p);
          await callMethod(p, "Announcements.methods.post", {
            huntId: HUNT_ID,
            message:
              'We need a lot of help with the scavenger hunt ("I Wanna Be the Very Best") still. If you are local and might have any of the motivations, gear, or packed lunch items, please fill in what you can cover in the spreadsheet.',
          });
          await waitForStable(p);
          await dismissNonAnnouncementNotifications(p);
        },
        element: {
          locator: (p) =>
            p.locator('[class*="AnnouncementToast__StyledToast"]'),
          padding: 16,
        },
      },
      {
        name: "i18n",
        subtitle:
          "Internationalization \u2014 available in English and Chinese",
        url: puzzleListUrl,
        setup: async (p) => {
          await dismissAllNotifications(p);
          // Switch language to Chinese via the navbar dropdown
          await p.locator(".nav-link", { has: p.locator(".fa-user") }).click();
          await p.locator(".dropdown-item", { hasText: "中文" }).click();
          await p.waitForTimeout(500);
        },
      },
      {
        name: "mobile",
        subtitle: "Mobile \u2014 usable on phones for runarounds",
        url: puzzlePageUrl,
        setup: async (p) => {
          await p.setViewportSize({ width: 390, height: 844 });
          await dismissAllNotifications(p);
        },
      },
    ];

    // Check for ffmpeg if any screenshots use animate
    const hasAnimated = screenshots.some((s) => s.animate);
    if (hasAnimated) {
      try {
        execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
      } catch {
        throw new Error(
          "ffmpeg is required for animated screenshots but was not found on PATH",
        );
      }
    }

    // Capture screenshots
    console.log("\nCapturing screenshots...");

    for (const screenshot of screenshots) {
      console.log(`${screenshot.name}:`);
      await captureScreenshot(
        browser,
        primaryStorageState,
        videoTempDir,
        screenshot,
      );
    }

    // Generate hero MP4s from screenshots that have subtitles
    await generateHeroMp4(browser, screenshots, videoTempDir);

    const heroPath = join(process.cwd(), "screenshots", "hero-light.mp4");
    console.log(`
${"=".repeat(72)}
NEXT STEPS: Update the hero video in README.md
${"=".repeat(72)}

1. Upload ${heroPath} to GitHub as a user attachment:
   - Open any issue or PR comment on the repository
   - Drag and drop the file into the comment box
   - Copy the generated URL (https://github.com/user-attachments/assets/...)
   - You can discard the comment without posting it

2. Replace the src URL in the <video> tag in README.md with the new URL

${"=".repeat(72)}
`);
  } finally {
    // Clean up
    await browser?.close();
    if (meteor) {
      console.log("Shutting down Meteor...");
      meteor.kill("SIGTERM");
      const killTimeout = setTimeout(() => meteor!.kill("SIGKILL"), 10_000);
      await new Promise<void>((resolve) => {
        meteor!.on("exit", () => resolve());
      });
      clearTimeout(killTimeout);
    }

    // Wait for mongod to fully shut down before removing its data directory
    console.log("Waiting for mongod to release files...");
    await new Promise((r) => {
      setTimeout(r, 2000);
    });

    console.log("Cleaning up temp directory...");
    await rm(meteorLocalDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
