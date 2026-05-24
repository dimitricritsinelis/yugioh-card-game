export { validateDeck } from "./deckValidation";
export type { DeckValidationOptions } from "./deckValidation";
export {
  getCardCoverage,
  getCoverageRejectionReason,
  isPlayableCard,
  isPlayableCardRecord,
  isPlayableCoverageStatus,
} from "./cards/coverage";
export {
  CARD_SCRIPTS,
  createCardScriptRegistry,
  ENGINE_CARD_COVERAGE,
  getCardScript,
  hasCardScript,
} from "./cards/registry";
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
export { deserializeDuelState, serializeDuelState } from "./serialization";
export {
  createChainResolvedPriorityWindow,
  createPriorityWindow,
  passPriority,
  PASS_PRIORITY,
  validatePriorityPass,
} from "./rules/priority";
export {
  addChainLink,
  createChainLink,
  resolveChainLifo,
} from "./rules/chain";
export { validateSpellSpeedForChain } from "./rules/spellSpeed";
export {
  closeDamageStep,
  createDamageStepState,
  isDamageStepActive,
  validateDamageStepActivation,
} from "./rules/damageStep";
export {
  collectContinuousSources,
  deriveBattleStats,
  isSourceOnField,
  validateContinuousActivationRestrictions,
  validateContinuousAttackRestrictions,
} from "./effects/continuous";
export { payCosts } from "./effects/costs";
export { addLingeringEffect, expireLingeringEffectsForEndPhase } from "./effects/lingering";
export { findDestructionReplacement } from "./effects/replacement";
export { validateStoredTargets, validateTargetSelection } from "./effects/targets";
export { createPrompt, createTargetPrompt } from "./prompts/prompt";
export { validatePromptAnswer, validateSelectionCount } from "./prompts/selection";
export { applyStateBasedCleanup } from "./rules/stateBasedCleanup";
export {
  collectTriggerCandidates,
  createOptionalTriggerPrompt,
  triggerCandidateFromPrompt,
} from "./rules/triggers";
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
  buildInitialSupportedCardPool,
  buildInitialSupportedPlayableDecks,
  isInitialSupportedCard,
  SUPPORTED_PLAYABLE_DECK_SEEDS,
} from "./cards/supportedCards";
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
export type { SerializedCoreDuelState } from "./serialization";
export type {
  CreateDuelConfig,
  ChainLink,
  DeckList,
  DeckValidationResult,
  CoreCardInstance,
  CoreCardVisibility,
  CoreChainLink,
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
  CorePriorityState,
  CorePriorityWindowReason,
  CorePriorityWindowStatus,
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
  PassiveBoardFillerOptions,
  PlayerId,
  SerializedCard,
  SerializedDuelState,
} from "./types";
export type { RandomResult, RngState, ShuffleResult } from "./random";
export type { CardCoverage, CardCoverageRegistry, CardCoverageStatus } from "./cards/coverage";
export type {
  SupportedCardEntry,
  SupportedCardPool,
  SupportedPlayableDeck,
} from "./cards/supportedCards";
export type {
  CardEffectContext,
  CardEffectResult,
  CardScript,
  EffectDefinition,
  EffectKind,
  SpellSpeed,
} from "./cards/CardScript";
export type { CardScriptRegistry } from "./cards/registry";
export type { CostKind, CostPayment, CostSpec, PaidCost, PayCostsResult } from "./effects/costs";
export type {
  ContinuousEffectDefinition,
  AttackRestrictionSpec,
  BattleStat,
  ContinuousEffectSource,
  EffectTargetController,
  EffectTargetFilter,
  MonsterStatInput,
  StatModifierSpec,
} from "./effects/continuous";
export type { ActiveLingeringEffect, LingeringEffectDefinition } from "./effects/lingering";
export type {
  DestructionReason,
  DestructionReplacementAction,
  DestructionReplacementInput,
  DestructionReplacementResult,
  DestructionReplacementSpec,
  ReplacementEffectDefinition,
} from "./effects/replacement";
export type {
  CardTargetSpec,
  PlayerTargetSpec,
  SelectedTargets,
  TargetCardKind,
  TargetController,
  TargetFace,
  TargetSelection,
  TargetSpec,
  TargetValidationResult,
} from "./effects/targets";
export type { PromptDefinition, PromptKind } from "./prompts/prompt";
export type {
  DamageStepEffectKind,
  DamageStepEffectPermission,
  DamageStepState,
  DamageStepSubstep,
} from "./rules/damageStep";
export type {
  TriggerCandidate,
  TriggerDefinition,
  TriggerTiming,
} from "./rules/triggers";
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
