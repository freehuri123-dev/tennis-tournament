ALTER TABLE "TournamentGroup" ADD COLUMN "randomCourtCount" INTEGER;
ALTER TABLE "TournamentGroup" ADD COLUMN "randomGamesPerPlayer" INTEGER;

INSERT INTO "Club" ("id", "slug", "name", "shortName", "createdAt", "updatedAt")
VALUES ('club-queensday', 'queensday', '퀸즈데이', '퀸즈데이', NOW(), NOW())
ON CONFLICT ("slug") DO UPDATE
SET "name" = EXCLUDED."name",
    "shortName" = EXCLUDED."shortName",
    "updatedAt" = NOW();

INSERT INTO "Member" ("id", "clubId", "name", "gender", "notes", "active", "deleted", "createdAt", "updatedAt")
VALUES
('queensday-m1', (SELECT "id" FROM "Club" WHERE "slug" = 'queensday'), '전영선', 'female', '', true, false, NOW(), NOW()),
('queensday-m2', (SELECT "id" FROM "Club" WHERE "slug" = 'queensday'), '김은정', 'female', '', true, false, NOW(), NOW()),
('queensday-m3', (SELECT "id" FROM "Club" WHERE "slug" = 'queensday'), '김정희', 'female', '', true, false, NOW(), NOW()),
('queensday-m4', (SELECT "id" FROM "Club" WHERE "slug" = 'queensday'), '이미영', 'female', '', true, false, NOW(), NOW()),
('queensday-m5', (SELECT "id" FROM "Club" WHERE "slug" = 'queensday'), '김보경', 'female', '', true, false, NOW(), NOW()),
('queensday-m6', (SELECT "id" FROM "Club" WHERE "slug" = 'queensday'), '서지민', 'female', '', true, false, NOW(), NOW()),
('queensday-m7', (SELECT "id" FROM "Club" WHERE "slug" = 'queensday'), '정유리', 'female', '', true, false, NOW(), NOW()),
('queensday-m8', (SELECT "id" FROM "Club" WHERE "slug" = 'queensday'), '윤희순', 'female', '', true, false, NOW(), NOW()),
('queensday-m9', (SELECT "id" FROM "Club" WHERE "slug" = 'queensday'), '조원희', 'female', '', true, false, NOW(), NOW()),
('queensday-m10', (SELECT "id" FROM "Club" WHERE "slug" = 'queensday'), '이지숙', 'female', '', true, false, NOW(), NOW()),
('queensday-m11', (SELECT "id" FROM "Club" WHERE "slug" = 'queensday'), '이지은', 'female', '', true, false, NOW(), NOW()),
('queensday-m12', (SELECT "id" FROM "Club" WHERE "slug" = 'queensday'), '채명숙', 'female', '', true, false, NOW(), NOW()),
('queensday-m13', (SELECT "id" FROM "Club" WHERE "slug" = 'queensday'), '양오숙', 'female', '', true, false, NOW(), NOW()),
('queensday-m14', (SELECT "id" FROM "Club" WHERE "slug" = 'queensday'), '윤우순', 'female', '', true, false, NOW(), NOW()),
('queensday-m15', (SELECT "id" FROM "Club" WHERE "slug" = 'queensday'), '최햇님', 'female', '', true, false, NOW(), NOW())
ON CONFLICT ("id") DO UPDATE
SET "name" = EXCLUDED."name",
    "gender" = EXCLUDED."gender",
    "notes" = EXCLUDED."notes",
    "active" = EXCLUDED."active",
    "deleted" = EXCLUDED."deleted",
    "updatedAt" = NOW();
