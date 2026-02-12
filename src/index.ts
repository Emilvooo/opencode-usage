#!/usr/bin/env bun

import { fetchClaudeUsage } from "./providers/claude";
import { fetchCodexUsage } from "./providers/codex";
import {
  displayHeader,
  displayFooter,
  displayClaude,
  displayCodex,
  displayError,
} from "./display";

async function main() {
  displayHeader();

  const [claude, codex] = await Promise.allSettled([
    fetchClaudeUsage(),
    fetchCodexUsage(),
  ]);

  if (claude.status === "fulfilled") {
    displayClaude(claude.value);
  } else {
    displayError("Claude", claude.reason?.message ?? "Unknown error");
  }

  if (codex.status === "fulfilled") {
    displayCodex(codex.value);
  } else {
    displayError("Codex", codex.reason?.message ?? "Unknown error");
  }

  displayFooter();
}

main();
