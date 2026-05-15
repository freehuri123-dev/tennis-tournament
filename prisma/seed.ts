import { PrismaClient } from "@prisma/client";
import { clubs } from "../lib/domain/club";
import {
  createSampleMatches,
  sampleGroupMemberIds,
  sampleGroups,
  sampleMembers,
  sampleTournaments
} from "../lib/domain/sample-data";
import { toDbDate, toDbScheduleFormat } from "../lib/server/repositories/tournament-repository";

const prisma = new PrismaClient();

async function main() {
  await prisma.match.deleteMany();
  await prisma.tournamentGroupMember.deleteMany();
  await prisma.tournamentParticipant.deleteMany();
  await prisma.tournamentGroup.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.member.deleteMany();
  await prisma.club.deleteMany();

  const seedClub = clubs[0];
  const club = await prisma.club.create({
    data: {
      slug: seedClub.slug,
      name: seedClub.name,
      shortName: seedClub.shortName
    }
  });

  for (const member of sampleMembers) {
    await prisma.member.create({
      data: {
        id: member.id,
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
        id: tournament.id,
        clubId: club.id,
        name: tournament.name,
        date: toDbDate(tournament.date),
        publicSlug: tournament.publicSlug,
        status: tournament.status
      }
    });
  }

  for (const group of sampleGroups) {
    await prisma.tournamentGroup.create({
      data: {
        id: group.id,
        tournamentId: group.tournamentId,
        name: group.name,
        scheduleFormat: toDbScheduleFormat(group.scheduleFormat),
        sortOrder: group.sortOrder,
        seedPlayerIds: group.seedPlayerIds ?? []
      }
    });

    const memberIds = sampleGroupMemberIds[group.id] ?? [];
    for (const [index, memberId] of memberIds.entries()) {
      await prisma.tournamentParticipant.upsert({
        where: { tournamentId_memberId: { tournamentId: group.tournamentId, memberId } },
        create: { tournamentId: group.tournamentId, memberId, sortOrder: index + 1 },
        update: {}
      });

      await prisma.tournamentGroupMember.create({
        data: { groupId: group.id, memberId, sortOrder: index + 1 }
      });
    }
  }

  for (const match of createSampleMatches()) {
    await prisma.match.create({
      data: {
        id: match.id,
        tournamentId: match.tournamentId,
        groupId: match.groupId,
        matchNumber: match.matchNumber,
        sideAPlayerIds: match.sideAPlayerIds,
        sideBPlayerIds: match.sideBPlayerIds,
        sideAScore: match.sideAScore,
        sideBScore: match.sideBScore,
        status: match.status,
        sortOrder: match.sortOrder
      }
    });
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
