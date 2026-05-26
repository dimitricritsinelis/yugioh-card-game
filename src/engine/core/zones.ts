import type { CardInstance, FaceState, MonsterPosition, ZoneCard, ZoneKind, ZoneRef } from "./cardRefs";
import { cloneDuelState } from "./clone";
import type { DuelState, PlayerState } from "./state";

export type CardInZone = CardInstance | ZoneCard;

export interface LocatedCard {
  readonly card: CardInZone;
  readonly ref: ZoneRef;
}

export interface ZoneCardOptions {
  readonly face?: FaceState;
  readonly position?: MonsterPosition | null;
  readonly visibility?: ZoneCard["visibility"];
  readonly sentToGraveyardTurn?: number;
  readonly sentToGraveyardFromController?: ZoneCard["controller"];
  readonly sentToGraveyardFromZone?: ZoneKind;
}

type ResolvedZoneCardOptions = Required<Pick<ZoneCardOptions, "face" | "position" | "visibility">> &
  Pick<ZoneCardOptions, "sentToGraveyardTurn" | "sentToGraveyardFromController" | "sentToGraveyardFromZone">;

export interface RemoveFromZoneResult {
  readonly state: DuelState;
  readonly card: CardInZone;
}

export function findCardByInstanceId(state: DuelState, instanceId: string): LocatedCard | null {
  for (const playerId of ["P1", "P2"] as const) {
    const player = state.players[playerId];

    for (const [index, card] of player.mainDeck.entries()) {
      if (card.instanceId === instanceId) {
        return { card, ref: { playerId, zone: "mainDeck", index } };
      }
    }

    for (const [index, card] of (player.fusionDeck ?? []).entries()) {
      if (card.instanceId === instanceId) {
        return { card, ref: { playerId, zone: "fusionDeck", index } };
      }
    }

    for (const [index, card] of player.hand.entries()) {
      if (card.instanceId === instanceId) {
        return { card, ref: { playerId, zone: "hand", index } };
      }
    }

    for (const [index, card] of player.monsterZones.entries()) {
      if (card?.instanceId === instanceId) {
        return { card, ref: { playerId, zone: "monsterZone", index } };
      }
    }

    for (const [index, card] of player.spellTrapZones.entries()) {
      if (card?.instanceId === instanceId) {
        return { card, ref: { playerId, zone: "spellTrapZone", index } };
      }
    }

    for (const [index, card] of player.graveyard.entries()) {
      if (card.instanceId === instanceId) {
        return { card, ref: { playerId, zone: "graveyard", index } };
      }
    }

    for (const [index, card] of player.banished.entries()) {
      if (card.instanceId === instanceId) {
        return { card, ref: { playerId, zone: "banished", index } };
      }
    }

    if (player.fieldZone?.instanceId === instanceId) {
      return { card: player.fieldZone, ref: { playerId, zone: "fieldZone" } };
    }
  }

  return null;
}

export function removeFromZone(state: DuelState, ref: ZoneRef): RemoveFromZoneResult {
  const next = cloneDuelState(state);
  const player = next.players[ref.playerId];

  switch (ref.zone) {
    case "mainDeck": {
      const card = requireArrayCard(player.mainDeck, ref.index, ref.zone);
      return {
        state: updatePlayer(next, ref.playerId, { mainDeck: removeArrayIndex(player.mainDeck, ref.index) }),
        card,
      };
    }
    case "fusionDeck": {
      const fusionDeck = player.fusionDeck ?? [];
      const card = requireArrayCard(fusionDeck, ref.index, ref.zone);
      return {
        state: updatePlayer(next, ref.playerId, { fusionDeck: removeArrayIndex(fusionDeck, ref.index) }),
        card,
      };
    }
    case "hand": {
      const card = requireArrayCard(player.hand, ref.index, ref.zone);
      return {
        state: updatePlayer(next, ref.playerId, { hand: removeArrayIndex(player.hand, ref.index) }),
        card,
      };
    }
    case "monsterZone": {
      const card = requireArrayCard(player.monsterZones, ref.index, ref.zone);
      return {
        state: updatePlayer(next, ref.playerId, { monsterZones: replaceArrayIndex(player.monsterZones, ref.index, null) }),
        card,
      };
    }
    case "spellTrapZone": {
      const card = requireArrayCard(player.spellTrapZones, ref.index, ref.zone);
      return {
        state: updatePlayer(next, ref.playerId, {
          spellTrapZones: replaceArrayIndex(player.spellTrapZones, ref.index, null),
        }),
        card,
      };
    }
    case "graveyard": {
      const card = requireArrayCard(player.graveyard, ref.index, ref.zone);
      return {
        state: updatePlayer(next, ref.playerId, { graveyard: removeArrayIndex(player.graveyard, ref.index) }),
        card,
      };
    }
    case "banished": {
      const card = requireArrayCard(player.banished, ref.index, ref.zone);
      return {
        state: updatePlayer(next, ref.playerId, { banished: removeArrayIndex(player.banished, ref.index) }),
        card,
      };
    }
    case "fieldZone": {
      if (!player.fieldZone) {
        throw new Error("Cannot remove from empty fieldZone.");
      }

      return {
        state: updatePlayer(next, ref.playerId, { fieldZone: null }),
        card: player.fieldZone,
      };
    }
  }
}

