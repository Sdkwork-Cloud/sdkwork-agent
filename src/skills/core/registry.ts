/**
 * Unified Skill Registry
 *
 * Single implementation replacing the duplicate registry.ts and skill-registry.ts
 */

import { EventEmitter } from '../../utils/event-emitter';
import {
  Skill,
  ISkillRegistry,
  SkillIndex,
  SkillEvent,
  isValidSkillName,
} from './types.js';

/**
 * Configuration for SkillRegistry
 */
export interface RegistryConfig {
  /** Enable indexing for fast search */
  enableIndexing?: boolean;
  /** Enable caching of skills */
  enableCaching?: boolean;
  /** Max cache size */
  maxCacheSize?: number;
}

/**
 * Cached skill entry
 */
interface CachedSkill {
  skill: Skill;
  loadedAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

/**
 * Unified Skill Registry Implementation
 *
 * Features:
 * - Single source of truth for skill registration
 * - Fast indexing by name, category, and tags
 * - Event-driven architecture
 * - Validation on registration
 */
export class SkillRegistry extends EventEmitter implements ISkillRegistry {
  private skills = new Map<string, CachedSkill>();
  private index: SkillIndex = {
    byName: new Map(),
    byCategory: new Map(),
    byTag: new Map(),
  };
  private config: Required<RegistryConfig>;

  constructor(config: RegistryConfig = {}) {
    super();
    this.config = {
      enableIndexing: true,
      enableCaching: true,
      maxCacheSize: 100,
      ...config,
    };
  }

  /**
   * Register a skill
   * @param skill - The skill to register
   * @throws Error if skill is invalid or already registered
   */
  register(skill: Skill): void {
    // Validate skill
    this.validateSkill(skill);

    // Check for duplicates
    if (this.skills.has(skill.name)) {
      throw new Error(`Skill "${skill.name}" is already registered`);
    }

    // Create cached entry
    const cached: CachedSkill = {
      skill,
      loadedAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
    };

    // Store skill
    this.skills.set(skill.name, cached);

    // Update index
    if (this.config.enableIndexing) {
      this.updateIndex(skill);
    }

    // Emit event
    this.emit('skill:registered', {
      type: 'skill:registered',
      timestamp: new Date(),
      skillName: skill.name,
      data: { version: skill.version },
    } as SkillEvent);
  }

  /**
   * Unregister a skill
   * @param name - Name of the skill to unregister
   * @returns true if skill was found and removed
   */
  unregister(name: string): boolean {
    const cached = this.skills.get(name);
    if (!cached) {
      return false;
    }

    // Remove from storage
    this.skills.delete(name);

    // Remove from index
    if (this.config.enableIndexing) {
      this.removeFromIndex(name, cached.skill);
    }

    // Emit event
    this.emit('skill:unregistered', {
      type: 'skill:unregistered',
      timestamp: new Date(),
      skillName: name,
    } as SkillEvent);

    return true;
  }

  /**
   * Get a skill by name
   * @param name - Skill name
   * @returns The skill or undefined if not found
   */
  get(name: string): Skill | undefined {
    const cached = this.skills.get(name);
    if (!cached) {
      return undefined;
    }

    // Update access stats
    cached.lastAccessed = new Date();
    cached.accessCount++;

    return cached.skill;
  }

  /**
   * Check if a skill exists
   * @param name - Skill name
   * @returns true if skill exists
   */
  has(name: string): boolean {
    return this.skills.has(name);
  }

  /**
   * List all registered skills
   * @returns Array of all skills
   */
  list(): Skill[] {
    return Array.from(this.skills.values()).map(cached => cached.skill);
  }

  /**
   * Search skills by query string
   * Searches in name, description, and tags
   * @param query - Search query
   * @returns Array of matching skills
   */
  search(query: string): Skill[] {
    const lowerQuery = query.toLowerCase();
    const results: Skill[] = [];
    const seen = new Set<string>();

    // Search by name (exact match priority)
    Array.from(this.skills.entries()).forEach(([name, cached]) => {
      if (name.toLowerCase().includes(lowerQuery)) {
        results.push(cached.skill);
        seen.add(name);
      }
    });

    // Search by description
    Array.from(this.skills.values()).forEach((cached) => {
      if (seen.has(cached.skill.name)) return;

      if (cached.skill.description.toLowerCase().includes(lowerQuery)) {
        results.push(cached.skill);
        seen.add(cached.skill.name);
      }
    });

    return results;
  }

