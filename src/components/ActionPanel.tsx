import { Ban, CircleSlash, FastForward, Flame, Layers, RotateCcw, Send, Shield, Sparkles } from "lucide-react";
import { MAX_HAND_SLOTS } from "../gameLogic";
import type { CardAction, CardInstance, CardLocation, GameState } from "../types";

interface ActionPanelProps {
  game: GameState;
  selectedCard: CardInstance | null;
  selectedLocation: CardLocation | null;
  onDraw: () => void;
  onReset: () => void;
  onNextPhase: () => void;
  onStartAction: (action: CardAction) => void;
  onCancelAction: () => void;
  onSendToGraveyard: () => void;
  onBanish: () => void;
}

export function ActionPanel({
  game,
  selectedCard,
  selectedLocation,
  onDraw,
  onReset,
  onNextPhase,
  onStartAction,
  onCancelAction,
  onSendToGraveyard,
  onBanish,
}: ActionPanelProps) {
  const isMonster = selectedCard?.card.category === "Monster";
  const isSpellTrap = selectedCard?.card.category === "Spell" || selectedCard?.card.category === "Trap";
  const isInHand = selectedLocation?.area === "hand";
  const hasSelection = Boolean(selectedCard);

  return (
    <section className="stone-panel action-panel" aria-label="Actions">
      <div className="panel-title">
        <p className="eyebrow">Command</p>
        <strong>{game.pendingAction ? "Choose a highlighted zone" : "Ready"}</strong>
      </div>

      <div className="action-grid">
        <button
          type="button"
          onClick={onDraw}
          disabled={game.player.deck.length === 0 || game.player.hand.length >= MAX_HAND_SLOTS}
        >
          <Layers size={16} />
          Draw Card
        </button>
        <button type="button" onClick={onNextPhase}>
          <FastForward size={16} />
          Next Phase
        </button>
        <button type="button" onClick={onReset}>
          <RotateCcw size={16} />
          Reset
        </button>
      </div>

      <div className="context-actions">
        <span>Selected Actions</span>
        {isMonster ? (
          <>
            <button type="button" onClick={() => onStartAction("summon")} disabled={!isInHand}>
              <Flame size={16} />
              Summon
            </button>
            <button type="button" onClick={() => onStartAction("set")} disabled={!isInHand}>
              <Shield size={16} />
              Set
            </button>
          </>
        ) : null}

        {isSpellTrap ? (
          <>
            <button type="button" onClick={() => onStartAction("activate")} disabled={!isInHand}>
              <Sparkles size={16} />
              Activate
            </button>
            <button type="button" onClick={() => onStartAction("set")} disabled={!isInHand}>
              <Shield size={16} />
              Set
            </button>
          </>
        ) : null}

        <button type="button" onClick={onSendToGraveyard} disabled={!hasSelection}>
          <Send size={16} />
          Send to Graveyard
        </button>
        <button type="button" onClick={onBanish} disabled={!hasSelection}>
          <Ban size={16} />
          Banish
        </button>

        {game.pendingAction ? (
          <button className="subtle-command" type="button" onClick={onCancelAction}>
            <CircleSlash size={16} />
            Cancel
          </button>
        ) : null}
      </div>
    </section>
  );
}
