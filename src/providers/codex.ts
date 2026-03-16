import { getCodexAuths, type CodexAuth } from "../auth.js";

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
  account: {
    index: number;
    email?: string;
    planType?: string;
    active: boolean;
  };
  planType: string;
  primary: { percent: number; resetsAt: Date };
  secondary?: { percent: number; resetsAt: Date };
  credits?: { balance: number; unlimited: boolean };
}

export interface CodexUsageError {
  account: {
    index: number;
    email?: string;
    planType?: string;
    active: boolean;
  };
  error: string;
}

export type CodexUsageEntry = CodexUsage | CodexUsageError;

function toCodexAccount(auth: CodexAuth) {
  return {
    index: auth.index,
    email: auth.email,
    planType: auth.planType,
    active: auth.active,
  };
}

async function fetchCodexUsage(auth: CodexAuth): Promise<CodexUsage> {
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
    account: toCodexAccount(auth),
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

export async function fetchCodexUsages(): Promise<CodexUsageEntry[]> {
  const auths = await getCodexAuths();
  if (auths.length === 0) throw new Error("No Codex auth found");

  const results = await Promise.allSettled(auths.map((auth) => fetchCodexUsage(auth)));

  return results.map((result, index) => {
    if (result.status === "fulfilled") return result.value;

    return {
      account: toCodexAccount(auths[index]),
      error: result.reason instanceof Error ? result.reason.message : "Unknown error",
    };
  });
}
