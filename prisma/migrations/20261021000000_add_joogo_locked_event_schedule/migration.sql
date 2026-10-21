ALTER TABLE "Tournament"
ADD COLUMN "nameEditableWhenLocked" BOOLEAN NOT NULL DEFAULT false;

DO $$
DECLARE
  target_tournament_id TEXT := 'cmvhm8oe5000004ju7o1awv2x';
  target_group_id TEXT := 'team-battle-cmvhm8oe5000004ju7o1awv2x';
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Tournament"
    WHERE "id" = target_tournament_id
      AND "clubId" = 'joogo'
  ) THEN
    IF (SELECT COUNT(*) FROM "TournamentParticipant" WHERE "tournamentId" = target_tournament_id) <> 33 THEN
      RAISE EXCEPTION 'Joogo event participant count must be 33 before applying the locked schedule';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM "TournamentGroup"
      WHERE "id" = target_group_id
        AND "tournamentId" = target_tournament_id
        AND "scheduleFormat" = 'team_battle'
    ) THEN
      RAISE EXCEPTION 'Joogo event team-battle group was not found';
    END IF;

    DELETE FROM "Match" WHERE "tournamentId" = target_tournament_id;

    INSERT INTO "Match" (
      "id", "tournamentId", "groupId", "matchNumber",
      "sideAPlayerIds", "sideBPlayerIds", "sideAScore", "sideBScore",
      "status", "sortOrder", "courtNumber", "roundNumber", "createdAt", "updatedAt"
    ) VALUES
      ('joogo-event-20261025-r1-c1', target_tournament_id, target_group_id, 1, ARRAY['cmr24kyrt000004l5q0nwlw9f','cmpnloea8000504jvwds9xhim']::TEXT[], ARRAY['cmpnlln4a000304k1o1d0lv4l','cmt6sjr0p006004jzkyocm79k']::TEXT[], NULL, NULL, 'scheduled', 1, '1', 1, NOW(), NOW()),
      ('joogo-event-20261025-r1-c2', target_tournament_id, target_group_id, 2, ARRAY['cmpnlkajk000004k1jepmqucz','cmpnlptr7000304lbt684sx5y']::TEXT[], ARRAY['cmpnlnqwf000404jvvv6vf3aq','cmpnlmo1b000104ibyx44i7ds']::TEXT[], NULL, NULL, 'scheduled', 2, '2', 1, NOW(), NOW()),
      ('joogo-event-20261025-r1-c3', target_tournament_id, target_group_id, 3, ARRAY['cmpnlmxbl000204jvioe8q37r','cmpnllbec000004lbfnogkych']::TEXT[], ARRAY['cmpnlljty000204k1dkqjcy6z','cmpnlkwy0000104jvnynuvz61']::TEXT[], NULL, NULL, 'scheduled', 3, '3', 1, NOW(), NOW()),
      ('joogo-event-20261025-r1-c4', target_tournament_id, target_group_id, 4, ARRAY['cmpnlls0t000204jvzm3s24ed','cmsvor4x9001004jmnbbeyubg']::TEXT[], ARRAY['cmpnlq164000304ib6gexi22u','cmpnll2zy000004jv6dyw7isw']::TEXT[], NULL, NULL, 'scheduled', 4, '4', 1, NOW(), NOW()),

      ('joogo-event-20261025-r2-c1', target_tournament_id, target_group_id, 5, ARRAY['cmpnlo383000404jvreixjko8','cmpnlojxt000604k17ckxx8y9']::TEXT[], ARRAY['cmr24l70k000004lbephoqjda','cmpnln5ef000304jvin40uvcd']::TEXT[], NULL, NULL, 'scheduled', 5, '1', 2, NOW(), NOW()),
      ('joogo-event-20261025-r2-c2', target_tournament_id, target_group_id, 6, ARRAY['cmvhmiz5w000004l6echwy97z','cmpnlmgvx000104jviaxjbsm4']::TEXT[], ARRAY['cmpnllftm000104k14ljedu1q','cmpnlklvl000004jv5rpzwox9']::TEXT[], NULL, NULL, 'scheduled', 6, '2', 2, NOW(), NOW()),
      ('joogo-event-20261025-r2-c3', target_tournament_id, target_group_id, 7, ARRAY['cmpnlkgb2000004jsxs5gw3s1','cmpnlnamv000104lba5ooq0iy']::TEXT[], ARRAY['cmpnlm18i000104jstmvrm2wp','cmvfq3l08000104l8cw6v9n6q']::TEXT[], NULL, NULL, 'scheduled', 7, '3', 2, NOW(), NOW()),
      ('joogo-event-20261025-r2-c4', target_tournament_id, target_group_id, 8, ARRAY['cmpnllbec000004lbfnogkych','cmpnlnmk7000404k12iuve1t0']::TEXT[], ARRAY['cmpnlkwy0000104jvnynuvz61','cmpnlq6mk000704k17mhusz5e']::TEXT[], NULL, NULL, 'scheduled', 8, '4', 2, NOW(), NOW()),

      ('joogo-event-20261025-r3-c1', target_tournament_id, target_group_id, 9, ARRAY['cmr24kyrt000004l5q0nwlw9f','cmpnlkajk000004k1jepmqucz']::TEXT[], ARRAY['cmpnllftm000104k14ljedu1q','cmpnlm18i000104jstmvrm2wp']::TEXT[], NULL, NULL, 'scheduled', 9, '1', 3, NOW(), NOW()),
      ('joogo-event-20261025-r3-c2', target_tournament_id, target_group_id, 10, ARRAY['cmpnloea8000504jvwds9xhim','cmpnlptr7000304lbt684sx5y']::TEXT[], ARRAY['cmpnln5ef000304jvin40uvcd','cmpnlklvl000004jv5rpzwox9']::TEXT[], NULL, NULL, 'scheduled', 10, '2', 3, NOW(), NOW()),
      ('joogo-event-20261025-r3-c3', target_tournament_id, target_group_id, 11, ARRAY['cmpnlkgb2000004jsxs5gw3s1','cmpnlls0t000204jvzm3s24ed']::TEXT[], ARRAY['cmpnlln4a000304k1o1d0lv4l','cmpnlq6mk000704k17mhusz5e']::TEXT[], NULL, NULL, 'scheduled', 11, '3', 3, NOW(), NOW()),
      ('joogo-event-20261025-r3-c4', target_tournament_id, target_group_id, 12, ARRAY['cmt33i2bn001d04kz8ybz0pfm','cmsvor4x9001004jmnbbeyubg']::TEXT[], ARRAY['cmpnlo8q3000204js68v9s0k8','cmpnll2zy000004jv6dyw7isw']::TEXT[], NULL, NULL, 'scheduled', 12, '4', 3, NOW(), NOW()),

      ('joogo-event-20261025-r4-c1', target_tournament_id, target_group_id, 13, ARRAY['cmpnlmxbl000204jvioe8q37r','cmvhmj6cx000104l6aejuuh2m']::TEXT[], ARRAY['cmt6sjr0p006004jzkyocm79k','cmr24l70k000004lbephoqjda']::TEXT[], NULL, NULL, 'scheduled', 13, '1', 4, NOW(), NOW()),
      ('joogo-event-20261025-r4-c2', target_tournament_id, target_group_id, 14, ARRAY['cmpnlo383000404jvreixjko8','cmvhmiz5w000004l6echwy97z']::TEXT[], ARRAY['cmpnlln4a000304k1o1d0lv4l','cmpnlnqwf000404jvvv6vf3aq']::TEXT[], NULL, NULL, 'scheduled', 14, '2', 4, NOW(), NOW()),
      ('joogo-event-20261025-r4-c3', target_tournament_id, target_group_id, 15, ARRAY['cmpnlojxt000604k17ckxx8y9','cmpnlnamv000104lba5ooq0iy']::TEXT[], ARRAY['cmpnlmo1b000104ibyx44i7ds','cmpnlljty000204k1dkqjcy6z']::TEXT[], NULL, NULL, 'scheduled', 15, '3', 4, NOW(), NOW()),
      ('joogo-event-20261025-r4-c4', target_tournament_id, target_group_id, 16, ARRAY['cmpnllbec000004lbfnogkych','cmpnlls0t000204jvzm3s24ed']::TEXT[], ARRAY['cmpnlq164000304ib6gexi22u','cmpnlkwy0000104jvnynuvz61']::TEXT[], NULL, NULL, 'scheduled', 16, '4', 4, NOW(), NOW()),

      ('joogo-event-20261025-r5-c1', target_tournament_id, target_group_id, 17, ARRAY['cmr24kyrt000004l5q0nwlw9f','cmpnlptr7000304lbt684sx5y']::TEXT[], ARRAY['cmpnlklvl000004jv5rpzwox9','cmvfq3l08000104l8cw6v9n6q']::TEXT[], NULL, NULL, 'scheduled', 17, '1', 5, NOW(), NOW()),
      ('joogo-event-20261025-r5-c2', target_tournament_id, target_group_id, 18, ARRAY['cmpnloea8000504jvwds9xhim','cmpnlmxbl000204jvioe8q37r']::TEXT[], ARRAY['cmr24l70k000004lbephoqjda','cmpnlm18i000104jstmvrm2wp']::TEXT[], NULL, NULL, 'scheduled', 18, '2', 5, NOW(), NOW()),
      ('joogo-event-20261025-r5-c3', target_tournament_id, target_group_id, 19, ARRAY['cmvhmiz5w000004l6echwy97z','cmt33i2bn001d04kz8ybz0pfm']::TEXT[], ARRAY['cmpnllftm000104k14ljedu1q','cmpnlq164000304ib6gexi22u']::TEXT[], NULL, NULL, 'scheduled', 19, '3', 5, NOW(), NOW()),
      ('joogo-event-20261025-r5-c4', target_tournament_id, target_group_id, 20, ARRAY['cmpnlnmk7000404k12iuve1t0','cmsvor4x9001004jmnbbeyubg']::TEXT[], ARRAY['cmpnlq6mk000704k17mhusz5e','cmpnll2zy000004jv6dyw7isw']::TEXT[], NULL, NULL, 'scheduled', 20, '4', 5, NOW(), NOW()),

      ('joogo-event-20261025-r6-c1', target_tournament_id, target_group_id, 21, ARRAY['cmpnlo383000404jvreixjko8','cmpnlmgvx000104jviaxjbsm4']::TEXT[], ARRAY['cmt6sjr0p006004jzkyocm79k','cmpnlljty000204k1dkqjcy6z']::TEXT[], NULL, NULL, 'scheduled', 21, '1', 6, NOW(), NOW()),
      ('joogo-event-20261025-r6-c2', target_tournament_id, target_group_id, 22, ARRAY['cmpnlkajk000004k1jepmqucz','cmvhmj6cx000104l6aejuuh2m']::TEXT[], ARRAY['cmpnlmo1b000104ibyx44i7ds','cmpnln5ef000304jvin40uvcd']::TEXT[], NULL, NULL, 'scheduled', 22, '2', 6, NOW(), NOW()),
      ('joogo-event-20261025-r6-c3', target_tournament_id, target_group_id, 23, ARRAY['cmpnlojxt000604k17ckxx8y9','cmpnlkgb2000004jsxs5gw3s1']::TEXT[], ARRAY['cmpnlnqwf000404jvvv6vf3aq','cmvfq3l08000104l8cw6v9n6q']::TEXT[], NULL, NULL, 'scheduled', 23, '3', 6, NOW(), NOW()),
      ('joogo-event-20261025-r6-c4', target_tournament_id, target_group_id, 24, ARRAY['cmpnllbec000004lbfnogkych','cmt33i2bn001d04kz8ybz0pfm']::TEXT[], ARRAY['cmpnlkwy0000104jvnynuvz61','cmpnlo8q3000204js68v9s0k8']::TEXT[], NULL, NULL, 'scheduled', 24, '4', 6, NOW(), NOW()),

      ('joogo-event-20261025-r7-c1', target_tournament_id, target_group_id, 25, ARRAY['cmpnloea8000504jvwds9xhim','cmpnlkajk000004k1jepmqucz']::TEXT[], ARRAY['cmpnlln4a000304k1o1d0lv4l','cmpnlmo1b000104ibyx44i7ds']::TEXT[], NULL, NULL, 'scheduled', 25, '1', 7, NOW(), NOW()),
      ('joogo-event-20261025-r7-c2', target_tournament_id, target_group_id, 26, ARRAY['cmr24kyrt000004l5q0nwlw9f','cmpnlmxbl000204jvioe8q37r']::TEXT[], ARRAY['cmpnln5ef000304jvin40uvcd','cmpnllftm000104k14ljedu1q']::TEXT[], NULL, NULL, 'scheduled', 26, '2', 7, NOW(), NOW()),
      ('joogo-event-20261025-r7-c3', target_tournament_id, target_group_id, 27, ARRAY['cmpnlptr7000304lbt684sx5y','cmpnlnmk7000404k12iuve1t0']::TEXT[], ARRAY['cmpnlm18i000104jstmvrm2wp','cmpnlo8q3000204js68v9s0k8']::TEXT[], NULL, NULL, 'scheduled', 27, '3', 7, NOW(), NOW()),
      ('joogo-event-20261025-r7-c4', target_tournament_id, target_group_id, 28, ARRAY['cmt33i2bn001d04kz8ybz0pfm','cmsvor4x9001004jmnbbeyubg']::TEXT[], ARRAY['cmpnlq164000304ib6gexi22u','cmpnll2zy000004jv6dyw7isw']::TEXT[], NULL, NULL, 'scheduled', 28, '4', 7, NOW(), NOW()),

      ('joogo-event-20261025-r8-c1', target_tournament_id, target_group_id, 29, ARRAY['cmpnlo383000404jvreixjko8','cmvhmj6cx000104l6aejuuh2m']::TEXT[], ARRAY['cmpnlklvl000004jv5rpzwox9','cmvfq3l08000104l8cw6v9n6q']::TEXT[], NULL, NULL, 'scheduled', 29, '1', 8, NOW(), NOW()),
      ('joogo-event-20261025-r8-c2', target_tournament_id, target_group_id, 30, ARRAY['cmvhmiz5w000004l6echwy97z','cmpnlnamv000104lba5ooq0iy']::TEXT[], ARRAY['cmt6sjr0p006004jzkyocm79k','cmpnlnqwf000404jvvv6vf3aq']::TEXT[], NULL, NULL, 'scheduled', 30, '2', 8, NOW(), NOW()),
      ('joogo-event-20261025-r8-c3', target_tournament_id, target_group_id, 31, ARRAY['cmpnlmgvx000104jviaxjbsm4','cmpnlkgb2000004jsxs5gw3s1']::TEXT[], ARRAY['cmpnlljty000204k1dkqjcy6z','cmr24l70k000004lbephoqjda']::TEXT[], NULL, NULL, 'scheduled', 31, '3', 8, NOW(), NOW()),
      ('joogo-event-20261025-r8-c4', target_tournament_id, target_group_id, 32, ARRAY['cmpnlls0t000204jvzm3s24ed','cmpnlnmk7000404k12iuve1t0']::TEXT[], ARRAY['cmpnlq6mk000704k17mhusz5e','cmpnlo8q3000204js68v9s0k8']::TEXT[], NULL, NULL, 'scheduled', 32, '4', 8, NOW(), NOW());

    UPDATE "Tournament"
    SET "scheduleLocked" = true,
        "nameEditableWhenLocked" = true,
        "updatedAt" = NOW()
    WHERE "id" = target_tournament_id;
  END IF;
END $$;
