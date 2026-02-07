import { useState, useCallback } from 'react'
import type { Skill } from '../types'
import { skillLoader, parseSkillFromMarkdown, parseSkillFromJSON } from '../skills'
import './SkillLoader.css'

interface SkillLoaderProps {
  onSkillLoaded?: (skill: Skill) => void
  onClose: () => void
}

export function SkillLoaderPanel({ onSkillLoaded, onClose }: SkillLoaderProps) {
  const [activeTab, setActiveTab] = useState<'url' | 'json' | 'markdown'>('url')
  const [url, setUrl] = useState('')
  const [jsonContent, setJsonContent] = useState('')
  const [markdownContent, setMarkdownContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedSkill, setLoadedSkill] = useState<Skill | null>(null)

  const handleLoadFromURL = useCallback(async () => {
    if (!url.trim()) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await skillLoader.load({
        name: 'dynamic-url-skill',
        type: 'url',
        url: url.trim(),
      })
      
      if (result.success && result.skill) {
        setLoadedSkill(result.skill)
        onSkillLoaded?.(result.skill)
      } else {
        setError(result.error || 'Failed to load skill')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [url, onSkillLoaded])

  const handleLoadFromJSON = useCallback(() => {
    if (!jsonContent.trim()) return
    
    setError(null)
    const result = parseSkillFromJSON(jsonContent)
    
    if (result.success && result.skill) {
      setLoadedSkill(result.skill)
      skillLoader.load({
        name: result.skill.name,
        type: 'json',
        content: jsonContent,
      })
      onSkillLoaded?.(result.skill)
    } else {
      setError(result.error || 'Failed to parse JSON')
    }
  }, [jsonContent, onSkillLoaded])

  const handleLoadFromMarkdown = useCallback(() => {
    if (!markdownContent.trim()) return
    
    setError(null)
    const result = parseSkillFromMarkdown(markdownContent)
    
    if (result.success && result.skill) {
      setLoadedSkill(result.skill)
      skillLoader.load({
        name: result.skill.name,
        type: 'markdown',
        content: markdownContent,
      })
      onSkillLoaded?.(result.skill)
    } else {
      setError(result.error || 'Failed to parse Markdown')
    }
  }, [markdownContent, onSkillLoaded])

  const handleLoad = () => {
    switch (activeTab) {
      case 'url':
        handleLoadFromURL()
        break
      case 'json':
        handleLoadFromJSON()
        break
      case 'markdown':
        handleLoadFromMarkdown()
        break
    }
  }

  return (
    <div className="skill-loader-overlay" onClick={onClose}>
      <div className="skill-loader-panel" onClick={(e) => e.stopPropagation()}>
        <div className="skill-loader-header">
          <h3>Load Custom Skill</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="skill-loader-tabs">
          <button
            className={`tab ${activeTab === 'url' ? 'active' : ''}`}
            onClick={() => setActiveTab('url')}
          >
            From URL
          </button>
          <button
            className={`tab ${activeTab === 'json' ? 'active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            From JSON
          </button>
          <button
            className={`tab ${activeTab === 'markdown' ? 'active' : ''}`}
            onClick={() => setActiveTab('markdown')}
          >
            From Markdown
          </button>
        </div>

        <div className="skill-loader-content">
          {activeTab === 'url' && (
            <div className="input-group">
              <label>Skill URL</label>
              <input
                type="url"
                placeholder="https://example.com/skill.md or .json"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="hint">Supports .md (Markdown) and .json formats</p>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="input-group">
              <label>Skill JSON</label>
              <textarea
                placeholder={`{\n  "name": "my-skill",\n  "description": "A custom skill",\n  "parameters": {\n    "type": "object",\n    "properties": {}\n  }\n}`}
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                rows={10}
              />
            </div>
          )}

          {activeTab === 'markdown' && (
            <div className="input-group">
              <label>Skill Markdown</label>
              <textarea
                placeholder={`---\nname: my-skill\ndescription: A custom skill\nmetadata:\n  category: custom\n  tags: [tag1, tag2]\n  icon: 🔧\n---\n\n# My Skill\n\nDescription here...`}
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
                rows={10}
              />
            </div>
          )}

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          {loadedSkill && (
            <div className="success-message">
              <div className="loaded-skill">
                <span className="skill-icon">{loadedSkill.metadata?.icon || '🔧'}</span>
                <div className="skill-info">
                  <div className="skill-name">{loadedSkill.name}</div>
                  <div className="skill-description">{loadedSkill.description}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="skill-loader-footer">
          <button
            className="load-button"
            onClick={handleLoad}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load Skill'}
          </button>
        </div>
      </div>
    </div>
  )
}
