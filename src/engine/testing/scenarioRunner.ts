import type { EngineCommand } from "../commands";
import type { DuelState } from "../core/state";
import type { EngineError } from "../errors";
import type { EngineEvent } from "../events";
import { reduceDuel } from "../reducer";
import type { EnginePrompt, EngineResult } from "../result";

export interface ScenarioStep {
  readonly command: EngineCommand;
  readonly label?: string;
}

export interface ScenarioRunResult {
  readonly initialState: DuelState;
  readonly state: DuelState;
  readonly results: readonly EngineResult[];
  readonly events: readonly EngineEvent[];
  readonly prompts: readonly EnginePrompt[];
  readonly errors: readonly EngineError[];
}

export function runScenario(
  initialState: DuelState,
  steps: readonly (EngineCommand | ScenarioStep)[],
): ScenarioRunResult {
  const results: EngineResult[] = [];
  const events: EngineEvent[] = [];
  const prompts: EnginePrompt[] = [];
  const errors: EngineError[] = [];
  let state = initialState;

  for (const step of steps) {
    const result = applyScenarioStep(state, step);

    results.push(result);
    events.push(...result.events);
    prompts.push(...result.prompts);
    errors.push(...result.errors);
    state = result.state;
  }

  return {
    initialState,
    state,
    results,
    events,
    prompts,
    errors,
  };
}

export function applyScenarioStep(
  state: DuelState,
  step: EngineCommand | ScenarioStep,
): EngineResult {
  return reduceDuel(state, commandFromStep(step));
}

function commandFromStep(step: EngineCommand | ScenarioStep): EngineCommand {
  return "command" in step ? step.command : step;
}
