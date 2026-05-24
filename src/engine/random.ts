const RNG_ALGORITHM = "mulberry32-v1";
const UINT32_SIZE = 4294967296;

export interface RngState {
  readonly algorithm: typeof RNG_ALGORITHM;
  readonly seed: string;
  readonly value: number;
  readonly draws: number;
}

export interface RandomResult {
  readonly value: number;
  readonly rng: RngState;
}

export interface ShuffleResult<T> {
  readonly items: T[];
  readonly rng: RngState;
}

export function createRngState(seed: string): RngState {
  return {
    algorithm: RNG_ALGORITHM,
    seed,
    value: hashSeed(seed),
    draws: 0,
  };
}

export function nextRandom(rng: RngState): RandomResult {
  const nextValue = (rng.value + 0x6d2b79f5) >>> 0;
  let mixed = nextValue;

  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

  return {
    value: ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_SIZE,
    rng: {
      ...rng,
      value: nextValue,
      draws: rng.draws + 1,
    },
  };
}

export function createSeededRng(seed: string): () => number {
  let rng = createRngState(seed);

  return () => {
    const result = nextRandom(rng);

    rng = result.rng;

    return result.value;
  };
}

export function shuffleWithRng<T>(items: readonly T[], rng: RngState): ShuffleResult<T> {
  let nextRng = rng;
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const result = nextRandom(nextRng);
    const swapIndex = Math.floor(result.value * (index + 1));

    nextRng = result.rng;
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return {
    items: copy,
    rng: nextRng,
  };
}

export function shuffleSeeded<T>(items: readonly T[], seed: string): T[] {
  return shuffleWithRng(items, createRngState(seed)).items;
}

function hashSeed(seed: string): number {
  let hash = 1779033703 ^ seed.length;

  for (let index = 0; index < seed.length; index += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
  hash ^= hash >>> 16;

  return hash >>> 0;
}
