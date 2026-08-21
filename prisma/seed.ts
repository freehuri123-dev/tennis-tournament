import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { clubs } from "../lib/domain/club";
import {
  createSampleMatches,
  sampleGroupMemberIds,
  sampleGroups,
  sampleMembers,
  sampleTournaments
} from "../lib/domain/sample-data";
import { toDbDate, toDbScheduleFormat } from "../lib/server/repositories/tournament-repository";

loadEnv({ path: ".env.local" });
loadEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required to seed the database.");

const prisma = new PrismaClient({
  adapter: new PrismaPg(databaseUrl)
});


const queensdayMembers = [
  "전영선",
  "김은정",
  "김정희",
  "이미영",
  "김보경",
  "서지민",
  "정유리",
  "윤희순",
  "조원희",
  "이지숙",
  "이지은",
  "채명숙",
  "양오숙",
  "윤우순",
  "최햇님"
];

const playTennisMembers: Array<{
  id: string;
  name: string;
  gender: "male" | "female";
  level: string;
}> = [
  { id: "pt-m01", name: "감독진", gender: "male", level: "7" },
  { id: "pt-m02", name: "유태주", gender: "male", level: "6" },
  { id: "pt-m03", name: "김성훈", gender: "male", level: "5" },
  { id: "pt-m04", name: "김지동", gender: "male", level: "5" },
  { id: "pt-m05", name: "박준희", gender: "male", level: "4" },
  { id: "pt-m06", name: "박찬조", gender: "male", level: "4" },
  { id: "pt-m07", name: "장하현", gender: "male", level: "4" },
  { id: "pt-m08", name: "조형찬", gender: "male", level: "4" },
  { id: "pt-m09", name: "이종민", gender: "male", level: "4" },
  { id: "pt-m10", name: "백용준", gender: "male", level: "4" },
  { id: "pt-m11", name: "황왕성", gender: "male", level: "2" },
  { id: "pt-m12", name: "김대업", gender: "male", level: "4" },
  { id: "pt-m13", name: "오성주", gender: "male", level: "4" },
  { id: "pt-m14", name: "김승빈", gender: "male", level: "4" },
  { id: "pt-m15", name: "김건우", gender: "male", level: "4" },
  { id: "pt-m16", name: "정우람", gender: "male", level: "4" },
  { id: "pt-m17", name: "나우진", gender: "male", level: "4" },
  { id: "pt-m18", name: "이지숙", gender: "female", level: "3" },
  { id: "pt-m19", name: "최재필", gender: "male", level: "3" },
  { id: "pt-m20", name: "엄태천", gender: "male", level: "3" },
  { id: "pt-m21", name: "문현범", gender: "male", level: "3" },
  { id: "pt-m22", name: "라정민", gender: "male", level: "2" },
  { id: "pt-m23", name: "신경식", gender: "male", level: "3" },
  { id: "pt-m24", name: "양재명", gender: "male", level: "2" },
  { id: "pt-m25", name: "정유리", gender: "female", level: "3" },
  { id: "pt-m26", name: "이정근", gender: "male", level: "2" },
  { id: "pt-m27", name: "이대한", gender: "male", level: "3" },
  { id: "pt-m28", name: "최동렬", gender: "male", level: "2" },
  { id: "pt-m29", name: "윤진", gender: "female", level: "3" },
  { id: "pt-m30", name: "김경아", gender: "female", level: "3" },
  { id: "pt-m31", name: "유나현", gender: "female", level: "3" },
  { id: "pt-m32", name: "이화주", gender: "female", level: "1" }
];

