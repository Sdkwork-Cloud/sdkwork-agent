import type { Skill } from '../types'
import './SkillPanel.css'

interface SkillPanelProps {
  skills: Skill[]
  selectedSkills: string[]
  onSelect: (skill: Skill) => void
  onClose: () => void
}

export function SkillPanel({
  skills,
  selectedSkills,
  onSelect,
  onClose,
}: SkillPanelProps) {
  // Group skills by category
  const groupedSkills = skills.reduce((acc, skill) => {
    const category = skill.metadata?.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(skill)
    return acc
  }, {} as Record<string, Skill[]>)

  // Category display names
  const categoryNames: Record<string, string> = {
    utility: '⚙️ Utilities',
    language: '🌐 Language',
    development: '💻 Development',
    Other: '📦 Other',
  }

  return (
    <div className="skill-panel-overlay" onClick={onClose}>
      <div className="skill-panel" onClick={(e) => e.stopPropagation()}>
        <div className="skill-panel-header">
          <div className="header-title">
            <span className="header-icon">🛠️</span>
            <h3>Select Skills</h3>
          </div>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="skill-panel-content">
          {Object.entries(groupedSkills).map(([category, categorySkills]) => (
            <div key={category} className="skill-category">
              <h4 className="category-title">{categoryNames[category] || category}</h4>
              <div className="skill-list">
                {categorySkills.map((skill) => (
                  <button
                    key={skill.name}
                    className={`skill-item ${
                      selectedSkills.includes(skill.name) ? 'selected' : ''
                    }`}
                    onClick={() => onSelect(skill)}
                    title={skill.description}
                  >
                    <div className="skill-icon">{skill.metadata?.icon || '🔧'}</div>
                    <div className="skill-info">
                      <div className="skill-name">{skill.name}</div>
                      <div className="skill-description">{skill.description}</div>
                      {skill.metadata?.tags && (
                        <div className="skill-tags">
                          {skill.metadata.tags.map((tag) => (
                            <span key={tag} className="tag">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="skill-check">
                      {selectedSkills.includes(skill.name) && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="skill-panel-footer">
          <div className="footer-left">
            <span className="skill-count">
              {selectedSkills.length > 0 
                ? `${selectedSkills.length} skill${selectedSkills.length > 1 ? 's' : ''} selected` 
                : 'No skills selected'}
            </span>
          </div>
          <div className="footer-right">
            <span className="skill-hint">
              Click to toggle skills
            </span>
            <button className="clear-all-btn" onClick={() => selectedSkills.forEach(name => {
              const skill = skills.find(s => s.name === name)
              if (skill) onSelect(skill)
            })}>
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
