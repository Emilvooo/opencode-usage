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

  ● Codex (team)
  Primary        ▊                     4%       resets 1h 15m
  Secondary      █▋                    8%       resets 5d 21h
    Credits      $0.00
──────────────────────────────────────────────────────────────
```

## Install

```bash
npm install -g @emilvooo/opencode-usage
```

## Usage

```bash
opencode-usage
```

That's it. Reads your OpenCode auth tokens automatically and fetches usage data in parallel.

## Supported providers

| Provider | Metrics |
|----------|---------|
| **Claude** (Anthropic) | 5h/7d usage windows, Sonnet/Opus breakdown, overage |
| **Codex** (OpenAI) | Primary/secondary quotas, plan type, credits |

## Requirements

- Node.js >= 18
- [OpenCode](https://opencode.ai) installed and authenticated with at least one provider

## How it works

1. Reads tokens from `~/.local/share/opencode/auth.json`
2. Fetches usage APIs for each configured provider in parallel
3. Displays color-coded progress bars (green < 50%, yellow < 80%, red >= 80%)

## License

MIT
