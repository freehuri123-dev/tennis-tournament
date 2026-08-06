import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

const optionalIdSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional()
);

export const clubSlugSchema = z.enum(["stc", "otc", "joogo", "army", "queensday"]);

export const memberInputSchema = z.object({
  id: optionalIdSchema,
  clubSlug: clubSlugSchema,
  name: z.string().trim().min(1),
  gender: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.enum(["male", "female"]).optional()
  ),
  level: optionalTrimmedString,
  phone: optionalTrimmedString,
  notes: z.string().trim().default(""),
  active: z.boolean().default(true)
});

export const tournamentInputSchema = z.object({
  id: optionalIdSchema,
  clubSlug: clubSlugSchema,
  name: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  publicSlug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/),
  type: z.enum(["general", "team-battle", "tournament"]).default("general")
});

export const scheduleFormatSchema = z.enum(["hanul-aa", "kdk-v2010", "random", "fixed-pair-league", "fixed-pair-tournament", "single-tournament", "team-battle"]);

export const matchScoreInputSchema = z.object({
  matchId: z.string().trim().min(1),
  sideAScore: z.number().int().min(0).max(99).nullable(),
  sideBScore: z.number().int().min(0).max(99).nullable()
});
export const tournamentMatchStatesInputSchema = z.object({
  publicSlug: z.string().trim().min(1),
  matches: z.array(z.object({
    matchId: z.string().trim().min(1),
    sideAPlayerIds: z.array(z.string().trim().min(1)).max(2),
    sideBPlayerIds: z.array(z.string().trim().min(1)).max(2),
    sideAScore: z.number().int().min(0).max(99).nullable(),
    sideBScore: z.number().int().min(0).max(99).nullable(),
    status: z.enum(["scheduled", "completed"])
  })).min(1).max(32)
});
