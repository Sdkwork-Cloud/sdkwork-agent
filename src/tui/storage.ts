import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  name: string;
  messages: SessionMessage[];
  createdAt: number;
  updatedAt: number;
  model: string;
}

export interface HistoryEntry {
  input: string;
  timestamp: number;
}

export interface UsageStats {
  totalTokens: number;
  totalRequests: number;
  sessionsCount: number;
  commandsUsed: Record<string, number>;
  skillsUsed: Record<string, number>;
}

const CONFIG_DIR = join(homedir(), '.sdkwork');
const SESSIONS_DIR = join(CONFIG_DIR, 'sessions');
const HISTORY_FILE = join(CONFIG_DIR, 'history.json');
const AUTOSAVE_FILE = join(CONFIG_DIR, 'autosave.json');
const STATS_FILE = join(CONFIG_DIR, 'stats.json');

export class StorageManager {
  constructor() {
    this.ensureDirs();
  }

  private ensureDirs(): void {
    if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
    if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true });
  }

  readJSON<T>(path: string, defaultValue: T): T {
    try {
      if (existsSync(path)) {
        return JSON.parse(readFileSync(path, 'utf-8'));
      }
    } catch (error) {
      console.error(`Failed to read ${path}:`, error);
    }
    return defaultValue;
  }

  writeJSON<T>(path: string, data: T): boolean {
    try {
      this.ensureDirs();
      writeFileSync(path, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Failed to write ${path}:`, error);
      return false;
    }
  }

  history: {
    load: () => HistoryEntry[];
    save: (history: HistoryEntry[]) => void;
    add: (history: HistoryEntry[], input: string) => HistoryEntry[];
  } = {
    load: () => this.readJSON<HistoryEntry[]>(HISTORY_FILE, []),
    save: (history) => this.writeJSON(HISTORY_FILE, history),
    add: (history, input) => {
      const trimmed = history.slice(-999);
      trimmed.push({ input, timestamp: Date.now() });
      return trimmed;
    }
  };

  sessions: {
    loadAll: () => Session[];
    save: (session: Session) => void;
    delete: (sessionId: string) => void;
    getPath: (sessionId: string) => string;
  } = {
    loadAll: () => {
      try {
        if (!existsSync(SESSIONS_DIR)) return [];
        const files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
        return files
          .map(file => this.readJSON<Session>(join(SESSIONS_DIR, file), null as unknown as Session))
          .filter(Boolean)
          .sort((a, b) => b.updatedAt - a.updatedAt);
      } catch {
        return [];
      }
    },
    save: (session) => this.writeJSON(join(SESSIONS_DIR, `${session.id}.json`), session),
    delete: (sessionId) => {
      const path = join(SESSIONS_DIR, `${sessionId}.json`);
      if (existsSync(path)) unlinkSync(path);
    },
    getPath: (sessionId) => join(SESSIONS_DIR, `${sessionId}.json`)
  };

  autosave: {
    load: () => Session | null;
    save: (session: Session) => void;
  } = {
    load: () => this.readJSON<Session | null>(AUTOSAVE_FILE, null),
    save: (session) => this.writeJSON(AUTOSAVE_FILE, session)
  };

  stats: {
    load: () => UsageStats;
    save: (stats: UsageStats) => void;
  } = {
    load: () => this.readJSON<UsageStats>(STATS_FILE, {
      totalTokens: 0,
      totalRequests: 0,
      sessionsCount: 0,
      commandsUsed: {},
      skillsUsed: {}
    }),
    save: (stats) => this.writeJSON(STATS_FILE, stats)
  };

  cleanup(daysOld: number = 30): { sessionsDeleted: number } {
    const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    let sessionsDeleted = 0;
    
    try {
      const files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const session = this.readJSON<Session>(join(SESSIONS_DIR, file), null as unknown as Session);
        if (session && session.updatedAt < cutoff) {
          unlinkSync(join(SESSIONS_DIR, file));
          sessionsDeleted++;
        }
      }
    } catch {
      // Ignore cleanup errors
    }
    
    return { sessionsDeleted };
  }
}

export const storage = new StorageManager();
