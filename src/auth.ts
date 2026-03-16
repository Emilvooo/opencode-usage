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

interface OpenAIMultiAccount {
  index?: number;
  email?: string;
  userId?: string;
  planType?: string;
  accountId?: string;
  access?: string;
  expires?: number;
}

interface OpenAIMultiAuthFile {
  version?: number;
  accounts?: OpenAIMultiAccount[];
  activeAccountIndex?: number;
  roundRobinCursor?: number;
}

export interface ClaudeAuth {
  accessToken: string;
  expired: boolean;
}

export interface CodexAuth {
  accessToken: string;
  index: number;
  accountId?: string;
  email?: string;
  planType?: string;
  active: boolean;
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

function getConfigPaths(file: string): string[] {
  const home = homedir();
  const paths = [join(home, ".config", "opencode", file)];

  if (process.env.XDG_CONFIG_HOME) {
    paths.unshift(join(process.env.XDG_CONFIG_HOME, "opencode", file));
  }

  return paths;
}

async function readJsonFile<T>(paths: string[]): Promise<T | null> {
  for (const path of paths) {
    try {
      const content = await readFile(path, "utf-8");
      return JSON.parse(content);
    } catch {
      continue;
    }
  }

  return null;
}

async function readAuthFile(): Promise<AuthFile> {
  const auth = await readJsonFile<AuthFile>(getAuthPaths());
  if (auth) return auth;

  throw new Error("No auth.json found. Is OpenCode installed and authenticated?");
}

async function readAuthFileOrNull(): Promise<AuthFile | null> {
  return readJsonFile<AuthFile>(getAuthPaths());
}

async function readOpenAIMultiAuthFile(): Promise<OpenAIMultiAuthFile | null> {
  return readJsonFile<OpenAIMultiAuthFile>(getConfigPaths("openai-accounts.json"));
}

function toCodexAuth(
  account: OpenAIMultiAccount,
  position: number,
  activeIndex?: number,
): CodexAuth | null {
  if (!account.access || typeof account.expires !== "number") return null;

  const index = typeof account.index === "number" ? account.index : position;
  const active = activeIndex === undefined
    ? position === 0
    : activeIndex === position || activeIndex === index;

  return {
    accessToken: account.access,
    index,
    accountId: account.accountId,
    email: account.email,
    planType: account.planType,
    active,
    expired: Date.now() > account.expires,
  };
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
  const auth = await readAuthFileOrNull();
  if (!auth) return null;

  const entry = auth.openai;
  if (!entry || entry.type !== "oauth") return null;

  return {
    accessToken: entry.access,
    index: 0,
    accountId: (entry as OAuthAuth).accountId,
    active: true,
    expired: Date.now() > entry.expires,
  };
}

export async function getCodexAuths(): Promise<CodexAuth[]> {
  const multiAuth = await readOpenAIMultiAuthFile();
  const multiAccounts =
    multiAuth?.accounts
      ?.map((account, position) =>
        toCodexAuth(account, position, multiAuth.activeAccountIndex),
      )
      .filter((account): account is CodexAuth => account !== null) ?? [];

  if (multiAccounts.length > 0) return multiAccounts;

  const singleAuth = await getCodexAuth();
  return singleAuth ? [singleAuth] : [];
}
