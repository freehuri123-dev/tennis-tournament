import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "prisma",
  "migrations",
  "20260821010000_add_play_tennis_event",
  "migration.sql"
);

const approvedRoster = [
  ["pt-m01", "감독진", "male", "7"],
  ["pt-m02", "유태주", "male", "6"],
  ["pt-m03", "김성훈", "male", "5"],
  ["pt-m04", "김지동", "male", "5"],
  ["pt-m05", "박준희", "male", "4"],
  ["pt-m06", "박찬조", "male", "4"],
  ["pt-m07", "장하현", "male", "4"],
  ["pt-m08", "조형찬", "male", "4"],
  ["pt-m09", "이종민", "male", "4"],
  ["pt-m10", "백용준", "male", "4"],
  ["pt-m11", "황왕성", "male", "2"],
  ["pt-m12", "김대업", "male", "4"],
  ["pt-m13", "오성주", "male", "4"],
  ["pt-m14", "김승빈", "male", "4"],
  ["pt-m15", "김건우", "male", "4"],
  ["pt-m16", "정우람", "male", "4"],
  ["pt-m17", "나우진", "male", "4"],
  ["pt-m18", "이지숙", "female", "3"],
  ["pt-m19", "최재필", "male", "3"],
  ["pt-m20", "엄태천", "male", "3"],
  ["pt-m21", "문현범", "male", "3"],
  ["pt-m22", "라정민", "male", "2"],
  ["pt-m23", "신경식", "male", "3"],
  ["pt-m24", "양재명", "male", "2"],
  ["pt-m25", "정유리", "female", "3"],
  ["pt-m26", "이정근", "male", "2"],
  ["pt-m27", "이대한", "male", "3"],
  ["pt-m28", "최동렬", "male", "2"],
  ["pt-m29", "윤진", "female", "3"],
  ["pt-m30", "김경아", "female", "3"],
  ["pt-m31", "이나현", "female", "3"],
  ["pt-m32", "이화주", "female", "1"]
] as const;

const approvedPairings = [
  ["pt-event-r1-c1", ["pt-m31", "pt-m10"], ["pt-m29", "pt-m06"]],
  ["pt-event-r1-c2", ["pt-m24", "pt-m12"], ["pt-m23", "pt-m17"]],
  ["pt-event-r1-c3", ["pt-m30", "pt-m21"], ["pt-m18", "pt-m26"]],
  ["pt-event-r1-c4", ["pt-m03", "pt-m27"], ["pt-m04", "pt-m22"]],
  ["pt-event-r2-c1", ["pt-m32", "pt-m01"], ["pt-m25", "pt-m08"]],
  ["pt-event-r2-c2", ["pt-m24", "pt-m02"], ["pt-m09", "pt-m12"]],
  ["pt-event-r2-c3", ["pt-m28", "pt-m10"], ["pt-m11", "pt-m07"]],
  ["pt-event-r2-c4", ["pt-m15", "pt-m19"], ["pt-m05", "pt-m13"]],
  ["pt-event-r3-c1", ["pt-m13", "pt-m15"], ["pt-m16", "pt-m14"]],
  ["pt-event-r3-c2", ["pt-m32", "pt-m01"], ["pt-m29", "pt-m07"]],
  ["pt-event-r3-c3", ["pt-m18", "pt-m27"], ["pt-m25", "pt-m20"]],
  ["pt-event-r3-c4", ["pt-m26", "pt-m23"], ["pt-m28", "pt-m22"]],
  ["pt-event-r4-c1", ["pt-m30", "pt-m04"], ["pt-m31", "pt-m09"]],
  ["pt-event-r4-c2", ["pt-m03", "pt-m24"], ["pt-m08", "pt-m06"]],
  ["pt-event-r4-c3", ["pt-m10", "pt-m11"], ["pt-m21", "pt-m12"]],
  ["pt-event-r4-c4", ["pt-m02", "pt-m26"], ["pt-m17", "pt-m19"]],
  ["pt-event-r5-c1", ["pt-m05", "pt-m07"], ["pt-m27", "pt-m16"]],
  ["pt-event-r5-c2", ["pt-m03", "pt-m15"], ["pt-m28", "pt-m01"]],
  ["pt-event-r5-c3", ["pt-m14", "pt-m22"], ["pt-m20", "pt-m08"]],
  ["pt-event-r5-c4", ["pt-m32", "pt-m02"], ["pt-m18", "pt-m13"]],
  ["pt-event-r6-c1", ["pt-m30", "pt-m05"], ["pt-m25", "pt-m15"]],
  ["pt-event-r6-c2", ["pt-m29", "pt-m28"], ["pt-m18", "pt-m22"]],
  ["pt-event-r6-c3", ["pt-m32", "pt-m23"], ["pt-m31", "pt-m24"]],
  ["pt-event-r6-c4", ["pt-m12", "pt-m14"], ["pt-m07", "pt-m27"]],
  ["pt-event-r7-c1", ["pt-m11", "pt-m01"], ["pt-m19", "pt-m03"]],
  ["pt-event-r7-c2", ["pt-m31", "pt-m17"], ["pt-m29", "pt-m16"]],
  ["pt-event-r7-c3", ["pt-m26", "pt-m06"], ["pt-m09", "pt-m20"]],
  ["pt-event-r7-c4", ["pt-m04", "pt-m10"], ["pt-m02", "pt-m21"]],
  ["pt-event-r8-c1", ["pt-m25", "pt-m19"], ["pt-m30", "pt-m11"]],
  ["pt-event-r8-c2", ["pt-m06", "pt-m17"], ["pt-m13", "pt-m14"]],
  ["pt-event-r8-c3", ["pt-m04", "pt-m20"], ["pt-m16", "pt-m09"]],
  ["pt-event-r8-c4", ["pt-m23", "pt-m08"], ["pt-m21", "pt-m05"]]
] as const;

