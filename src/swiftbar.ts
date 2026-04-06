import { homedir } from "os";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";
import { realpathSync } from "fs";
import { execSync } from "child_process";
import { fetchClaudeUsage } from "./providers/claude.js";
import { fetchCodexUsages } from "./providers/codex.js";
import type { ClaudeUsage } from "./providers/claude.js";
import type { CodexUsageEntry, CodexUsage } from "./providers/codex.js";

const SEPARATOR = Symbol("separator");
const isDarkMode = process.env.XBARDarkMode === "true" || process.env.SWIFTBAR_DARK_MODE === "true";

interface ItemOptions {
  text: string;
  color?: string;
  font?: string;
  size?: number;
  dropdown?: boolean;
  refresh?: boolean;
}

type Item = string | ItemOptions | typeof SEPARATOR;

function renderItems(items: Item[]): string {
  return items
    .map((item) => {
      if (item === SEPARATOR) return "---";
      if (typeof item === "string") return item;
      const { text, ...opts } = item;
      const params = Object.entries(opts)
        .map(([k, v]) => `${k}="${v}"`)
        .join(" ");
      return params ? `${text}|${params}` : text;
    })
    .join("\n");
}

const ERR_COLOR = isDarkMode ? "#ff6b6b" : "#c62828";
const MUTED = isDarkMode ? "#999" : "#666";

function colorFor(pct: number): string {
  if (pct >= 80) return ERR_COLOR;
  if (pct >= 50) return isDarkMode ? "#ffd93d" : "#ef6c00";
  return isDarkMode ? "#6bcb77" : "#2e7d32";
}

function fmtReset(date: Date): string {
  const ms = date.getTime() - Date.now();
  if (ms <= 0) return "now";
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const p: string[] = [];
  if (d) p.push(`${d}d`);
  if (h) p.push(`${h}h`);
  if (m && !d) p.push(`${m}m`);
  return p.join(" ") || "< 1m";
}

function detail(text: string, color?: string): ItemOptions {
  return { text, font: "Menlo", size: 12, ...(color ? { color } : {}) };
}

function buildTitle(
  claude: PromiseSettledResult<ClaudeUsage>,
  codex: PromiseSettledResult<CodexUsageEntry[]>,
): ItemOptions {
  const parts: string[] = [];
  let maxPct = 0;

  if (claude.status === "fulfilled") {
    const pct = Math.max(claude.value.fiveHour.percent, claude.value.sevenDay.percent);
    parts.push(`C:${Math.round(pct)}%`);
    maxPct = Math.max(maxPct, pct);
  }

  if (codex.status === "fulfilled") {
    const valid = codex.value.filter((e): e is CodexUsage => !("error" in e));
    if (valid.length > 0) {
      const pct = Math.max(...valid.map((e) => e.primary.percent));
      parts.push(`X:${Math.round(pct)}%`);
      maxPct = Math.max(maxPct, pct);
    }
  }

  if (parts.length === 0) return { text: "Usage: --", color: MUTED, dropdown: false };
  return { text: parts.join(" · "), color: colorFor(maxPct), dropdown: false };
}

function claudeSection(usage: ClaudeUsage): Item[] {
  const items: Item[] = [
    { text: "Claude", size: 13 },
    detail(`  5h: ${Math.round(usage.fiveHour.percent)}% — resets ${fmtReset(usage.fiveHour.resetsAt)}`, colorFor(usage.fiveHour.percent)),
    detail(`  7d: ${Math.round(usage.sevenDay.percent)}% — resets ${fmtReset(usage.sevenDay.resetsAt)}`, colorFor(usage.sevenDay.percent)),
  ];

  const models: string[] = [];
  if (usage.sonnet) models.push(`Sonnet ${Math.round(usage.sonnet.percent)}%`);
  if (usage.opus) models.push(`Opus ${Math.round(usage.opus.percent)}%`);
  if (models.length) items.push(detail(`  ${models.join(" · ")}`, MUTED));

  if (usage.extraUsage?.enabled) {
    items.push(detail(`  Overage: $${usage.extraUsage.used.toFixed(2)} / $${usage.extraUsage.limit.toFixed(2)}`, MUTED));
  }

  return items;
}

