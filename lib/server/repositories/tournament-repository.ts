import type { ScheduleFormat } from "@prisma/client";
import type { TournamentGroup } from "@/lib/domain/types";

export function toDbScheduleFormat(value: TournamentGroup["scheduleFormat"]): ScheduleFormat {
  if (value === "hanul-aa") return "hanul_aa";
  if (value === "kdk-v2010") return "kdk_v2010";
  return "random";
}

export function fromDbScheduleFormat(value: ScheduleFormat): TournamentGroup["scheduleFormat"] {
  if (value === "hanul_aa") return "hanul-aa";
  if (value === "kdk_v2010") return "kdk-v2010";
  return "random";
}

export function toDomainDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function toDbDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