export function insertIntoZone(
  state: DuelState,
  ref: ZoneRef,
  card: CardInZone,
  options: ZoneCardOptions = {},
): DuelState {
  const next = cloneDuelState(state);
  const player = next.players[ref.playerId];

  if (isTokenCard(card) && ref.zone !== "monsterZone") {
    return next;
  }

  switch (ref.zone) {
    case "mainDeck":
      return updatePlayer(next, ref.playerId, {
        mainDeck: insertArrayIndex(player.mainDeck, ref.index, toCardInstance(card)),
      });
    case "fusionDeck":
      return updatePlayer(next, ref.playerId, {
        fusionDeck: insertArrayIndex(player.fusionDeck ?? [], ref.index, toCardInstance(card)),
      });
    case "hand":
      return updatePlayer(next, ref.playerId, {
        hand: insertArrayIndex(player.hand, ref.index, toCardInstance(card)),
      });
    case "monsterZone":
      assertEmptySlot(player.monsterZones, ref.index, ref.zone);
      return updatePlayer(next, ref.playerId, {
        monsterZones: replaceArrayIndex(player.monsterZones, ref.index, toZoneCard(card, monsterZoneDefaults(options))),
      });
    case "spellTrapZone":
      assertEmptySlot(player.spellTrapZones, ref.index, ref.zone);
      return updatePlayer(next, ref.playerId, {
        spellTrapZones: replaceArrayIndex(player.spellTrapZones, ref.index, toZoneCard(card, spellTrapZoneDefaults(options))),
      });
    case "graveyard":
      return updatePlayer(next, ref.playerId, {
        graveyard: insertArrayIndex(player.graveyard, ref.index, toZoneCard(card, publicZoneDefaults(options))),
      });
    case "banished":
      return updatePlayer(next, ref.playerId, {
        banished: insertArrayIndex(player.banished, ref.index, toZoneCard(card, publicZoneDefaults(options))),
      });
    case "fieldZone":
      if (player.fieldZone) {
        throw new Error("Cannot insert into occupied fieldZone.");
      }

      return updatePlayer(next, ref.playerId, {
        fieldZone: toZoneCard(card, publicZoneDefaults(options)),
      });
  }
}

export function moveCard(
  state: DuelState,
  source: ZoneRef,
  destination: ZoneRef,
  options: ZoneCardOptions = {},
): DuelState {
  const { state: withoutCard, card } = removeFromZone(state, source);

  return insertIntoZone(withoutCard, destination, card, options);
}

export function revealCard(state: DuelState, ref: ZoneRef): DuelState {
  return setCardFace(state, ref, "faceUp", "public");
}

export function setCardFace(
  state: DuelState,
  ref: ZoneRef,
  face: FaceState,
  visibility: ZoneCard["visibility"] = face === "faceUp" ? "public" : "hidden",
): DuelState {
  return updateZoneCard(state, ref, (card) => ({
    ...card,
    face,
    visibility,
  }));
}

export function updateMonsterPosition(state: DuelState, ref: ZoneRef, position: MonsterPosition): DuelState {
  if (ref.zone !== "monsterZone") {
    throw new Error(`Cannot update monster position in ${ref.zone}.`);
  }

  return updateZoneCard(state, ref, (card) => ({
    ...card,
    position,
  }));
}

function updateZoneCard(state: DuelState, ref: ZoneRef, updater: (card: ZoneCard) => ZoneCard): DuelState {
  const next = cloneDuelState(state);
  const player = next.players[ref.playerId];

  switch (ref.zone) {
    case "monsterZone":
      return updatePlayer(next, ref.playerId, {
        monsterZones: replaceArrayIndex(player.monsterZones, ref.index, updater(requireZoneCard(player.monsterZones, ref.index, ref.zone))),
      });
    case "spellTrapZone":
      return updatePlayer(next, ref.playerId, {
        spellTrapZones: replaceArrayIndex(
          player.spellTrapZones,
          ref.index,
          updater(requireZoneCard(player.spellTrapZones, ref.index, ref.zone)),
        ),
      });
    case "graveyard":
      return updatePlayer(next, ref.playerId, {
        graveyard: replaceArrayIndex(player.graveyard, ref.index, updater(requireZoneCard(player.graveyard, ref.index, ref.zone))),
      });
    case "banished":
      return updatePlayer(next, ref.playerId, {
        banished: replaceArrayIndex(player.banished, ref.index, updater(requireZoneCard(player.banished, ref.index, ref.zone))),
      });
    case "fieldZone":
      if (!player.fieldZone) {
        throw new Error("Cannot update empty fieldZone.");
      }

      return updatePlayer(next, ref.playerId, { fieldZone: updater(player.fieldZone) });
    case "mainDeck":
    case "fusionDeck":
    case "hand":
      throw new Error(`Cannot update face or position in ${ref.zone}.`);
  }
}