const playTennisMatches = [
  { id: "pt-event-r1-c1", sideAPlayerIds: ["pt-m31", "pt-m10"], sideBPlayerIds: ["pt-m29", "pt-m06"] },
  { id: "pt-event-r1-c2", sideAPlayerIds: ["pt-m24", "pt-m12"], sideBPlayerIds: ["pt-m23", "pt-m17"] },
  { id: "pt-event-r1-c3", sideAPlayerIds: ["pt-m30", "pt-m21"], sideBPlayerIds: ["pt-m18", "pt-m26"] },
  { id: "pt-event-r1-c4", sideAPlayerIds: ["pt-m03", "pt-m27"], sideBPlayerIds: ["pt-m04", "pt-m22"] },
  { id: "pt-event-r2-c1", sideAPlayerIds: ["pt-m32", "pt-m01"], sideBPlayerIds: ["pt-m25", "pt-m08"] },
  { id: "pt-event-r2-c2", sideAPlayerIds: ["pt-m24", "pt-m02"], sideBPlayerIds: ["pt-m09", "pt-m12"] },
  { id: "pt-event-r2-c3", sideAPlayerIds: ["pt-m28", "pt-m10"], sideBPlayerIds: ["pt-m11", "pt-m07"] },
  { id: "pt-event-r2-c4", sideAPlayerIds: ["pt-m15", "pt-m19"], sideBPlayerIds: ["pt-m05", "pt-m13"] },
  { id: "pt-event-r3-c1", sideAPlayerIds: ["pt-m13", "pt-m15"], sideBPlayerIds: ["pt-m16", "pt-m14"] },
  { id: "pt-event-r3-c2", sideAPlayerIds: ["pt-m32", "pt-m01"], sideBPlayerIds: ["pt-m29", "pt-m07"] },
  { id: "pt-event-r3-c3", sideAPlayerIds: ["pt-m18", "pt-m27"], sideBPlayerIds: ["pt-m25", "pt-m20"] },
  { id: "pt-event-r3-c4", sideAPlayerIds: ["pt-m26", "pt-m23"], sideBPlayerIds: ["pt-m28", "pt-m22"] },
  { id: "pt-event-r4-c1", sideAPlayerIds: ["pt-m30", "pt-m04"], sideBPlayerIds: ["pt-m31", "pt-m09"] },
  { id: "pt-event-r4-c2", sideAPlayerIds: ["pt-m03", "pt-m24"], sideBPlayerIds: ["pt-m08", "pt-m06"] },
  { id: "pt-event-r4-c3", sideAPlayerIds: ["pt-m10", "pt-m11"], sideBPlayerIds: ["pt-m21", "pt-m12"] },
  { id: "pt-event-r4-c4", sideAPlayerIds: ["pt-m02", "pt-m26"], sideBPlayerIds: ["pt-m17", "pt-m19"] },
  { id: "pt-event-r5-c1", sideAPlayerIds: ["pt-m05", "pt-m07"], sideBPlayerIds: ["pt-m27", "pt-m16"] },
  { id: "pt-event-r5-c2", sideAPlayerIds: ["pt-m03", "pt-m15"], sideBPlayerIds: ["pt-m28", "pt-m01"] },
  { id: "pt-event-r5-c3", sideAPlayerIds: ["pt-m14", "pt-m22"], sideBPlayerIds: ["pt-m20", "pt-m08"] },
  { id: "pt-event-r5-c4", sideAPlayerIds: ["pt-m32", "pt-m02"], sideBPlayerIds: ["pt-m18", "pt-m13"] },
  { id: "pt-event-r6-c1", sideAPlayerIds: ["pt-m30", "pt-m05"], sideBPlayerIds: ["pt-m25", "pt-m15"] },
  { id: "pt-event-r6-c2", sideAPlayerIds: ["pt-m29", "pt-m28"], sideBPlayerIds: ["pt-m18", "pt-m22"] },
  { id: "pt-event-r6-c3", sideAPlayerIds: ["pt-m32", "pt-m23"], sideBPlayerIds: ["pt-m31", "pt-m24"] },
  { id: "pt-event-r6-c4", sideAPlayerIds: ["pt-m12", "pt-m14"], sideBPlayerIds: ["pt-m07", "pt-m27"] },
  { id: "pt-event-r7-c1", sideAPlayerIds: ["pt-m11", "pt-m01"], sideBPlayerIds: ["pt-m19", "pt-m03"] },
  { id: "pt-event-r7-c2", sideAPlayerIds: ["pt-m31", "pt-m17"], sideBPlayerIds: ["pt-m29", "pt-m16"] },
  { id: "pt-event-r7-c3", sideAPlayerIds: ["pt-m26", "pt-m06"], sideBPlayerIds: ["pt-m09", "pt-m20"] },
  { id: "pt-event-r7-c4", sideAPlayerIds: ["pt-m04", "pt-m10"], sideBPlayerIds: ["pt-m02", "pt-m21"] },
  { id: "pt-event-r8-c1", sideAPlayerIds: ["pt-m25", "pt-m19"], sideBPlayerIds: ["pt-m30", "pt-m11"] },
  { id: "pt-event-r8-c2", sideAPlayerIds: ["pt-m06", "pt-m17"], sideBPlayerIds: ["pt-m13", "pt-m14"] },
  { id: "pt-event-r8-c3", sideAPlayerIds: ["pt-m04", "pt-m20"], sideBPlayerIds: ["pt-m16", "pt-m09"] },
  { id: "pt-event-r8-c4", sideAPlayerIds: ["pt-m23", "pt-m08"], sideBPlayerIds: ["pt-m21", "pt-m05"] }
];

function scopedId(clubSlug: string, id: string) {
  return clubSlug === "stc" ? id : `${clubSlug}-${id}`;
}

