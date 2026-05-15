import type { ScheduleFormat } from "@prisma/client";
import type { TournamentGroup } from "@/lib/domain/types";

function assertNever(value: never): never {
  throw new Error(`Unexpected schedule format: ${value}`);
}

export function toDbScheduleFormat(value: TournamentGroup["scheduleFormat"]): ScheduleFormat {
  switch (value) {
    case "hanul-aa":
      return "hanul_aa";
    case "kdk-v2010":
      return "kdk_v2010";
    case "random":
      return "random";
    default:
      return assertNever(value);
  }
}

export function fromDbScheduleFormat(value: ScheduleFormat): TournamentGroup["scheduleFormat"] {
  switch (value) {
    case "hanul_aa":
      return "hanul-aa";
    case "kdk_v2010":
      return "kdk-v2010";
    case "random":
      return "random";
    default:
      return assertNever(value);
  }
}

export function toDomainDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function toDbDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