  /**
   * Get skills by category
   * @param category - Category name
   * @returns Array of skills in the category
   */
  getByCategory(category: string): Skill[] {
    if (!this.config.enableIndexing) {
      // Fallback: linear search
      return this.list().filter(skill => {
        return skill.metadata?.category === category;
      });
    }

    const skillNames = this.index.byCategory.get(category);
    if (!skillNames) {
      return [];
    }

    return Array.from(skillNames)
      .map(name => this.skills.get(name)?.skill)
      .filter((skill): skill is Skill => skill !== undefined);
  }

  /**
   * Get skills by tag
   * @param tag - Tag name
   * @returns Array of skills with the tag
   */
  getByTag(tag: string): Skill[] {
    if (!this.config.enableIndexing) {
      // Fallback: linear search
      return this.list().filter(skill => {
        const tags = skill.metadata?.tags;
        return Array.isArray(tags) && tags.includes(tag);
      });
    }

    const skillNames = this.index.byTag.get(tag);
    if (!skillNames) {
      return [];
    }

    return Array.from(skillNames)
      .map(name => this.skills.get(name)?.skill)
      .filter((skill): skill is Skill => skill !== undefined);
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalSkills: number;
    totalCategories: number;
    totalTags: number;
    mostAccessed: string[];
  } {
    const sortedByAccess = Array.from(this.skills.entries())
      .sort((a, b) => b[1].accessCount - a[1].accessCount)
      .slice(0, 5)
      .map(([name]) => name);

    return {
      totalSkills: this.skills.size,
      totalCategories: this.index.byCategory.size,
      totalTags: this.index.byTag.size,
      mostAccessed: sortedByAccess,
    };
  }

  /**
   * Clear all registered skills
   */
  clear(): void {
    this.skills.clear();
    this.index = {
      byName: new Map(),
      byCategory: new Map(),
      byTag: new Map(),
    };
  }

  /**
   * Validate a skill before registration
   */
  private validateSkill(skill: Skill): void {
    // Validate name format
    if (!isValidSkillName(skill.name)) {
      throw new Error(
        `Invalid skill name "${skill.name}". Must be 1-64 chars, lowercase letters/numbers/hyphens only.`
      );
    }

    // Validate description
    if (!skill.description || skill.description.length < 1) {
      throw new Error('Skill description is required');
    }

    if (skill.description.length > 1024) {
      throw new Error('Skill description must be 1-1024 characters');
    }

    // Validate version
    if (!skill.version) {
      throw new Error('Skill version is required');
    }

    // Validate inputSchema
    if (!skill.inputSchema) {
      throw new Error('Skill inputSchema is required');
    }

    // Validate execute method
    if (typeof skill.execute !== 'function') {
      throw new Error('Skill must have an execute method');
    }
  }

  /**
   * Update search index
   */
  private updateIndex(skill: Skill): void {
    // Index by name
    this.index.byName.set(skill.name, skill.name);

    // Index by category (if available)
    const category = skill.metadata?.category;
    if (category) {
      if (!this.index.byCategory.has(category)) {
        this.index.byCategory.set(category, new Set());
      }
      this.index.byCategory.get(category)!.add(skill.name);
    }

    // Index by tags (if available)
    const tags = skill.metadata?.tags;
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        if (!this.index.byTag.has(tag)) {
          this.index.byTag.set(tag, new Set());
        }
        this.index.byTag.get(tag)!.add(skill.name);
      }
    }
  }

  /**
   * Remove from index
   */
  private removeFromIndex(name: string, skill: Skill): void {
    this.index.byName.delete(name);

    const category = skill.metadata?.category;
    if (category) {
      this.index.byCategory.get(category)?.delete(name);
    }

    const tags = skill.metadata?.tags;
    if (Array.isArray(tags)) {
      for (const tag of tags) {
        this.index.byTag.get(tag)?.delete(name);
      }
    }
  }
}

/**
 * Create a new SkillRegistry instance
 */
export function createSkillRegistry(config?: RegistryConfig): SkillRegistry {
  return new SkillRegistry(config);
}

/**
 * Global registry singleton (optional)
 */
let globalRegistry: SkillRegistry | null = null;

/**
 * Get or create global registry
 */
export function getGlobalRegistry(): SkillRegistry {
  if (!globalRegistry) {
    globalRegistry = new SkillRegistry();
  }
  return globalRegistry;
}

/**
 * Reset global registry (mainly for testing)
 */
export function resetGlobalRegistry(): void {
  globalRegistry = null;
}
