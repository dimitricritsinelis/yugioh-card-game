export type CardCategory = "Monster" | "Spell" | "Trap";

export type Screen = "home" | "lobby" | "game" | "spectator";

export type ViewerRole = "P1" | "P2" | "spectator";

export interface SessionState {
  p1Name: string;
  p2Name: string;
  spectatorName: string;
  viewerRole: ViewerRole;
}

export type Phase = "DP" | "SP" | "M1" | "BP" | "M2" | "EP";

export type CardAction = "summon" | "set" | "activate";

export type ZoneKind = "monster" | "spellTrap";

export interface MonsterStats {
  attribute: string | null;
  type: string | null;
  level: number | null;
  atk: number | string | null;
  def: number | string | null;
}

export interface SpellTrapInfo {
  icon: string | null;
}

export interface CardLegality {
  goat_world_pool: boolean;
  restriction: "Forbidden" | "Limited" | "Semi-Limited" | "Unlimited" | string;
  max_copies: number;
}

export interface CardImage {
  file_name?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface CardRecord {
  id?: string;
  passcode: string;
  slug: string;
  name: string;
  file_name: string;
  category: CardCategory;
  classifications: string[];
  text: string;
  monster: MonsterStats | null;
  spell_trap: SpellTrapInfo | null;
  legality: CardLegality;
  image?: CardImage | null;
}

export interface CardInstance {
  instanceId: string;
  card: CardRecord;
}

export interface ZoneCard {
  instance: CardInstance;
  faceDown: boolean;
  stance: "attack" | "set" | "activated";
  /** Turn this card was Set face-down, when known. Gates Trap activation timing. */
  setTurn?: number | null;
}

export interface PlayerState {
  lp: number;
  deck: CardInstance[];
  hand: CardInstance[];
  monsterZones: Array<ZoneCard | null>;
  spellTrapZones: Array<ZoneCard | null>;
  graveyard: ZoneCard[];
  banished: ZoneCard[];
}

export interface OpponentState {
  lp: number;
  monsterZones: Array<ZoneCard | boolean | null>;
  spellTrapZones: Array<ZoneCard | boolean | null>;
  deckCount: number;
  graveyardCount: number;
  banishedCount: number;
}

export interface ActionLogEntry {
  id: string;
  message: string;
  actor?: import("./engine").PlayerId | null;
}

export interface GameState {
  engine?: import("./engine").DuelState;
  viewerId?: import("./engine").PlayerId;
  opponentBehavior?: import("./engine").OpponentBehavior;
  opponentTargetMonsterCount?: number;
  /** Browser-safe online spectator projections may know the deck count without deck identity. */
  playerDeckCount?: number;
  player: PlayerState;
  opponent: OpponentState;
  phase: Phase;
  turn: number;
  selectedCardId: string | null;
  actionLog: ActionLogEntry[];
  lastDrawnCardId: string | null;
  lastPlacedCardId: string | null;
}

export type CardLocation =
  | { area: "hand"; index: number }
  | { area: "monster"; index: number }
  | { area: "spellTrap"; index: number }
  | { area: "graveyard"; index: number }
  | { area: "banished"; index: number };
