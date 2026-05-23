import { describe, it, expect } from "vitest";
import {
  SCHEDULE_PRESETS,
  DEFAULT_SCHEDULE_CRON,
  findSchedulePreset,
} from "@/lib/audits/cron-presets";

describe("SCHEDULE_PRESETS", () => {
  it("has unique ids", () => {
    const ids = SCHEDULE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every cron is a 5-field expression", () => {
    for (const preset of SCHEDULE_PRESETS) {
      expect(preset.cron.trim().split(/\s+/)).toHaveLength(5);
    }
  });
});

describe("DEFAULT_SCHEDULE_CRON", () => {
  it("matches a known preset (daily)", () => {
    expect(findSchedulePreset(DEFAULT_SCHEDULE_CRON)?.id).toBe("daily");
  });
});

describe("findSchedulePreset", () => {
  it("maps an interval cron to its preset", () => {
    expect(findSchedulePreset("*/15 * * * *")?.id).toBe("every15m");
    expect(findSchedulePreset("0 */6 * * *")?.id).toBe("every6h");
    expect(findSchedulePreset("0 9 * * MON")?.id).toBe("weekly");
  });

  it("normalises surrounding and repeated whitespace", () => {
    expect(findSchedulePreset("  0   9 * * MON  ")?.id).toBe("weekly");
  });

  it("returns undefined for a custom expression", () => {
    expect(findSchedulePreset("5 4 * * 2")).toBeUndefined();
  });

  it("returns undefined for an incomplete expression", () => {
    expect(findSchedulePreset("0 9 * *")).toBeUndefined();
  });
});
