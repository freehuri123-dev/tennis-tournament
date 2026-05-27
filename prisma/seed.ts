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
        slug: seedClub.slug,
        name: seedClub.name,
        shortName: seedClub.shortName
      }
    });

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
