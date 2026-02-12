import { getClaudeAuth } from "../auth.js";

interface UsageWindow {
  utilization: number;
  resets_at: string;
}

interface ExtraUsage {
  is_enabled: boolean;
  monthly_limit: number;
  used_credits: number;
  utilization: number;
}

interface ClaudeUsageResponse {
  five_hour: UsageWindow;
  seven_day: UsageWindow;
  seven_day_sonnet?: UsageWindow;
  seven_day_opus?: UsageWindow;
  extra_usage?: ExtraUsage;
}

export interface ClaudeUsage {
  fiveHour: { percent: number; resetsAt: Date };
  sevenDay: { percent: number; resetsAt: Date };
  sonnet?: { percent: number };
  opus?: { percent: number };
  extraUsage?: { enabled: boolean; used: number; limit: number };
}

export async function fetchClaudeUsage(): Promise<ClaudeUsage> {
  const auth = await getClaudeAuth();
  if (!auth) throw new Error("No Claude auth found");
  if (auth.expired) throw new Error("Claude token expired — re-authenticate with OpenCode");

  const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "anthropic-beta": "oauth-2025-04-20",
    },
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.status} ${res.statusText}`);

  const data: ClaudeUsageResponse = await res.json();

  return {
    fiveHour: {
      percent: data.five_hour.utilization,
      resetsAt: new Date(data.five_hour.resets_at),
    },
    sevenDay: {
      percent: data.seven_day.utilization,
      resetsAt: new Date(data.seven_day.resets_at),
    },
    sonnet: data.seven_day_sonnet
      ? { percent: data.seven_day_sonnet.utilization }
      : undefined,
    opus: data.seven_day_opus
      ? { percent: data.seven_day_opus.utilization }
      : undefined,
    extraUsage: data.extra_usage
      ? {
          enabled: data.extra_usage.is_enabled,
          used: data.extra_usage.used_credits / 100,
          limit: data.extra_usage.monthly_limit / 100,
        }
      : undefined,
  };
}
