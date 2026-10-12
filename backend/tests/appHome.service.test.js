// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanBannerInput, cleanAnnouncementInput, isLive } from "../src/services/appHome.service.js";

const img = { url: "https://cdn.musafirbaba.com/app-banners/a.webp", key: "app-banners/a.webp", width: 1200, height: 400, size: 60000 };

test("valid banner opening a screen", () => {
  const { value, error } = cleanBannerInput({ title: "Diwali", image: img, action: { type: "SCREEN", screen: "TOURS", url: "x" } });
  assert.equal(error, undefined);
  assert.deepEqual(value.action, { type: "SCREEN", screen: "TOURS", url: undefined });
});

test("banner rules", () => {
  assert.match(cleanBannerInput({ image: img }).error, /Title/);
  assert.match(cleanBannerInput({ title: "x" }).error, /image/);
  assert.match(cleanBannerInput({ title: "x", image: { ...img, width: 800 } }).error, /1200x400/);
  assert.match(cleanBannerInput({ title: "x", image: { ...img, size: 900000 } }).error, /too large/);
  assert.match(cleanBannerInput({ title: "x", image: img, action: { type: "SCREEN", screen: "HACK" } }).error, /screen/);
  assert.match(cleanBannerInput({ title: "x", image: img, action: { type: "URL", url: "javascript:alert(1)" } }).error, /link/);
  assert.match(cleanBannerInput({ title: "x", image: img, startAt: "2026-10-10", endAt: "2026-10-01" }).error, /End date/);
});

test("partial banner update only touches given fields", () => {
  const { value } = cleanBannerInput({ isActive: false }, { partial: true });
  assert.deepEqual(value, { isActive: false });
  assert.deepEqual(cleanBannerInput({ endAt: "" }, { partial: true }).value, { endAt: null });
});

test("announcement rules", () => {
  const ok = cleanAnnouncementInput({ headline: "  Kedarnath   Yatra registration is open ", message: "Details", sendPush: 1 });
  assert.equal(ok.value.headline, "Kedarnath Yatra registration is open");
  assert.equal(ok.value.sendPush, true);
  assert.match(cleanAnnouncementInput({ headline: "x".repeat(91), message: "m" }).error, /90/);
  assert.match(cleanAnnouncementInput({ headline: "h" }).error, /message/);
});

test("live window", () => {
  const now = new Date("2026-10-12T10:00:00Z");
  assert.equal(isLive({ isActive: true }, now), true);
  assert.equal(isLive({ isActive: false }, now), false);
  assert.equal(isLive({ isActive: true, startAt: "2026-10-13" }, now), false);
  assert.equal(isLive({ isActive: true, endAt: "2026-10-12T09:00:00Z" }, now), false);
  assert.equal(isLive({ isActive: true, startAt: "2026-10-11", endAt: "2026-10-20" }, now), true);
});
