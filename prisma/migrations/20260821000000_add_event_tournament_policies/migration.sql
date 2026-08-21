ALTER TABLE "Tournament" ADD COLUMN "scheduleLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tournament" ADD COLUMN "rankingExcludedMemberIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Tournament" ADD COLUMN "includeInClubRecords" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Match" ADD COLUMN "roundNumber" INTEGER;