function migrationSql() {
  return readFileSync(migrationPath, "utf8");
}

function insertRows(sql: string, table: string) {
  const block = sql.match(new RegExp(`INSERT INTO "${table}"[\\s\\S]*?VALUES\\s*([\\s\\S]*?)\\s*ON CONFLICT`));
  expect(block, `missing conflict-safe ${table} insert`).not.toBeNull();
  return block![1]
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/,$/, ""))
    .filter((line) => line.startsWith("("));
}

describe("Play Tennis event migration", () => {
  it("contains the exact approved roster and conflict-safe membership data", () => {
    const sql = migrationSql();
    const roster = insertRows(sql, "Member").map((row) => {
      const values = row.match(/^\('(pt-m\d{2})', 'pt', '([^']+)', '(male|female)', '(\d+)'/);
      expect(values, `invalid member row: ${row}`).not.toBeNull();
      return values!.slice(1);
    });

    expect(roster).toEqual(approvedRoster);
    expect(insertRows(sql, "Club")).toHaveLength(1);
    expect(insertRows(sql, "Tournament")).toHaveLength(1);
    expect(insertRows(sql, "TournamentGroup")).toHaveLength(1);
    expect(insertRows(sql, "TournamentParticipant")).toHaveLength(32);
    expect(insertRows(sql, "TournamentGroupMember")).toHaveLength(32);
    expect(sql).not.toMatch(/\b(?:DELETE|TRUNCATE)\b/i);
  });

  it("sets the approved tournament identity and policies", () => {
    const sql = migrationSql();

    expect(sql).toContain("'pt-tournament-20260822'");
    expect(sql).toContain("'pt-event-group'");
    expect(sql).toContain("'제2회 임진강 나룻배'");
    expect(sql).toContain("DATE '2026-08-22'");
    expect(sql).toContain("'2822'");
    expect(sql).toContain("ARRAY['pt-m01','pt-m02']::TEXT[]");
    expect(sql).toMatch(/'2822',\s*'active',\s*'general',\s*true,\s*true,\s*ARRAY\['pt-m01','pt-m02'\]::TEXT\[\],\s*false/);
  });

  it("contains all 32 approved matches with four appearances per player", () => {
    const sql = migrationSql();
    const rows = insertRows(sql, "Match");
    const appearances = new Map<string, number>();
    const actualPairings = rows.map((row, index) => {
      const values = row.match(
        /^\('(pt-event-r(\d)-c(\d))', 'pt-tournament-20260822', 'pt-event-group', (\d+), ARRAY\['(pt-m\d{2})','(pt-m\d{2})'\]::TEXT\[\], ARRAY\['(pt-m\d{2})','(pt-m\d{2})'\]::TEXT\[\], NULL, NULL, 'scheduled', (\d+), '(\d)', (\d), NOW\(\), NOW\(\)\)$/
      );
      expect(values, `invalid match row: ${row}`).not.toBeNull();

      const [, id, roundText, courtText, matchNumberText, a1, a2, b1, b2, sortOrderText, storedCourt, storedRound] = values!;
      const players = [a1, a2, b1, b2];
      expect(new Set(players).size, `${id} must contain four unique players`).toBe(4);
      expect(Number(roundText)).toBe(Math.floor(index / 4) + 1);
      expect(Number(courtText)).toBe((index % 4) + 1);
      expect(Number(matchNumberText)).toBe(index + 1);
      expect(Number(sortOrderText)).toBe(index + 1);
      expect(storedCourt).toBe(courtText);
      expect(storedRound).toBe(roundText);
      players.forEach((memberId) => appearances.set(memberId, (appearances.get(memberId) ?? 0) + 1));

      return [id, [a1, a2], [b1, b2]];
    });

    expect(rows).toHaveLength(32);
    expect(actualPairings).toEqual(approvedPairings);
    expect([...appearances.entries()].sort()).toEqual(
      approvedRoster.map(([memberId]) => [memberId, 4] as const).sort()
    );
  });
});
