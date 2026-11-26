import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const playwright = process.env.ENDURANCE_PLAYWRIGHT;
const { chromium } = await import(playwright ? pathToFileURL(playwright).href : "playwright-core");
const origin = new URL(process.env.ENDURANCE_CANDIDATE_URL || "http://127.0.0.1:54467").origin;
const evidence = process.env.ENDURANCE_EVIDENCE_DIR;
if (evidence) await mkdir(evidence, { recursive: true });
const blockedId = "f0000000-8400-4000-8000-000000000001";
const activeId = "f0000000-8400-4000-8000-000000000002";
const jobId = "f0000000-8400-4000-8000-000000000003";
const now = new Date().toISOString();
const endsAt = new Date(Date.now() + 3600000).toISOString();
const job = {
  _id: jobId, sessionId: jobId, hostId: "fixture-relay", title: "Verification execution",
  workspace: "development", profile: "read-only", effort: "low", status: "completed",
  events: [], eventCount: 0, createdAt: now, finishedAt: now,
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const width of [1440, 390, 320]) {
    const blocked = {
      _id: blockedId, title: "Hosted grant verification", status: "blocked", revision: 11, endsAt,
      reason: "Deployment receipt required.", hostOnline: true, awaitingApprovals: ["verify"],
      steps: [{ key: "verify", title: "Verify deployment" }],
      results: { verify: { result: "blocked", jobId, finishedAt: now } },
    };
    const active = {
      _id: activeId, title: "Blueprint production pilot", status: "active", revision: 7, endsAt,
      hostOnline: true, awaitingApprovals: ["review"], steps: [{ key: "review", title: "Independent review" }],
      results: {},
    };
    const writes = [];
    const errors = [];
    const pollFailure = "Mission list temporarily unavailable.";
    let failNextLinkedPoll = true;
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(15000);
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem("cw_auth", JSON.stringify({ token: "fixture" })));
    await page.route("**/*", async route => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();
      if (url.origin === origin && method === "GET") return route.continue();
      const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization,content-type",
        "access-control-allow-methods": "GET,HEAD,PATCH,OPTIONS" };
      if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
      if (method === "HEAD" && url.pathname === "/operations/hosts") return route.fulfill({ status: 200, headers });
      if (method === "GET" && url.pathname === "/operations/missions" && failNextLinkedPoll &&
        new URL(page.url()).searchParams.get("record") === activeId) {
        failNextLinkedPoll = false;
        return route.fulfill({ status: 503, headers, json: { message: pollFailure } });
      }
      if (method !== "GET") {
        const id = url.pathname.split("/").at(-1);
        const body = request.postDataJSON();
        writes.push({ id, method, body });
        if (id === activeId && body.action === "approve") {
          if (writes.length === 1) {
            active.revision += 1;
            return route.fulfill({ status: 409, headers, json: { message: "Mission revision changed." } });
          }
          active.awaitingApprovals = [];
        } else if (id === blockedId && body.action === "recover") {
          blocked.status = "active";
          blocked.reason = null;
          blocked.awaitingApprovals = [];
        } else return route.fulfill({ status: 400, headers, json: { message: "Unexpected fixture mutation." } });
        return route.fulfill({ headers, json: { ok: true } });
      }
      const fixtures = {
        "/users/me": { _id: "owner", name: "Fixture owner" },
        "/operations/hosts": [],
        "/operations/workforce": { employees: [], departments: [] },
        "/operations/dispatch": { paused: false },
        "/operations/approvals": { requests: [] },
        "/operations/missions": [active, blocked],
        "/operations/jobs": [job],
        ["/operations/jobs/" + jobId]: job,
        "/operations/headquarters": { observedAt: now, paused: false, hosts: { online: 1 }, jobs: { running: 1 },
          approvals: [], recent: [job], next: [] },
      };
      return route.fulfill({ headers, json: fixtures[url.pathname] ?? [] });
    });

    const briefingUrl = origin + "/operations?workspace=headquarters";
    await page.goto(briefingUrl);
    const briefing = page.getByRole("region", { name: "Executive briefing" });
    const decision = briefing.getByRole("button", { name: "Review decisions for Blueprint production pilot" });
    await decision.click().catch(async error => { console.error(page.url(), await page.locator("body").innerText(), errors); throw error; });
    const dialog = page.getByRole("dialog", { name: "Persistent missions" });
    const pollAlert = dialog.getByRole("alert").filter({ hasText: pollFailure });
    await pollAlert.waitFor();
    const approve = dialog.getByRole("button", { name: "Approve Independent review" });
    await approve.waitFor();
    await pollAlert.waitFor({ state: "hidden" });
    assert.equal(new URL(page.url()).searchParams.get("record"), activeId);
    assert.equal(await dialog.getByRole("region", { name: blocked.title }).count(), 0);
    assert.equal(writes.length, 0);
    if (evidence) await dialog.screenshot({ path: join(evidence, `decision-${width}.png`) });
    const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === "/operations/missions");
    await approve.click();
    await dialog.getByRole("alert").filter({ hasText: "Mission revision changed." }).waitFor();
    await refreshed;
    await approve.click();
    await approve.waitFor({ state: "hidden" });
    assert.deepEqual(writes, [7, 8].map(revision => ({
      id: activeId, method: "PATCH", body: { action: "approve", revision, step: "review" },
    })));
    await page.keyboard.press("Escape");
    await page.waitForURL(url => !url.searchParams.has("record"));
    await dialog.waitFor({ state: "hidden" });

    await page.goto(briefingUrl);
    await briefing.getByRole("button", { name: blocked.title }).click();
    const heading = dialog.getByRole("heading", { name: blocked.title });
    const resolution = dialog.getByRole("textbox", { name: "Owner resolution for Verify deployment" });
    await resolution.waitFor();
    assert.equal(new URL(page.url()).searchParams.get("record"), blockedId);
    await page.reload();
    await resolution.waitFor();
    assert.equal(await heading.evaluate(element => document.activeElement === element), true);
    assert.equal(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth), true);
    assert.equal(writes.length, 2);
    if (evidence) await dialog.screenshot({ path: join(evidence, `blocker-${width}.png`) });
    await dialog.getByRole("button", { name: "Inspect", exact: true }).click();
    await page.waitForURL(url => url.searchParams.get("job") === jobId && !url.searchParams.has("record"));
    await dialog.waitFor({ state: "hidden" });
    await page.goBack();
    await resolution.waitFor();
    await resolution.fill("Fixture deployment receipt verified.");
    await dialog.getByRole("button", { name: "Resume blocked step" }).click();
    await resolution.waitFor({ state: "hidden" });
    assert.deepEqual(writes.at(-1), {
      id: blockedId, method: "PATCH",
      body: { action: "recover", revision: 11, step: "verify", resolution: "Fixture deployment receipt verified." },
    });
    assert.equal(writes.length, 3);
    assert.deepEqual(errors, []);
    console.log(`${width}px: poll recovery, focused approval, conflict/retry, blocker, reload, evidence, recovery passed`);
    await page.close();
  }
} finally {
  await browser.close();
}
