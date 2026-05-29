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
  window.localStorage.clear();
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

  it("Play opens the online lobby with Host and Join options", async () => {
    const App = await importApp();
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^play$/i }));

    expect(await screen.findByRole("button", { name: /host a duel/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /join with code/i })).toBeTruthy();
    expect(screen.getByLabelText(/your name/i)).toBeTruthy();
  });

  it("Join with Code reveals a duel-code entry", async () => {
    const App = await importApp();
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /^play$/i }));
    fireEvent.click(await screen.findByRole("button", { name: /join with code/i }));

    expect(await screen.findByLabelText(/duel code/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /join duel/i })).toBeTruthy();
  });
});
