export { validateDeck } from "./deckValidation";
export type { DeckValidationOptions } from "./deckValidation";
export { cloneDuelState, clonePlayerState } from "./core/clone";
export {
  assertDuelStateInvariants,
  collectCardLocations,
  validateDuelStateInvariants,
} from "./core/invariants";
export {
  eventMessages,
  eventsForCard,
  eventsForInstance,
  eventsForPlayer,
  eventsOfType,
  hasEventType,
  latestEventOfType,
} from "./eventQueries";
export { assertReadableEventMessage } from "./events";
export {
  findCardByInstanceId,
  insertIntoZone,
  moveCard,
  removeFromZone,
  revealCard,
  setCardFace,
  updateMonsterPosition,
} from "./core/zones";
export { buildCardCatalog, getCardDefinition, requireCardDefinition } from "./data/cardCatalog";
export { normalizeCard, normalizeCardCatalog } from "./data/normalizeCard";
export { createDuel as createCoreDuel, reduceDuel } from "./reducer";
export {
  deserializeDuelState,
  ENGINE_STATE_VERSION,
  packEngineStateForStorage,
  serializeDuelState,
  unpackEngineStateFromStorage,
} from "./serialization";
export {
  closeDamageStep,
  createDamageStepState,
  isDamageStepActive,
  validateDamageStepActivation,
} from "./rules/damageStep";
export { applyStateBasedCleanup } from "./rules/stateBasedCleanup";
export {
  advanceToNextDecision,
  applyAction,
  createDuel,
  fillOpponentMonsterBoardForTesting,
  getLegalActions,
  runPassiveBoardFillerOpponentTurn,
  serializeDuel,
} from "./duel";
export { createRngState, createSeededRng, nextRandom, shuffleSeeded, shuffleWithRng } from "./random";
export {
  assignRandomPlayableDecksToDuel,
  clonePlayableDeck,
  getRandomPlayableDeckFixture,
  KAIBA_PLAYABLE_DECK_FIXTURE,
  PLAYABLE_DECK_FIXTURES,
  validatePlayableDeckFixtures,
  YUGI_PLAYABLE_DECK_FIXTURE,
} from "./testing/playableDecks";
export {
  createEmptyFrontendGameState,
  projectEngineToGameState,
  type FrontendProjectionMeta,
} from "./adapters/frontendAdapter";
export {
  findCardInstanceInPlayerView,
  findCardLocationInPlayerView,
  selectActionLog,
  selectLegalAttackTargets,
  selectLegalPlacementActions,
  selectOpponentView,
  selectPlayerView,
  selectUnavailableHandCardIds,
  type LegalAttackAction as FrontendLegalAttackAction,
  type LegalAttackTarget as FrontendLegalAttackTarget,
  type LegalPlacementAction as FrontendLegalPlacementAction,
} from "./adapters/viewSelectors";
export {
  assignRandomTestDecksToDuel,
  buildGoatTestDeck,
  getRandomGoatTestDeck,
  GOAT_TEST_DECKS,
  KAIBA_GOAT_TEST_DECK,
  validateGoatTestDeckDefinitions,
  YUGI_GOAT_TEST_DECK,
} from "./goatTestDecks";
export type { CreateCoreDuelConfig, CreateDuelResult } from "./reducer";
export type { PersistedEngineState, SerializedCoreDuelState } from "./serialization";
export type {
  CreateDuelConfig,
  ChainLink,
  DeckList,
  DeckValidationResult,
  CoreCardInstance,
  CoreCardVisibility,
  CoreDuelState,
  CoreEngineCommand,
  CoreEngineError,
  CoreEngineErrorCode,
  CoreEngineEvent,
  CoreEnginePrompt,
  CoreEngineResult,
  CoreFaceState,
  CoreInvariantResult,
  CoreInstanceId,
  CoreLocatedCard,
  CoreLocatedCardRef,
  CoreMonsterPosition,
  CorePlayerState,
  CoreRemoveFromZoneResult,
  CoreCardInZone,
  CoreTypedEngineEvent,
  CoreTypedEngineEventType,
  CoreZoneCard,
  CoreZoneCardOptions,
  CoreZoneKind,
  CoreZoneRef,
  DuelAction,
  DuelCardInstance,
  DuelEvent,
  DuelPrompt,
  DuelResult,
  DuelState,
  DuelZoneCard,
  OpponentBehavior,
  OverrideCardDestination,
  PassiveBoardFillerOptions,
  PlayerId,
  SerializedCard,
  SerializedDuelState,
} from "./types";
export type { RandomResult, RngState, ShuffleResult } from "./random";
export type {
  DamageStepEffectKind,
  DamageStepEffectPermission,
  DamageStepState,
  DamageStepSubstep,
} from "./rules/damageStep";
export type {
  BaseCardDefinition,
  CardCatalog,
  CardDefinition,
  CardDisplayData,
  CardId,
  CardImageData,
  CardKind,
  CardLegalityData,
  MonsterDefinition,
  SpellTrapDefinition,
} from "./data/cardCatalog";
export type {
  GoatTestDeckAssignment,
  GoatTestDeckDefinition,
  GoatTestDeckMetadata,
  ResolvedGoatTestDeck,
  Rng,
} from "./goatTestDecks";
