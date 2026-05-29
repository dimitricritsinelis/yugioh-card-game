import { describe, expect, it, vi } from "vitest";
import {
  handleVisibilityReconnect,
  shouldApplyFetchedView,
  shouldFetchAfterRealtimeEvent,
} from "../client/supabaseRealtime";

describe("realtime invalidation reducer", () => {
  it("ignores stale versions and fetches latest on newer versions", () => {
    expect(shouldFetchAfterRealtimeEvent(4, { version: 4 })).toBe(false);
    expect(shouldFetchAfterRealtimeEvent(4, { version: 3 })).toBe(false);
    expect(shouldFetchAfterRealtimeEvent(4, { version: 5 })).toBe(true);
  });

  it("only applies fallback-fetched views when they are newer", () => {
    expect(shouldApplyFetchedView(4, { version: 4 })).toBe(false);
    expect(shouldApplyFetchedView(4, { version: 3 })).toBe(false);
    expect(shouldApplyFetchedView(4, { version: 5 })).toBe(true);
  });

  it("fetches latest view when the tab becomes visible again", async () => {
    const fetchLatest = vi.fn().mockResolvedValue(undefined);
    const original = Object.getOwnPropertyDescriptor(document, "visibilityState");

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    await handleVisibilityReconnect(fetchLatest);
    expect(fetchLatest).toHaveBeenCalledTimes(1);

    if (original) {
      Object.defineProperty(document, "visibilityState", original);
    }
  });
});