function codexEntry(entry: CodexUsageEntry, total: number): Item[] {
  const label = entry.account.email ?? (total === 1 ? "Default" : `Account ${entry.account.index + 1}`);
  const tags: string[] = [];
  const planType = "error" in entry ? entry.account.planType : entry.planType;
  if (planType) tags.push(planType);
  if (entry.account.active) tags.push("active");
  const meta = tags.length ? ` (${tags.join(" · ")})` : "";

  const items: Item[] = [detail(`  ${label}${meta}`)];

  if ("error" in entry) {
    items.push(detail(`    ${entry.error}`, ERR_COLOR));
    return items;
  }

  items.push(detail(`    Primary: ${Math.round(entry.primary.percent)}% — resets ${fmtReset(entry.primary.resetsAt)}`, colorFor(entry.primary.percent)));
  if (entry.secondary) {
    items.push(detail(`    Secondary: ${Math.round(entry.secondary.percent)}% — resets ${fmtReset(entry.secondary.resetsAt)}`, colorFor(entry.secondary.percent)));
  }
  if (entry.credits && !entry.credits.unlimited) {
    items.push(detail(`    Credits: $${entry.credits.balance.toFixed(2)}`, MUTED));
  }

  return items;
}

function codexSection(entries: CodexUsageEntry[]): Item[] {
  const items: Item[] = [{ text: "Codex", size: 13 }];
  for (const entry of entries) items.push(...codexEntry(entry, entries.length));
  return items;
}

function errorSection(provider: string, message: string): Item[] {
  return [
    { text: provider, size: 13 },
    detail(`  ${message}`, ERR_COLOR),
  ];
}

export async function renderSwiftBar(): Promise<void> {
  const [claude, codex] = await Promise.allSettled([
    fetchClaudeUsage(),
    fetchCodexUsages(),
  ]);

  const items: Item[] = [buildTitle(claude, codex), SEPARATOR];

  if (claude.status === "fulfilled") {
    items.push(...claudeSection(claude.value));
  } else {
    items.push(...errorSection("Claude", claude.reason?.message ?? "Unknown error"));
  }

  items.push(SEPARATOR);

  if (codex.status === "fulfilled") {
    items.push(...codexSection(codex.value));
  } else {
    items.push(...errorSection("Codex", codex.reason?.message ?? "Unknown error"));
  }

  items.push(SEPARATOR);
  items.push({ text: "Refresh", refresh: true });

  console.log(renderItems(items));
}

function getSwiftBarPluginDir(): string | null {
  try {
    return execSync("defaults read com.ameba.SwiftBar PluginDirectory", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

export async function installSwiftBar(): Promise<void> {
  const DIM = "\x1b[2m";
  const BOLD = "\x1b[1m";
  const GREEN = "\x1b[32m";
  const RED = "\x1b[31m";
  const R = "\x1b[0m";

  const pluginDir = getSwiftBarPluginDir();
  if (!pluginDir) {
    console.log(`\n  ${RED}●${R} ${BOLD}SwiftBar not found${R}`);
    console.log(`\n  Install SwiftBar first and set a plugin directory:`);
    console.log(`  ${DIM}brew install --cask swiftbar${R}`);
    console.log(`  ${DIM}or download from https://github.com/swiftbar/SwiftBar/releases${R}\n`);
    process.exitCode = 1;
    return;
  }

  await mkdir(pluginDir, { recursive: true });

  const nodePath = process.execPath;
  const scriptPath = realpathSync(process.argv[1]);

  const script = [
    "#!/bin/bash",
    "# <swiftbar.title>OpenCode Usage</swiftbar.title>",
    "# <swiftbar.desc>Claude and Codex usage in your menu bar</swiftbar.desc>",
    `"${nodePath}" "${scriptPath}" --swiftbar`,
    "",
  ].join("\n");

  const pluginPath = join(pluginDir, "opencode-usage.5m.sh");
  await writeFile(pluginPath, script, { mode: 0o755 });

  console.log(`\n  ${GREEN}●${R} ${BOLD}SwiftBar plugin installed${R}`);
  console.log(`  ${DIM}${pluginPath}${R}`);
  console.log(`  ${DIM}Refresh interval: every 5 minutes${R}`);
  console.log(`\n  ${BOLD}To change the interval:${R} rename the file`);
  console.log(`  ${DIM}1m = every minute, 5m = every 5 min, 30m = every 30 min${R}\n`);
}
