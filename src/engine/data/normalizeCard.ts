import type { CardRecord } from "../../types";
import type {
  BaseCardDefinition,
  CardDefinition,
  CardKind,
  MonsterDefinition,
  SpellTrapDefinition,
} from "./cardCatalog";
import { buildCardCatalog, type CardCatalog } from "./cardCatalog";

export function normalizeCard(rawCard: CardRecord): CardDefinition {
  const kind = normalizeCardKind(rawCard);
  const imageFileName = rawCard.image?.file_name ?? rawCard.file_name;
  const base: BaseCardDefinition = Object.freeze({
    cardId: rawCard.passcode,
    passcode: rawCard.passcode,
    kind,
    classifications: Object.freeze([...rawCard.classifications]),
    display: Object.freeze({
      name: rawCard.name,
      slug: rawCard.slug,
      text: rawCard.text,
      imageFileName,
    }),
    image: Object.freeze({
      fileName: imageFileName,
      width: rawCard.image?.width ?? null,
      height: rawCard.image?.height ?? null,
    }),
    legality: Object.freeze({
      goatWorldPool: rawCard.legality.goat_world_pool,
      restriction: rawCard.legality.restriction,
      maxCopies: rawCard.legality.max_copies,
    }),
  });

  if (kind === "monster") {
    if (!rawCard.monster) {
      throw new Error(`Monster card is missing monster stats: ${rawCard.passcode}`);
    }

    return Object.freeze({
      ...base,
      kind,
      monster: Object.freeze({
        attribute: rawCard.monster.attribute,
        type: rawCard.monster.type,
        level: rawCard.monster.level,
        atk: rawCard.monster.atk,
        def: rawCard.monster.def,
      }),
    } satisfies MonsterDefinition);
  }

  return Object.freeze({
    ...base,
    kind,
    spellTrap: Object.freeze({
      icon: rawCard.spell_trap?.icon ?? null,
    }),
  } satisfies SpellTrapDefinition);
}

export function normalizeCardCatalog(rawCards: readonly CardRecord[]): CardCatalog {
  return buildCardCatalog(rawCards.map(normalizeCard));
}

function normalizeCardKind(rawCard: CardRecord): CardKind {
  switch (rawCard.category) {
    case "Monster":
      return "monster";
    case "Spell":
      return "spell";
    case "Trap":
      return "trap";
  }
}
