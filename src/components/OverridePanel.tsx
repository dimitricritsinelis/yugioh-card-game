import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { getCardImageUrl } from "../cardData";
import type { OverrideCardDestination } from "../engine";
import type { OverrideCardEntry } from "../gameLogic";
import type { GameState } from "../types";

interface OverridePanelProps {
  entries: OverrideCardEntry[];
  player: GameState["player"];
  onClose: () => void;
  onOverride: (instanceId: string, destination: OverrideCardDestination) => void;
}

type MonsterPlacement = "face-up-attack" | "face-up-defense" | "face-down-defense";
type SpellTrapPlacement = "set" | "activated";

export function OverridePanel({ entries, player, onClose, onOverride }: OverridePanelProps) {
  const [query, setQuery] = useState("");
  const [selectedInstanceId, setSelectedInstanceId] = useState(entries[0]?.instanceId ?? "");
  const [monsterPlacement, setMonsterPlacement] = useState<MonsterPlacement>("face-up-attack");
  const [spellTrapPlacement, setSpellTrapPlacement] = useState<SpellTrapPlacement>("set");

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return entries;
    }

    return entries.filter((entry) =>
      [
        entry.card.name,
        entry.card.passcode,
        entry.copyLabel,
        entry.locationLabel,
      ].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [entries, query]);

  const selectedEntry =
    entries.find((entry) => entry.instanceId === selectedInstanceId) ??
    filteredEntries[0] ??
    entries[0] ??
    null;
  const isMonster = selectedEntry?.card.category === "Monster";

  function moveTo(destination: OverrideCardDestination) {
    if (!selectedEntry) {
      return;
    }

    onOverride(selectedEntry.instanceId, destination);
  }

  return (
    <div className="override-backdrop" role="presentation">
      <section className="override-panel" role="dialog" aria-modal="true" aria-label="Override card location">
        <header className="override-head">
          <div>
            <p className="eyebrow">Manual Override</p>
            <h2>Card Location</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Close override" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="override-search">
          <Search size={15} />
          <input
            type="search"
            value={query}
            placeholder="Search your cards"
            aria-label="Search your cards"
            onChange={(event) => setQuery(event.target.value)}
          />
          <span>{entries.length} cards</span>
        </div>

        <div className="override-body">
          <div className="override-card-list" role="listbox" aria-label="Your cards">
            {filteredEntries.map((entry) => (
              <button
                type="button"
                role="option"
                aria-selected={entry.instanceId === selectedEntry?.instanceId}
                className={[
                  "override-card-row",
                  entry.instanceId === selectedEntry?.instanceId ? "selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={entry.instanceId}
                onClick={() => setSelectedInstanceId(entry.instanceId)}
              >
                <img src={getCardImageUrl(entry.card)} alt="" loading="lazy" />
                <span className="override-card-main">
                  <strong>{entry.card.name}</strong>
                  <span>{entry.copyLabel}</span>
                </span>
                <span className="override-location">{entry.locationLabel}</span>
              </button>
            ))}
          </div>

          <div className="override-controls" aria-label="Override destinations">
            {selectedEntry ? (
              <>
                <div className="override-selected-card">
                  <img src={getCardImageUrl(selectedEntry.card)} alt="" />
                  <div>
                    <strong>{selectedEntry.card.name}</strong>
                    <span>{selectedEntry.locationLabel}</span>
                  </div>
                </div>

                <div className="override-destination-grid">
                  <button type="button" className="override-destination-btn" onClick={() => moveTo({ zone: "hand" })}>
                    Hand
                  </button>
                  <button
                    type="button"
                    className="override-destination-btn"
                    onClick={() => moveTo({ zone: "graveyard" })}
                  >
                    Graveyard
                  </button>
                  <button
                    type="button"
                    className="override-destination-btn"
                    onClick={() => moveTo({ zone: "banished" })}
                  >
                    Banished
                  </button>
                </div>

                {isMonster ? (
                  <section className="override-zone-section" aria-label="Monster zone override">
                    <div className="override-section-head">
                      <strong>Monster Zone</strong>
                      <SegmentedMonsterPlacement
                        value={monsterPlacement}
                        onChange={setMonsterPlacement}
                      />
                    </div>
                    <ZoneButtons
                      zones={player.monsterZones}
                      selectedEntry={selectedEntry}
                      sourceArea="monsterZone"
                      onChoose={(index) => moveTo(monsterDestination(index, monsterPlacement))}
                    />
                  </section>
                ) : (
                  <section className="override-zone-section" aria-label="Spell trap zone override">
                    <div className="override-section-head">
                      <strong>Spell / Trap Zone</strong>
                      <SegmentedSpellTrapPlacement
                        value={spellTrapPlacement}
                        onChange={setSpellTrapPlacement}
                      />
                    </div>
                    <ZoneButtons
                      zones={player.spellTrapZones}
                      selectedEntry={selectedEntry}
                      sourceArea="spellTrapZone"
                      onChoose={(index) => moveTo(spellTrapDestination(index, spellTrapPlacement))}
                    />
                  </section>
                )}
              </>
            ) : (
              <p className="override-empty">No card selected.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

interface ZoneButtonsProps {
  zones: GameState["player"]["monsterZones"];
  selectedEntry: OverrideCardEntry;
  sourceArea: "monsterZone" | "spellTrapZone";
  onChoose: (index: number) => void;
}

function ZoneButtons({ zones, selectedEntry, sourceArea, onChoose }: ZoneButtonsProps) {
  return (
    <div className="override-zone-buttons">
      {zones.map((zone, index) => {
        const isSourceSlot =
          selectedEntry.location.area === sourceArea && selectedEntry.location.index === index;
        const disabled = Boolean(zone) && !isSourceSlot;

        return (
          <button
            type="button"
            className="override-zone-btn"
            disabled={disabled}
            key={`${sourceArea}-${index}`}
            onClick={() => onChoose(index)}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
}

function SegmentedMonsterPlacement({
  value,
  onChange,
}: {
  value: MonsterPlacement;
  onChange: (value: MonsterPlacement) => void;
}) {
  return (
    <div className="override-segmented" role="group" aria-label="Monster placement">
      <SegmentButton active={value === "face-up-attack"} onClick={() => onChange("face-up-attack")}>
        ATK
      </SegmentButton>
      <SegmentButton active={value === "face-up-defense"} onClick={() => onChange("face-up-defense")}>
        DEF
      </SegmentButton>
      <SegmentButton active={value === "face-down-defense"} onClick={() => onChange("face-down-defense")}>
        Set
      </SegmentButton>
    </div>
  );
}

function SegmentedSpellTrapPlacement({
  value,
  onChange,
}: {
  value: SpellTrapPlacement;
  onChange: (value: SpellTrapPlacement) => void;
}) {
  return (
    <div className="override-segmented" role="group" aria-label="Spell trap placement">
      <SegmentButton active={value === "set"} onClick={() => onChange("set")}>
        Set
      </SegmentButton>
      <SegmentButton active={value === "activated"} onClick={() => onChange("activated")}>
        Active
      </SegmentButton>
    </div>
  );
}

function SegmentButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "active" : ""}
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function monsterDestination(index: number, placement: MonsterPlacement): OverrideCardDestination {
  if (placement === "face-down-defense") {
    return { zone: "monsterZone", index, face: "faceDown", position: "defense" };
  }

  return {
    zone: "monsterZone",
    index,
    face: "faceUp",
    position: placement === "face-up-attack" ? "attack" : "defense",
  };
}

function spellTrapDestination(index: number, placement: SpellTrapPlacement): OverrideCardDestination {
  return {
    zone: "spellTrapZone",
    index,
    face: placement === "set" ? "faceDown" : "faceUp",
  };
}
