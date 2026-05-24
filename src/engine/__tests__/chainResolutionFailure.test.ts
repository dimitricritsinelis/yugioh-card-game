import { describe, expect, it } from "vitest";
import cardsJson from "../../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../../types";
import type { CardScript } from "../cards/CardScript";
import { createCardScriptRegistry } from "../cards/registry";
import { isPlayableCard } from "../cards/coverage";
import type { ChainLink } from "../rules/chain";
import type { DuelState } from "../core/state";
import { createDuel, reduceDuel } from "../reducer";

const cards = cardsJson as CardRecord[];
const BATTLE_OX_ID = "05053103";
const AQUA_MADOOR_ID = "85639257";
const GRACEFUL_CHARITY_ID = "79571449";

describe("chain resolution failure handling", () => {
  it("fails closed for stale or malformed chain links", () => {
    const sourceState = stateWithPriority([BATTLE_OX_ID]);
    const state: DuelState = {
      ...sourceState,
      chain: [
        {
          id: "chain-bad",
          playerId: "P1",
          sourceInstanceId: "",
          cardId: "",
          effectId: "",
          spellSpeed: 1,
        } as ChainLink,
      ],
    };
    const result = reduceDuel(state, { type: "resolve-chain", playerId: "P1" });

    expect(result.events[0]).toMatchObject({
      type: "illegal-action",
      reason: "Malformed chain link chain-bad cannot be resolved.",
    });
    expect(result.state.chain).toEqual(state.chain);
  });

  it("fails closed when a chain link references a missing script", () => {
    const sourceState = stateWithPriority([GRACEFUL_CHARITY_ID], { allowUnsupportedCards: true });
    const source = requireHandCard(sourceState, "P1", GRACEFUL_CHARITY_ID);
    const state: DuelState = {
      ...sourceState,
      chain: [chainLink(source.instanceId, GRACEFUL_CHARITY_ID, "missing-effect")],
    };
    const result = reduceDuel(state, { type: "resolve-chain", playerId: "P1" });

    expect(result.events[0]).toMatchObject({
      type: "effect-not-implemented",
      cardId: GRACEFUL_CHARITY_ID,
      instanceId: source.instanceId,
    });
    expect(result.errors[0]).toMatchObject({
      code: "unsupported-card",
      commandType: "resolve-chain",
      cardId: GRACEFUL_CHARITY_ID,
    });
    expect(result.state.chain).toEqual(state.chain);
  });

  it("fails closed when an implemented chain effect has no resolution", () => {
    const stateWithScript = stateWithScripts([
      {
        cardId: BATTLE_OX_ID,
        effects: [
          {
            id: "missing-resolution",
            kind: "quick",
            implemented: true,
            spellSpeed: 2,
          },
        ],
      },
    ]);
    const source = requireHandCard(stateWithScript, "P1", BATTLE_OX_ID);
    const state: DuelState = {
      ...stateWithScript,
      chain: [chainLink(source.instanceId, BATTLE_OX_ID, "missing-resolution", 2)],
    };
    const result = reduceDuel(state, { type: "resolve-chain", playerId: "P1" });

    expect(result.events[0]).toMatchObject({
      type: "effect-not-implemented",
      cardId: BATTLE_OX_ID,
      instanceId: source.instanceId,
    });
    expect(result.events[0].message).toContain("has no implemented resolution");
    expect(result.state.chain).toEqual(state.chain);
  });

  it("handles invalid targets visibly without blocking other chain links", () => {
    const stateWithScript = stateWithScripts([
      {
        cardId: BATTLE_OX_ID,
        effects: [
          {
            id: "targeted-noop",
            kind: "quick",
            implemented: true,
            spellSpeed: 2,
            targets: [
              {
                kind: "card",
                controller: "opponent",
                zones: ["monsterZone"],
                cardKinds: ["monster"],
                face: "faceUp",
                min: 1,
                max: 1,
              },
            ],
            resolution: {
              steps: [{ kind: "destroy-targets" }],
              sendSourceToGraveyard: false,
            },
          },
        ],
      },
      {
        cardId: AQUA_MADOOR_ID,
        effects: [
          {
            id: "draw-one",
            kind: "quick",
            implemented: true,
            spellSpeed: 2,
            resolution: {
              steps: [{ kind: "draw", player: "self", count: 1 }],
              sendSourceToGraveyard: false,
            },
          },
        ],
      },
    ]);
    const targetSource = requireHandCard(stateWithScript, "P1", BATTLE_OX_ID);
    const drawSource = requireHandCard(stateWithScript, "P1", AQUA_MADOOR_ID);
    const handBefore = stateWithScript.players.P1.hand.length;
    const state: DuelState = {
      ...stateWithScript,
      chain: [
        {
          ...chainLink(targetSource.instanceId, BATTLE_OX_ID, "targeted-noop", 2),
          targetSpecs: [
            {
              kind: "card",
              controller: "opponent",
              zones: ["monsterZone"],
              cardKinds: ["monster"],
              face: "faceUp",
              min: 1,
              max: 1,
            },
          ],
          selectedTargets: {
            targetRefs: [{ playerId: "P2", zone: "monsterZone", index: 0 }],
            targetPlayerIds: [],
          },
        },
        {
          ...chainLink(drawSource.instanceId, AQUA_MADOOR_ID, "draw-one", 2),
          id: "chain-2",
        },
      ],
    };
    const result = reduceDuel(state, { type: "resolve-chain", playerId: "P1" });

    expect(result.errors).toEqual([]);
    expect(result.events.map((event) => event.type)).toContain("effect-resolved-without-effect");
    expect(result.events.map((event) => event.type)).toContain("card-drawn");
    expect(result.state.players.P1.hand).toHaveLength(handBefore + 1);
    expect(result.state.chain).toEqual([]);
  });
});

