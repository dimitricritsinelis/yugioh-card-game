import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
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

type PrimaryDestination = "board" | "hand" | "deck" | "graveyard" | "banished";
type MonsterPlacement = "face-up-attack" | "face-up-defense" | "face-down-defense";
type SpellTrapPlacement = "set" | "activated";
type DeckPosition = "top" | "bottom";

const PRIMARY_DESTINATIONS: { value: PrimaryDestination; label: string }[] = [
  { value: "board", label: "Board" },
  { value: "hand", label: "Hand" },
  { value: "deck", label: "Deck" },
  { value: "graveyard", label: "Graveyard" },
  { value: "banished", label: "Banished" },
];

function currentPrimaryDestination(area: OverrideCardEntry["location"]["area"]): PrimaryDestination | null {
  switch (area) {
    case "hand":
      return "hand";
    case "deck":
      return "deck";
    case "graveyard":
      return "graveyard";
    case "banished":
      return "banished";
    default:
      // monsterZone / spellTrapZone: leave Board selectable for repositioning.
      return null;
  }
}

export function OverridePanel({ entries, player, onClose, onOverride }: OverridePanelProps) {
  const [query, setQuery] = useState("");
  const [selectedInstanceId, setSelectedInstanceId] = useState(entries[0]?.instanceId ?? "");
  const [pending, setPending] = useState<PrimaryDestination | null>(null);
  const [zoneIndex, setZoneIndex] = useState<number | null>(null);
  const [monsterPlacement, setMonsterPlacement] = useState<MonsterPlacement>("face-up-attack");
  const [spellTrapPlacement, setSpellTrapPlacement] = useState<SpellTrapPlacement>("set");
  const [deckPosition, setDeckPosition] = useState<DeckPosition>("top");

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return entries;
    }

    return entries.filter((entry) =>
      [entry.card.name, entry.card.passcode, entry.copyLabel, entry.locationLabel].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [entries, query]);

  const selectedEntry =
    entries.find((entry) => entry.instanceId === selectedInstanceId) ??
    filteredEntries[0] ??
    entries[0] ??
    null;
  const currentDestination = selectedEntry ? currentPrimaryDestination(selectedEntry.location.area) : null;
  const isMonster = selectedEntry?.card.category === "Monster";
  const boardArea: "monsterZone" | "spellTrapZone" = isMonster ? "monsterZone" : "spellTrapZone";
  const boardZones = isMonster ? player.monsterZones : player.spellTrapZones;

  function slotSelectable(index: number): boolean {
    if (!boardZones[index]) {
      return true;
    }

    return selectedEntry?.location.area === boardArea && selectedEntry.location.index === index;
  }

  function firstSelectableSlot(): number | null {
    for (let index = 0; index < boardZones.length; index += 1) {
      if (slotSelectable(index)) {
        return index;
      }
    }

    return null;
  }

  // Reset the staged choice whenever a different card is picked, so a monster's
  // placement can never leak onto a spell/trap (or into a stale zone index).
  useEffect(() => {
    setPending(null);
    setZoneIndex(null);
    setMonsterPlacement("face-up-attack");
    setSpellTrapPlacement("set");
    setDeckPosition("top");
  }, [selectedEntry?.instanceId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function choosePrimary(destination: PrimaryDestination) {
    setPending(destination);
    setZoneIndex(destination === "board" ? firstSelectableSlot() : null);
  }

  function buildDestination(): OverrideCardDestination | null {
    if (!selectedEntry) {
      return null;
    }

    switch (pending) {
      case "hand":
        return { zone: "hand" };
      case "graveyard":
        return { zone: "graveyard" };
      case "banished":
        return { zone: "banished" };
      case "deck":
        return { zone: "deck", position: deckPosition };
      case "board":
        if (zoneIndex === null) {
          return null;
        }

        return isMonster
          ? monsterDestination(zoneIndex, monsterPlacement)
          : spellTrapDestination(zoneIndex, spellTrapPlacement);
      default:
        return null;
    }
  }

  const confirmIssue = !pending
    ? "Choose a destination"
    : pending === "board" && zoneIndex === null
      ? "No open zones for this card"
      : null;

  function confirm() {
    const destination = buildDestination();

    if (!destination || !selectedEntry) {
      return;
    }

    onOverride(selectedEntry.instanceId, destination);
    onClose();
  }

  function handleBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  const summary = selectedEntry ? summaryText(selectedEntry, pending, { isMonster, zoneIndex, monsterPlacement, spellTrapPlacement, deckPosition }) : null;

  return (
    <div className="override-backdrop" role="presentation" onMouseDown={handleBackdrop}>
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
                className={["override-card-row", entry.instanceId === selectedEntry?.instanceId ? "selected" : ""]
                  .filter(Boolean)
                  .join(" ")}
                key={entry.instanceId}
                onClick={() => setSelectedInstanceId(entry.instanceId)}
              >
                <img src={getCardImageUrl(entry.card)} alt="" loading="lazy" />
                <span className="override-card-main">
                  <strong>{entry.card.name}</strong>
                </span>
                <span className="override-location">{entry.locationLabel}</span>
              </button>
            ))}
          </div>

          <div className="override-preview">
            {selectedEntry ? (
              <img
                className="override-preview-img"
                src={getCardImageUrl(selectedEntry.card)}
                alt={selectedEntry.card.name}
              />
            ) : (
              <p className="override-empty">Pick a card from the list to preview it.</p>
            )}
          </div>

          <div className="override-controls" aria-label="Override destinations">
            {selectedEntry ? (
              <>
                <p className="override-current">
                  Currently in <strong>{selectedEntry.locationLabel}</strong>
                </p>

                <div className="override-destination-grid" role="group" aria-label="Destination">
                  {PRIMARY_DESTINATIONS.map((option) => {
                    const isCurrent = currentDestination === option.value;

                    return (
                      <button
                        type="button"
                        key={option.value}
                        className={["override-destination-btn", pending === option.value ? "active" : ""]
                          .filter(Boolean)
                          .join(" ")}
                        aria-pressed={pending === option.value}
                        disabled={isCurrent}
                        title={isCurrent ? "Card is already here" : undefined}
                        onClick={() => choosePrimary(option.value)}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {pending === "board" ? (
                  <section className="override-suboptions" aria-label="Board placement">
                    <div className="override-section-head">
                      <strong>{isMonster ? "Monster Zone" : "Spell / Trap Zone"}</strong>
                      {isMonster ? (
                        <SegmentedMonsterPlacement value={monsterPlacement} onChange={setMonsterPlacement} />
                      ) : (
                        <SegmentedSpellTrapPlacement value={spellTrapPlacement} onChange={setSpellTrapPlacement} />
                      )}
                    </div>
                    <ZoneSlots
                      zones={boardZones}
                      sourceArea={boardArea}
                      selectedEntry={selectedEntry}
                      selectedIndex={zoneIndex}
                      onSelect={setZoneIndex}
                    />
                  </section>
                ) : null}

                {pending === "deck" ? (
                  <section className="override-suboptions" aria-label="Deck placement">
                    <div className="override-section-head">
                      <strong>Return to Deck</strong>
                      <SegmentedDeckPosition value={deckPosition} onChange={setDeckPosition} />
                    </div>
                  </section>
                ) : null}

                <div className="override-confirm-bar">
                  <span className="override-summary">{summary ?? confirmIssue}</span>
                  <button
                    type="button"
                    className="override-confirm-btn"
                    disabled={confirmIssue !== null}
                    onClick={confirm}
                  >
                    Confirm
                  </button>
                </div>
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

interface ZoneSlotsProps {
  zones: GameState["player"]["monsterZones"];
  sourceArea: "monsterZone" | "spellTrapZone";
  selectedEntry: OverrideCardEntry;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

function ZoneSlots({ zones, sourceArea, selectedEntry, selectedIndex, onSelect }: ZoneSlotsProps) {
  return (
    <div className="override-zone-buttons">
      {zones.map((zone, index) => {
        const isSourceSlot =
          selectedEntry.location.area === sourceArea && selectedEntry.location.index === index;
        const disabled = Boolean(zone) && !isSourceSlot;
        const selected = selectedIndex === index;

        return (
          <button
            type="button"
            className={["override-zone-btn", selected ? "selected" : ""].filter(Boolean).join(" ")}
            disabled={disabled}
            aria-pressed={selected}
            title={disabled ? "Occupied" : `Zone ${index + 1}`}
            key={`${sourceArea}-${index}`}
            onClick={() => onSelect(index)}
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

function SegmentedDeckPosition({
  value,
  onChange,
}: {
  value: DeckPosition;
  onChange: (value: DeckPosition) => void;
}) {
  return (
    <div className="override-segmented" role="group" aria-label="Deck position">
      <SegmentButton active={value === "top"} onClick={() => onChange("top")}>
        Top
      </SegmentButton>
      <SegmentButton active={value === "bottom"} onClick={() => onChange("bottom")}>
        Bottom
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
    <button type="button" className={active ? "active" : ""} aria-pressed={active} onClick={onClick}>
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

function monsterPlacementLabel(placement: MonsterPlacement): string {
  switch (placement) {
    case "face-up-attack":
      return "Face-up Attack";
    case "face-up-defense":
      return "Face-up Defense";
    case "face-down-defense":
      return "Face-down Set";
  }
}

function spellTrapPlacementLabel(placement: SpellTrapPlacement): string {
  return placement === "set" ? "Set (face-down)" : "Activate (face-up)";
}

function summaryText(
  entry: OverrideCardEntry,
  pending: PrimaryDestination | null,
  options: {
    isMonster: boolean;
    zoneIndex: number | null;
    monsterPlacement: MonsterPlacement;
    spellTrapPlacement: SpellTrapPlacement;
    deckPosition: DeckPosition;
  },
): string | null {
  const name = entry.card.name;

  switch (pending) {
    case "hand":
      return `${name} → Hand`;
    case "graveyard":
      return `${name} → Graveyard`;
    case "banished":
      return `${name} → Banished`;
    case "deck":
      return `${name} → Deck (${options.deckPosition})`;
    case "board": {
      if (options.zoneIndex === null) {
        return null;
      }

      const zoneLabel = options.isMonster
        ? `Monster Zone ${options.zoneIndex + 1}`
        : `Spell/Trap Zone ${options.zoneIndex + 1}`;
      const placementLabel = options.isMonster
        ? monsterPlacementLabel(options.monsterPlacement)
        : spellTrapPlacementLabel(options.spellTrapPlacement);

      return `${name} → ${zoneLabel} · ${placementLabel}`;
    }
    default:
      return null;
  }
}
