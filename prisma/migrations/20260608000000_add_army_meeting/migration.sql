INSERT INTO "Club" ("id", "slug", "name", "shortName", "createdAt", "updatedAt")
VALUES ('club-army', 'army', '천하제일1사단', '천하제일1사단', NOW(), NOW())
ON CONFLICT ("slug") DO UPDATE
SET "name" = EXCLUDED."name",
    "shortName" = EXCLUDED."shortName",
    "updatedAt" = NOW();
