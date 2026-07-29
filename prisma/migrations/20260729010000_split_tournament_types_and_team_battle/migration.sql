CREATE TYPE "TournamentType" AS ENUM ('general', 'team_battle', 'tournament');
CREATE TYPE "TeamSide" AS ENUM ('blue', 'white');
ALTER TYPE "ScheduleFormat" ADD VALUE 'team_battle';
ALTER TABLE "Tournament" ADD COLUMN "type" "TournamentType" NOT NULL DEFAULT 'general';
ALTER TABLE "TournamentParticipant" ADD COLUMN "teamSide" "TeamSide";
UPDATE "Tournament" AS tournament
SET "type" = 'tournament'
WHERE EXISTS (
  SELECT 1
  FROM "TournamentGroup" AS tournament_group
  WHERE tournament_group."tournamentId" = tournament.id
    AND tournament_group."scheduleFormat" IN ('fixed_pair_tournament', 'single_tournament')
);