import { z } from "zod";

export const RestrictionSchema = z.enum(["Forbidden", "Limited", "Semi-Limited", "Unlimited"]);
export type Restriction = z.infer<typeof RestrictionSchema>;

export const CardRecordSchema = z.object({
  id: z.string().min(1),
  passcode: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  file_name: z.string().min(1),
  category: z.enum(["Monster", "Spell", "Trap"]),
  classifications: z.array(z.string()),
  text: z.string(),
  monster: z
    .object({
      attribute: z.string().nullable(),
      type: z.string().nullable(),
      level: z.number().int().nullable(),
      atk: z.number().int().nullable(),
      def: z.number().int().nullable()
    })
    .nullable(),
  spell_trap: z
    .object({
      icon: z.string().nullable()
    })
    .nullable(),
  legality: z.object({
    goat_world_pool: z.boolean(),
    restriction: RestrictionSchema,
    max_copies: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
  }),
  image: z.object({
    source_src: z.string().nullable(),
    resolved_url: z.string().nullable(),
    file_path: z.string().nullable(),
    file_name: z.string(),
    content_type: z.string().nullable(),
    byte_size: z.number().int().nonnegative().nullable(),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    sha256: z.string().nullable(),
    status: z.enum(["downloaded", "cached", "failed", "skipped"]),
    error: z.string().nullable()
  }),
  related_cards: z.array(z.string()),
  source: z.object({
    site: z.literal("goatworld.community"),
    card_pool_url: z.string().url(),
    detail_url: z.string().url(),
    scraped_at: z.string(),
    raw_html_cache_path: z.string().nullable()
  }),
  game: z.object({
    rarity: z.null(),
    directional_values: z
      .object({
        top: z.number(),
        right: z.number(),
        bottom: z.number(),
        left: z.number()
      })
      .nullable(),
    generated_ability: z.string().nullable()
  })
});

export type CardRecord = z.infer<typeof CardRecordSchema>;

export type FailureReport = {
  detail_scrape_failures: Array<{ url: string; error: string }>;
  parse_failures: Array<{ url: string; error: string }>;
  image_failures: Array<{ passcode: string; name: string; file_name: string; error: string }>;
  validation_failures: string[];
  validation_warnings: string[];
  unmatched_banlist_cards: string[];
};

export type Banlist = {
  restrictionsByName: Map<string, Restriction>;
  unmatched: string[];
  counts: Record<Restriction, number>;
  sourceUrl: string;
  rawNames: Record<Exclude<Restriction, "Unlimited">, string[]>;
};