function stateWithScripts(scripts: readonly CardScript[]): DuelState {
  return {
    ...stateWithPriority(scripts.map((script) => script.cardId)),
    cardScripts: createCardScriptRegistry(scripts),
  };
}

function stateWithPriority(
  priorityIds: readonly string[],
  options: { allowUnsupportedCards?: boolean } = {},
): DuelState {
  return createDuel({
    cards,
    decks: {
      P1: deckWithPriority(priorityIds),
      P2: deckWithPriority([]),
    },
    seed: "chain-resolution-failure",
    shuffleDecks: false,
    allowUnsupportedCards: options.allowUnsupportedCards,
  }).state;
}

function chainLink(
  sourceInstanceId: string,
  cardId: string,
  effectId: string,
  spellSpeed: 1 | 2 | 3 = 1,
): ChainLink {
  return {
    id: "chain-1",
    playerId: "P1",
    sourceInstanceId,
    cardId,
    effectId,
    spellSpeed,
  };
}

function deckWithPriority(priorityIds: readonly string[]) {
  const excluded = new Set(priorityIds);
  const filler = legalMainDeck(40 + excluded.size).filter((passcode) => !excluded.has(passcode));

  return {
    main: [...priorityIds, ...filler].slice(0, 40),
  };
}

function legalMainDeck(size: number): string[] {
  const passcodes = cards
    .filter(
      (card) =>
        card.legality.goat_world_pool &&
        card.legality.max_copies > 0 &&
        isPlayableCard(card.passcode, cards),
    )
    .map((card) => card.passcode);

  if (passcodes.length < size) {
    throw new Error(`Not enough legal fixture cards for ${size}-card deck.`);
  }

  return passcodes.slice(0, size);
}

function requireHandCard(state: DuelState, playerId: "P1" | "P2", cardId: string) {
  const card = state.players[playerId].hand.find((candidate) => candidate.cardId === cardId);

  if (!card) {
    throw new Error(`Expected cardId ${cardId} in ${playerId} hand.`);
  }

  return card;
}
