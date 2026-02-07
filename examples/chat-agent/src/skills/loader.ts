import type { Skill } from '../types'

// Dynamic skill loader
// Supports loading skills from various sources

export interface SkillLoadResult {
  success: boolean
  skill?: Skill
  error?: string
}

export interface SkillSource {
  name: string
  type: 'url' | 'json' | 'markdown' | 'module'
  content?: string
  url?: string
  module?: () => Promise<{ default: Skill }>
}

// Parse skill from Markdown format (similar to main SDK)
export function parseSkillFromMarkdown(markdown: string): SkillLoadResult {
  try {
    // Extract YAML frontmatter
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) {
      return { success: false, error: 'No YAML frontmatter found' }
    }

    const yamlContent = frontmatterMatch[1]
    const skill = parseYamlFrontmatter(yamlContent)

    // Extract body content as description if needed
    const bodyContent = markdown.slice(frontmatterMatch[0].length).trim()
    if (!skill.description && bodyContent) {
      // Use first paragraph as description
      const firstParagraph = bodyContent.split('\n\n')[0].replace(/^#+\s*/, '')
      skill.description = firstParagraph.slice(0, 200)
    }

    return { success: true, skill }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse markdown',
    }
  }
}

// Parse YAML frontmatter (simplified)
function parseYamlFrontmatter(yaml: string): Skill {
  const skill: Partial<Skill> = {
    parameters: {
      type: 'object',
      properties: {},
    },
  }

  const lines = yaml.split('\n')
  let inMetadata = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Simple key-value parsing
    if (trimmed.startsWith('name:')) {
      skill.name = trimmed.slice(5).trim()
    } else if (trimmed.startsWith('description:')) {
      skill.description = trimmed.slice(12).trim()
    } else if (trimmed === 'metadata:') {
      inMetadata = true
      skill.metadata = {}
    } else if (inMetadata && trimmed.startsWith('category:')) {
      skill.metadata!.category = trimmed.slice(9).trim()
    } else if (inMetadata && trimmed.startsWith('tags:')) {
      const tagsStr = trimmed.slice(5).trim()
      skill.metadata!.tags = tagsStr.split(/\s+/)
    } else if (inMetadata && trimmed.startsWith('icon:')) {
      skill.metadata!.icon = trimmed.slice(5).trim()
    } else if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-')) {
      // End of metadata section
      if (inMetadata && !line.startsWith(' ')) {
        inMetadata = false
      }
    }
  }

  return skill as Skill
}

// Parse skill from JSON
export function parseSkillFromJSON(json: string): SkillLoadResult {
  try {
    const skill = JSON.parse(json) as Skill

    if (!skill.name) {
      return { success: false, error: 'Skill must have a name' }
    }

    return { success: true, skill }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
    }
  }
}

// Load skill from URL
export async function loadSkillFromURL(url: string): Promise<SkillLoadResult> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status}`,
      }
    }

    const content = await response.text()

    // Determine format from content or URL
    if (url.endsWith('.md') || content.startsWith('---')) {
      return parseSkillFromMarkdown(content)
    } else if (url.endsWith('.json')) {
      return parseSkillFromJSON(content)
    } else {
      // Try markdown first, then JSON
      const markdownResult = parseSkillFromMarkdown(content)
      if (markdownResult.success) {
        return markdownResult
      }
      return parseSkillFromJSON(content)
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load skill',
    }
  }
}

// Load skill from module
export async function loadSkillFromModule(
  moduleLoader: () => Promise<{ default: Skill }>
): Promise<SkillLoadResult> {
  try {
    const module = await moduleLoader()
    const skill = module.default

    if (!skill.name) {
      return { success: false, error: 'Module skill must have a name' }
    }

    return { success: true, skill }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load module',
    }
  }
}

// Skill loader manager
class SkillLoader {
  private loadedSkills: Map<string, Skill> = new Map()
  private loadingPromises: Map<string, Promise<SkillLoadResult>> = new Map()

  // Load a skill from any source
  async load(source: SkillSource): Promise<SkillLoadResult> {
    const cacheKey = `${source.type}:${source.name}`

    // Check if already loaded
    if (this.loadedSkills.has(source.name)) {
      return {
        success: true,
        skill: this.loadedSkills.get(source.name),
      }
    }

    // Check if currently loading
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!
    }

    // Start loading
    const loadPromise = this.doLoad(source)
    this.loadingPromises.set(cacheKey, loadPromise)

    const result = await loadPromise

    if (result.success && result.skill) {
      this.loadedSkills.set(source.name, result.skill)
    }

    this.loadingPromises.delete(cacheKey)
    return result
  }

  private async doLoad(source: SkillSource): Promise<SkillLoadResult> {
    switch (source.type) {
      case 'url':
        if (!source.url) {
          return { success: false, error: 'URL not provided' }
        }
        return loadSkillFromURL(source.url)

      case 'json':
        if (!source.content) {
          return { success: false, error: 'JSON content not provided' }
        }
        return parseSkillFromJSON(source.content)

      case 'markdown':
        if (!source.content) {
          return { success: false, error: 'Markdown content not provided' }
        }
        return parseSkillFromMarkdown(source.content)

      case 'module':
        if (!source.module) {
          return { success: false, error: 'Module loader not provided' }
        }
        return loadSkillFromModule(source.module)

      default:
        return { success: false, error: `Unknown source type: ${source.type}` }
    }
  }

  // Get a loaded skill
  get(name: string): Skill | undefined {
    return this.loadedSkills.get(name)
  }

  // Get all loaded skills
  getAll(): Skill[] {
    return Array.from(this.loadedSkills.values())
  }

  // Unload a skill
  unload(name: string): boolean {
    return this.loadedSkills.delete(name)
  }

  // Clear all loaded skills
  clear(): void {
    this.loadedSkills.clear()
    this.loadingPromises.clear()
  }

  // Check if a skill is loaded
  isLoaded(name: string): boolean {
    return this.loadedSkills.has(name)
  }
}

// Export singleton instance
export const skillLoader = new SkillLoader()

// Export class for custom instances
export { SkillLoader }