async function main() {
  await prisma.match.deleteMany();
  await prisma.tournamentGroupMember.deleteMany();
  await prisma.tournamentParticipant.deleteMany();
  await prisma.tournamentGroup.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.member.deleteMany();
  await prisma.club.deleteMany();

  for (const seedClub of clubs) {
    const club = await prisma.club.create({
      data: {
        id: seedClub.slug === "pt" ? "pt" : undefined,
        slug: seedClub.slug,
        name: seedClub.name,
        shortName: seedClub.shortName
      }
    });

    if (seedClub.slug === "queensday") {
      for (const [index, name] of queensdayMembers.entries()) {
        await prisma.member.create({
          data: {
            id: scopedId(seedClub.slug, `m${index + 1}`),
            clubId: club.id,
            name,
            gender: "female",
            notes: "",
            active: true,
            deleted: false
          }
        });
      }
      continue;
    }

    if (seedClub.slug === "pt") {
      for (const member of playTennisMembers) {
        await prisma.member.create({
          data: {
            ...member,
            clubId: club.id,
            notes: "",
            active: true,
            deleted: false
          }
        });
      }

      await prisma.tournament.create({
        data: {
          id: "pt-tournament-20260822",
          clubId: club.id,
          name: "제2회 임진강 나룻배",
          date: toDbDate("2026-08-22"),
          publicSlug: "2822",
          status: "active",
          type: "general",
          femaleTeamAllowed: true,
          scheduleLocked: true,
          rankingExcludedMemberIds: ["pt-m01", "pt-m02"],
          includeInClubRecords: false
        }
      });

      await prisma.tournamentGroup.create({
        data: {
          id: "pt-event-group",
          tournamentId: "pt-tournament-20260822",
          name: "전체",
          scheduleFormat: "random",
          sortOrder: 1,
          randomCourtCount: 4,
          randomGamesPerPlayer: 4
        }
      });

      for (const [index, member] of playTennisMembers.entries()) {
        await prisma.tournamentParticipant.create({
          data: {
            id: `pt-event-participant-m${String(index + 1).padStart(2, "0")}`,
            tournamentId: "pt-tournament-20260822",
            memberId: member.id,
            sortOrder: index + 1
          }
        });
        await prisma.tournamentGroupMember.create({
          data: {
            id: `pt-event-group-member-m${String(index + 1).padStart(2, "0")}`,
            groupId: "pt-event-group",
            memberId: member.id,
            sortOrder: index + 1
          }
        });
      }

      for (const [index, match] of playTennisMatches.entries()) {
        const roundNumber = Math.floor(index / 4) + 1;
        await prisma.match.create({
          data: {
            ...match,
            tournamentId: "pt-tournament-20260822",
            groupId: "pt-event-group",
            matchNumber: index + 1,
            sideAScore: null,
            sideBScore: null,
            status: "scheduled",
            sortOrder: index + 1,
            courtNumber: String((index % 4) + 1),
            roundNumber
          }
        });
      }
      continue;
    }

    if (seedClub.seedSampleData === false) continue;

    for (const member of sampleMembers) {
      await prisma.member.create({
        data: {
          id: scopedId(seedClub.slug, member.id),
          clubId: club.id,
          name: member.name,
          gender: member.gender,
          level: member.level,
          notes: member.notes,
          phone: member.phone,
          active: member.active ?? true,
          deleted: member.deleted ?? false
        }
      });
    }

    for (const tournament of sampleTournaments) {
      await prisma.tournament.create({
        data: {
          id: scopedId(seedClub.slug, tournament.id),
          clubId: club.id,
          name: tournament.name,
          date: toDbDate(tournament.date),
          publicSlug: tournament.publicSlug,
          status: tournament.status
        }
      });
    }

    for (const group of sampleGroups) {
      const tournamentId = scopedId(seedClub.slug, group.tournamentId);
      const groupId = scopedId(seedClub.slug, group.id);

      await prisma.tournamentGroup.create({
        data: {
          id: groupId,
          tournamentId,
          name: group.name,
          scheduleFormat: toDbScheduleFormat(group.scheduleFormat),
          sortOrder: group.sortOrder,
          seedPlayerIds: (group.seedPlayerIds ?? []).map((memberId) => scopedId(seedClub.slug, memberId))
        }
      });

      const memberIds = sampleGroupMemberIds[group.id] ?? [];
      for (const [index, memberId] of memberIds.entries()) {
        const scopedMemberId = scopedId(seedClub.slug, memberId);

        await prisma.tournamentParticipant.upsert({
          where: { tournamentId_memberId: { tournamentId, memberId: scopedMemberId } },
          create: { tournamentId, memberId: scopedMemberId, sortOrder: index + 1 },
          update: {}
        });

        await prisma.tournamentGroupMember.create({
          data: { groupId, memberId: scopedMemberId, sortOrder: index + 1 }
        });
      }
    }

    for (const match of createSampleMatches()) {
      await prisma.match.create({
        data: {
          id: scopedId(seedClub.slug, match.id),
          tournamentId: scopedId(seedClub.slug, match.tournamentId),
          groupId: scopedId(seedClub.slug, match.groupId),
          matchNumber: match.matchNumber,
          sideAPlayerIds: match.sideAPlayerIds.map((memberId) => scopedId(seedClub.slug, memberId)),
          sideBPlayerIds: match.sideBPlayerIds.map((memberId) => scopedId(seedClub.slug, memberId)),
          sideAScore: match.sideAScore,
          sideBScore: match.sideBScore,
          status: match.status,
          sortOrder: match.sortOrder
        }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
