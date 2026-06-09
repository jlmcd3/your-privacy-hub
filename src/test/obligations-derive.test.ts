import { describe, it, expect } from "vitest";
import {
  addDays,
  daysUntil,
  euNoticeRefreshDate,
  obligationId,
  severityFor,
} from "../../supabase/functions/get-obligations/derive";

describe("obligations derive", () => {
  describe("severityFor boundaries", () => {
    it("-1 -> overdue", () => expect(severityFor(-1)).toBe("overdue"));
    it("0 -> due_soon", () => expect(severityFor(0)).toBe("due_soon"));
    it("60 -> due_soon", () => expect(severityFor(60)).toBe("due_soon"));
    it("61 -> upcoming", () => expect(severityFor(61)).toBe("upcoming"));
    it("180 -> upcoming", () => expect(severityFor(180)).toBe("upcoming"));
    it("181 -> scheduled", () => expect(severityFor(181)).toBe("scheduled"));
  });

  describe("daysUntil", () => {
    it("computes whole UTC days from today", () => {
      const today = new Date(Date.UTC(2026, 5, 9));
      const due = new Date(Date.UTC(2026, 5, 12)).toISOString();
      expect(daysUntil(due, today)).toBe(3);
    });
    it("handles past dates as negative", () => {
      const today = new Date(Date.UTC(2026, 5, 9));
      const due = new Date(Date.UTC(2026, 5, 5)).toISOString();
      expect(daysUntil(due, today)).toBe(-4);
    });
  });

  describe("euNoticeRefreshDate", () => {
    it("uses earliest generated_at + 365d among current non-combined docs", () => {
      const docs = [
        { is_current: true, is_combined: false, generated_at: "2026-03-01T00:00:00Z" },
        { is_current: true, is_combined: false, generated_at: "2026-01-15T00:00:00Z" },
        { is_current: true, is_combined: true, generated_at: "2025-12-01T00:00:00Z" }, // excluded
        { is_current: false, is_combined: false, generated_at: "2025-11-01T00:00:00Z" }, // excluded
      ];
      const due = euNoticeRefreshDate(docs);
      expect(due).toBe(addDays("2026-01-15T00:00:00Z", 365));
    });
    it("returns null when no eligible docs", () => {
      expect(euNoticeRefreshDate([])).toBeNull();
      expect(
        euNoticeRefreshDate([
          { is_current: false, is_combined: false, generated_at: "2026-01-01T00:00:00Z" },
        ])
      ).toBeNull();
    });
    it("skips when generated_at absent", () => {
      expect(
        euNoticeRefreshDate([
          { is_current: true, is_combined: false, generated_at: null },
        ])
      ).toBeNull();
    });
  });

  describe("obligationId", () => {
    it("is stable + deterministic", () => {
      const id = obligationId("ropa_refresh", "ropa_sessions", "abc", "2026-01-01T00:00:00.000Z");
      expect(id).toBe("ropa_refresh:ropa_sessions:abc:2026-01-01T00:00:00.000Z");
    });
  });
});
