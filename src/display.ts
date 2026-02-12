import type { ClaudeUsage } from "./providers/claude";
import type { CodexUsage } from "./providers/codex";

const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";

const LINE_WIDTH = 62;
const BAR_WIDTH = 20;
const BLOCKS = [" ", "▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"];

function colorForPercent(pct: number): string {
  if (pct >= 80) return RED;
  if (pct >= 50) return YELLOW;
  return GREEN;
}

function dot(pct: number): string {
  return `${colorForPercent(pct)}●${RESET}`;
}

function bar(percent: number): string {
  const total = (percent / 100) * BAR_WIDTH;
  const full = Math.floor(total);
  const partialIndex = Math.round((total - full) * 8);
  const hasPartial = partialIndex > 0 && partialIndex < 8;
  const empty = BAR_WIDTH - full - (hasPartial ? 1 : 0);
  const color = colorForPercent(percent);
  const BG = "\x1b[48;5;238m";

  const fullPart = full > 0 ? `${color}${BG}${"█".repeat(full)}${RESET}` : "";
  const partialPart = hasPartial ? `${color}${BG}${BLOCKS[partialIndex]}${RESET}` : "";
  const emptyPart = empty > 0 ? `${DIM}${BG}${" ".repeat(empty)}${RESET}` : "";

  return `${fullPart}${partialPart}${emptyPart}`;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "now";
  const totalMin = Math.floor(ms / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 && days === 0) parts.push(`${mins}m`);
  return parts.join(" ") || "< 1m";
}

function timeUntil(date: Date): string {
  return formatDuration(date.getTime() - Date.now());
}

function line(label: string, percent: number, resetDate?: Date): string {
  const pctStr = `${Math.round(percent)}%`.padStart(4);
  const color = colorForPercent(percent);
  const left = `  ${label.padEnd(14)} ${bar(percent)} ${color}${pctStr}${RESET}`;
  if (!resetDate) return left;

  const resetStr = `${DIM}resets ${timeUntil(resetDate)}${RESET}`;
  const visibleLeft = 2 + 14 + 1 + BAR_WIDTH + 1 + pctStr.length;
  const pad = Math.max(2, LINE_WIDTH - visibleLeft - `resets ${timeUntil(resetDate)}`.length);
  return `${left}${" ".repeat(pad)}${resetStr}`;
}

function subLine(label: string, percent: number): string {
  const color = colorForPercent(percent);
  return `    ${DIM}${label.padEnd(12)}${RESET} ${color}${Math.round(percent)}%${RESET}`;
}

const SEP = `${DIM}${"─".repeat(LINE_WIDTH)}${RESET}`;

export function displayClaude(usage: ClaudeUsage): void {
  const maxPct = Math.max(usage.fiveHour.percent, usage.sevenDay.percent);
  console.log(`\n  ${dot(maxPct)} ${BOLD}Claude${RESET}`);
  console.log(line("5h window", usage.fiveHour.percent, usage.fiveHour.resetsAt));
  console.log(line("7d window", usage.sevenDay.percent, usage.sevenDay.resetsAt));
  if (usage.sonnet) console.log(subLine("Sonnet", usage.sonnet.percent));
  if (usage.opus) console.log(subLine("Opus", usage.opus.percent));
  if (usage.extraUsage?.enabled) {
    console.log(`    ${DIM}Overage${RESET}      $${usage.extraUsage.used.toFixed(2)} / $${usage.extraUsage.limit.toFixed(2)}`);
  }
}

export function displayCodex(usage: CodexUsage): void {
  const maxPct = Math.max(usage.primary.percent, usage.secondary?.percent ?? 0);
  console.log(`\n  ${dot(maxPct)} ${BOLD}Codex${RESET}  ${DIM}(${usage.planType})${RESET}`);
  console.log(line("Primary", usage.primary.percent, usage.primary.resetsAt));
  if (usage.secondary) {
    console.log(line("Secondary", usage.secondary.percent, usage.secondary.resetsAt));
  }
  if (usage.credits && !usage.credits.unlimited) {
    console.log(`    ${DIM}Credits${RESET}      $${usage.credits.balance.toFixed(2)}`);
  }
}

export function displayError(provider: string, error: string): void {
  console.log(`\n  ${RED}●${RESET} ${BOLD}${provider}${RESET}`);
  console.log(`    ${RED}${error}${RESET}`);
}

export function displayHeader(): void {
  console.log(`\n${BOLD}  OpenCode Usage${RESET}`);
  console.log(SEP);
}

export function displayFooter(): void {
  console.log(SEP);
  console.log();
}
