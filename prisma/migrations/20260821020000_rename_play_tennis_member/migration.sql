UPDATE "Member"
SET "name" = '유나현',
    "updatedAt" = NOW()
WHERE "id" = 'pt-m31'
  AND "clubId" = 'pt'
  AND "name" = '이나현';