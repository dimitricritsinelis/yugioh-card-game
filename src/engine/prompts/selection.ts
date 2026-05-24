import type { EngineCommand } from "../commands";
import type { EnginePrompt } from "../result";

export function validateSelectionCount(count: number, min: number, max: number): string | null {
  if (count < min) {
    return `Selection requires at least ${min} choice(s).`;
  }

  if (count > max) {
    return `Selection allows at most ${max} choice(s).`;
  }

  return null;
}

export function validatePromptAnswer(
  prompt: EnginePrompt,
  command: Extract<EngineCommand, { type: "answer-prompt" }>,
): string | null {
  const count = answerCount(prompt, command);
  const countError = validateSelectionCount(count, prompt.min, prompt.max);

  if (countError) {
    return countError;
  }

  if (prompt.kind === "yes-no") {
    const choice = command.choiceIds?.[0];

    if (choice !== "yes" && choice !== "no") {
      return "Yes/no prompts require a yes or no choice.";
    }
  }

  return null;
}

function answerCount(
  prompt: EnginePrompt,
  command: Extract<EngineCommand, { type: "answer-prompt" }>,
): number {
  switch (prompt.kind) {
    case "target":
      return (command.targetRefs?.length ?? 0) + (command.targetPlayerIds?.length ?? 0);
    case "discard":
      return command.discardInstanceIds?.length ?? 0;
    case "tribute":
      return command.tributeInstanceIds?.length ?? 0;
    case "choice":
    case "yes-no":
    case "chain-response":
      return command.choiceIds?.length ?? 0;
  }
}
