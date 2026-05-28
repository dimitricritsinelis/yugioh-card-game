import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import cardsJson from "../../public/yugioh_cards/cards.json";
import type { CardRecord } from "../types";

const allCards = cardsJson as CardRecord[];

vi.mock("../cardData", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../cardData")>();
  return {
    ...actual,
    loadCards: () => Promise.resolve(allCards),
  };
});

beforeAll(() => {
  if (typeof HTMLMediaElement !== "undefined" && !HTMLMediaElement.prototype.play) {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
  }
});

afterEach(() => {
  cleanup();
});

async function importApp() {
  return (await import("../App")).default;
}

describe("app shell screen flow", () => {
  it("starts at Home after cards load and shows a Play button", async () => {
    const App = await importApp();
    render(<App />);

    expect(await screen.findByRole("heading", { name: /goat duel/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^play$/i })).toBeTruthy();
  });

  it("Play opens the Lobby with seat options", async () => {
    const App = await importApp();
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^play$/i }));

    expect(await screen.findByRole("heading", { name: /choose your seat/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /enter as player 1/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /enter as player 2/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /enter as spectator/i })).toBeTruthy();
  });

  it("Enter as Player 1 opens the duel with the player hand visible", async () => {
    const App = await importApp();
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^play$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /enter as player 1/i }));

    expect(await screen.findByRole("region", { name: /goat duel test screen/i })).toBeTruthy();
    expect(screen.getByRole("region", { name: /player hand/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /override/i })).toBeTruthy();
  });

  it("Enter as Player 2 opens the duel with the viewer's own hand visible", async () => {
    const App = await importApp();
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^play$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /enter as player 2/i }));

    expect(await screen.findByRole("region", { name: /goat duel test screen/i })).toBeTruthy();
    expect(screen.getByRole("region", { name: /player hand/i })).toBeTruthy();
  });

  it("Spectator mode hides hand, engine panels, advance button, and Reset Duel", async () => {
    const App = await importApp();
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^play$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /enter as spectator/i }));

    expect(await screen.findByRole("region", { name: /goat duel spectator view/i })).toBeTruthy();
    expect(screen.queryByRole("region", { name: /player hand/i })).toBeNull();
    expect(screen.queryByRole("region", { name: /^prompt$/i })).toBeNull();
    expect(screen.queryByRole("region", { name: /^priority$/i })).toBeNull();
    expect(screen.queryByRole("region", { name: /^chain$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /reset duel/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /override/i })).toBeNull();
    expect(
      screen.queryByRole("button", { name: /end turn|enter battle phase|main phase|waiting on/i }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: /leave duel/i })).toBeTruthy();
  });

  it("Lobby's Enter as Spectator button has no name input", async () => {
    const App = await importApp();
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^play$/i }));
    await screen.findByRole("heading", { name: /choose your seat/i });

    expect(screen.queryByLabelText(/spectator name/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /enter as spectator/i }));
    expect(await screen.findByRole("region", { name: /goat duel spectator view/i })).toBeTruthy();
  });
});
