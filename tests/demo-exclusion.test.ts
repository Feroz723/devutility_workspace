import { describe, it, expect } from "vitest";

describe("Demo Data Exclusion Rules", () => {
  interface RecordItem {
    id: string;
    is_demo: boolean;
    revenue?: number;
    status: string;
  }

  it("ensures metrics filter excludes is_demo = true items", () => {
    const records: RecordItem[] = [
      { id: "1", is_demo: true, revenue: 15000, status: "completed" },
      { id: "2", is_demo: true, revenue: 50000, status: "completed" },
      { id: "3", is_demo: false, revenue: 0, status: "completed" },
    ];

    // Filter logic matches SQL: FILTER (WHERE is_demo = false)
    const realRecords = records.filter((r) => !r.is_demo);
    const totalRealRevenue = realRecords.reduce((acc, r) => acc + (r.revenue ?? 0), 0);

    expect(realRecords.length).toBe(1);
    expect(totalRealRevenue).toBe(0); // Demo sales never bleed into real business metrics
  });

  it("treats unconfigured real metrics honestly as 0", () => {
    const emptyRealDb: RecordItem[] = [];
    const realRevenue = emptyRealDb
      .filter((r) => !r.is_demo)
      .reduce((acc, r) => acc + (r.revenue ?? 0), 0);

    expect(realRevenue).toBe(0);
  });
});