function updatePlayer(state: DuelState, playerId: keyof DuelState["players"], patch: Partial<PlayerState>): DuelState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        ...patch,
      },
    },
  };
}

function toCardInstance(card: CardInZone): CardInstance {
  return {
    instanceId: card.instanceId,
    cardId: card.cardId,
    owner: card.owner,
    controller: card.controller,
  };
}

function toZoneCard(card: CardInZone, options: ResolvedZoneCardOptions): ZoneCard {
  return {
    instanceId: card.instanceId,
    cardId: card.cardId,
    owner: card.owner,
    controller: card.controller,
    face: options.face,
    position: options.position,
    visibility: options.visibility,
    counters: "counters" in card ? { ...card.counters } : {},
    attachments: "attachments" in card ? [...card.attachments] : [],
    ...("attachmentBehaviors" in card && card.attachmentBehaviors
      ? { attachmentBehaviors: { ...card.attachmentBehaviors } }
      : {}),
    ...("effectMarkers" in card && card.effectMarkers ? { effectMarkers: [...card.effectMarkers] } : {}),
    ...(options.sentToGraveyardTurn !== undefined
      ? {
          sentToGraveyardTurn: options.sentToGraveyardTurn,
          sentToGraveyardFromController: options.sentToGraveyardFromController,
          sentToGraveyardFromZone: options.sentToGraveyardFromZone,
        }
      : {}),
    ...("token" in card && card.token ? { token: { ...card.token } } : {}),
  };
}

function isTokenCard(card: CardInZone): boolean {
  return "token" in card && card.token !== undefined;
}

function monsterZoneDefaults(options: ZoneCardOptions): ResolvedZoneCardOptions {
  return {
    face: options.face ?? "faceUp",
    position: options.position ?? "attack",
    visibility: options.visibility ?? "public",
    sentToGraveyardTurn: options.sentToGraveyardTurn,
    sentToGraveyardFromController: options.sentToGraveyardFromController,
    sentToGraveyardFromZone: options.sentToGraveyardFromZone,
  };
}

function spellTrapZoneDefaults(options: ZoneCardOptions): ResolvedZoneCardOptions {
  return {
    face: options.face ?? "faceDown",
    position: options.position ?? null,
    visibility: options.visibility ?? "hidden",
    sentToGraveyardTurn: options.sentToGraveyardTurn,
    sentToGraveyardFromController: options.sentToGraveyardFromController,
    sentToGraveyardFromZone: options.sentToGraveyardFromZone,
  };
}

function publicZoneDefaults(options: ZoneCardOptions): ResolvedZoneCardOptions {
  return {
    face: options.face ?? "faceUp",
    position: options.position ?? null,
    visibility: options.visibility ?? "public",
    sentToGraveyardTurn: options.sentToGraveyardTurn,
    sentToGraveyardFromController: options.sentToGraveyardFromController,
    sentToGraveyardFromZone: options.sentToGraveyardFromZone,
  };
}

function requireArrayCard<T>(cards: readonly (T | null)[], index: number, zone: string): T {
  const card = cards[index];

  if (!card) {
    throw new Error(`No card at ${zone}[${index}].`);
  }

  return card;
}

function requireZoneCard(cards: readonly (ZoneCard | null)[], index: number, zone: string): ZoneCard {
  return requireArrayCard(cards, index, zone);
}

function assertEmptySlot(cards: readonly (unknown | null)[], index: number, zone: string): void {
  if (index < 0 || index >= cards.length) {
    throw new Error(`${zone}[${index}] is outside zone bounds.`);
  }

  if (cards[index]) {
    throw new Error(`${zone}[${index}] is occupied.`);
  }
}

function insertArrayIndex<T>(cards: readonly T[], index: number, card: T): readonly T[] {
  if (index < 0 || index > cards.length) {
    throw new Error(`Insert index ${index} is outside zone bounds.`);
  }

  return [...cards.slice(0, index), card, ...cards.slice(index)];
}

function removeArrayIndex<T>(cards: readonly T[], index: number): readonly T[] {
  if (index < 0 || index >= cards.length) {
    throw new Error(`Remove index ${index} is outside zone bounds.`);
  }

  return [...cards.slice(0, index), ...cards.slice(index + 1)];
}

function replaceArrayIndex<T>(cards: readonly T[], index: number, card: T): readonly T[] {
  if (index < 0 || index >= cards.length) {
    throw new Error(`Replace index ${index} is outside zone bounds.`);
  }

  return cards.map((current, currentIndex) => (currentIndex === index ? card : current));
}
