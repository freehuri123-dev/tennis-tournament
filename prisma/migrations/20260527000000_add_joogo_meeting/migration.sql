INSERT INTO "Club" ("id", "slug", "name", "shortName", "createdAt", "updatedAt")
VALUES ('club-joogo', 'joogo', '주고받고', '주고받고', NOW(), NOW())
ON CONFLICT ("slug") DO UPDATE
SET "name" = EXCLUDED."name",
    "shortName" = EXCLUDED."shortName",
    "updatedAt" = NOW();
