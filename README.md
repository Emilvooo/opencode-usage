# opencode-usage

Simple CLI to view your [OpenCode](https://opencode.ai) provider usage at a glance.

```
  OpenCode Usage
──────────────────────────────────────────────────────────────

  ● Claude
  5h window      █████████▊           54%       resets 1h 54m
  7d window      ███████████████      75%       resets 2h 54m
    Sonnet       1%
    Overage      $38.27 / $50.00

  ● Codex
    work@example.com  team · active
      Primary     ▊                     4%     resets 1h 15m
      Secondary   █▋                    8%     resets 5d 21h
      Credits     $0.00

    personal@example.com  plus
      Primary     ████▎                21%     resets 48m
──────────────────────────────────────────────────────────────
```

## Install

```bash
npm install -g @emilvooo/opencode-usage
# or
bun install -g @emilvooo/opencode-usage
# or
pnpm add -g @emilvooo/opencode-usage
# or
yarn global add @emilvooo/opencode-usage
```

Or run it directly without installing:

```bash
npx @emilvooo/opencode-usage
bunx @emilvooo/opencode-usage
pnpm dlx @emilvooo/opencode-usage
```

## Usage

```bash
opencode-usage
```

That's it. Reads your OpenCode auth tokens automatically and fetches usage data in parallel.

If you use `opencode-openai-multi-auth`, all OpenAI accounts from `~/.config/opencode/openai-accounts.json` are shown individually.

## macOS Menu Bar

Show your usage in the macOS menu bar using [SwiftBar](https://github.com/swiftbar/SwiftBar):

```bash
brew install --cask swiftbar
opencode-usage --install-swiftbar
```

This auto-detects your SwiftBar plugins folder and installs a plugin that refreshes every 5 minutes. Rename the plugin file to change the interval (`1m`, `5m`, `15m`, `30m`, etc).

## Supported providers

| Provider | Metrics |
|----------|---------|
| **Claude** (Anthropic) | 5h/7d usage windows, Sonnet/Opus breakdown, overage |
| **Codex** (OpenAI) | Primary/secondary quotas, plan type, credits, multi-account support |

## Requirements

- Node.js >= 18
- [OpenCode](https://opencode.ai) installed and authenticated with at least one provider

## How it works

1. Reads tokens from `~/.local/share/opencode/auth.json`
2. Reads OpenAI multi-account tokens from `~/.config/opencode/openai-accounts.json` when available
3. Fetches usage APIs for each configured provider in parallel
4. Displays color-coded progress bars (green < 50%, yellow < 80%, red >= 80%)

## License

MIT
