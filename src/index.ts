#!/usr/bin/env node

import { renderSwiftBar, installSwiftBar } from "./swiftbar.js";
import { fetchClaudeUsage } from "./providers/claude.js";
import { fetchCodexUsages } from "./providers/codex.js";
import {
  displayHeader,
  displayFooter,
  displayClaude,
  displayCodex,
  displayError,
} from "./display.js";

async function main() {
  if (process.argv.includes("--install-swiftbar")) {
    await installSwiftBar();
    return;
  }

  if (process.argv.includes("--swiftbar")) {
    await renderSwiftBar();
    return;
  }

  displayHeader();

  const [claude, codex] = await Promise.allSettled([
    fetchClaudeUsage(),
    fetchCodexUsages(),
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
