import { getCodexAuth } from "../auth.js";

interface RateWindow {
  used_percent: number;
  limit_window_seconds: number;
  reset_after_seconds: number;
  reset_at: number;
}

interface CodexResponse {
  plan_type: string;
  rate_limit: {
    allowed: boolean;
    limit_reached: boolean;
    primary_window: RateWindow;
    secondary_window?: RateWindow;
  };
  credits?: {
    has_credits: boolean;
    unlimited: boolean;
    balance: string | number;
  };
}

export interface CodexUsage {
  planType: string;
  primary: { percent: number; resetsAt: Date };
  secondary?: { percent: number; resetsAt: Date };
  credits?: { balance: number; unlimited: boolean };
}

export async function fetchCodexUsage(): Promise<CodexUsage> {
  const auth = await getCodexAuth();
  if (!auth) throw new Error("No Codex auth found");
  if (auth.expired) throw new Error("Codex token expired — re-authenticate with OpenCode");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
  };
  if (auth.accountId) {
    headers["ChatGPT-Account-Id"] = auth.accountId;
  }

  const res = await fetch("https://chatgpt.com/backend-api/wham/usage", { headers });

  if (!res.ok) throw new Error(`Codex API error: ${res.status} ${res.statusText}`);

  const data: CodexResponse = await res.json();

  const primary = data.rate_limit.primary_window;
  const secondary = data.rate_limit.secondary_window;

  return {
    planType: data.plan_type,
    primary: {
      percent: primary.used_percent,
      resetsAt: new Date(Date.now() + primary.reset_after_seconds * 1000),
    },
    secondary: secondary
      ? {
          percent: secondary.used_percent,
          resetsAt: new Date(Date.now() + secondary.reset_after_seconds * 1000),
        }
      : undefined,
    credits: data.credits
      ? {
          balance: Number(data.credits.balance) || 0,
          unlimited: data.credits.unlimited,
        }
      : undefined,
  };
}
