import { homedir } from "os";
import { join } from "path";
import { readFile } from "fs/promises";

interface OAuthAuth {
  type: "oauth";
  refresh: string;
  access: string;
  expires: number;
  accountId?: string;
}

interface ApiAuth {
  type: "api";
  key: string;
}

type AuthEntry = OAuthAuth | ApiAuth;

interface AuthFile {
  anthropic?: AuthEntry;
  openai?: AuthEntry;
  [key: string]: AuthEntry | undefined;
}

export interface ClaudeAuth {
  accessToken: string;
  expired: boolean;
}

export interface CodexAuth {
  accessToken: string;
  accountId?: string;
  expired: boolean;
}

function getAuthPaths(): string[] {
  const home = homedir();
  const paths = [
    join(home, ".local", "share", "opencode", "auth.json"),
    join(home, "Library", "Application Support", "opencode", "auth.json"),
  ];

  if (process.env.XDG_DATA_HOME) {
    paths.unshift(join(process.env.XDG_DATA_HOME, "opencode", "auth.json"));
  }

  return paths;
}

async function readAuthFile(): Promise<AuthFile> {
  for (const path of getAuthPaths()) {
    try {
      const content = await readFile(path, "utf-8");
      return JSON.parse(content);
    } catch {
      continue;
    }
  }
  throw new Error("No auth.json found. Is OpenCode installed and authenticated?");
}

export async function getClaudeAuth(): Promise<ClaudeAuth | null> {
  const auth = await readAuthFile();
  const entry = auth.anthropic;
  if (!entry || entry.type !== "oauth") return null;

  return {
    accessToken: entry.access,
    expired: Date.now() > entry.expires,
  };
}

export async function getCodexAuth(): Promise<CodexAuth | null> {
  const auth = await readAuthFile();
  const entry = auth.openai;
  if (!entry || entry.type !== "oauth") return null;

  return {
    accessToken: entry.access,
    accountId: (entry as OAuthAuth).accountId,
    expired: Date.now() > entry.expires,
  };
}
