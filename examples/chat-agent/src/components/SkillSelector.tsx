import { useState } from 'react'
import type { Skill, SkillMatch } from '../types'
import './SkillSelector.css'

interface SkillSelectorProps {
  availableSkills: Skill[]
  selectedSkills: string[]
  matchedSkills: SkillMatch[]
  isSmartMode: boolean
  onToggleSmartMode: () => void
  onToggleSkill: (skillName: string) => void
  onClearSelection: () => void
}

export function SkillSelector({
  availableSkills,
  selectedSkills,
  matchedSkills,
  isSmartMode,
  onToggleSmartMode,
  onToggleSkill,
  onClearSelection,
}: SkillSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [filter, setFilter] = useState('')

  // Group skills by category
  const groupedSkills = availableSkills.reduce((acc, skill) => {
    const category = skill.metadata?.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(skill)
    return acc
  }, {} as Record<string, Skill[]>)

  const categoryOrder = ['utility', 'language', 'development', 'film', 'other']
  const categoryLabels: Record<string, string> = {
    utility: '工具',
    language: '语言',
    development: '开发',
    film: '影视',
    other: '其他',
  }

  const filteredSkills = filter
    ? availableSkills.filter(
        skill =>
          skill.name.toLowerCase().includes(filter.toLowerCase()) ||
          skill.description.toLowerCase().includes(filter.toLowerCase())
      )
    : null

  const selectedCount = selectedSkills.length
  const matchedCount = matchedSkills.length
  const totalActiveCount = isSmartMode 
    ? new Set([...selectedSkills, ...matchedSkills.map(m => m.skill.name)]).size
    : selectedCount

  return (
    <div className="skill-selector">
      <div className="skill-selector-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="skill-selector-title">
          <span className="skill-icon">🔧</span>
          <span>Skills</span>
          {totalActiveCount > 0 && (
            <span className="skill-count">{totalActiveCount}</span>
          )}
        </div>
        <div className="skill-selector-actions">
          {/* Smart Mode Toggle */}
          <button
            className={`smart-mode-toggle ${isSmartMode ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggleSmartMode()
            }}
            title={isSmartMode ? '智能模式已开启' : '点击开启智能模式'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            <span>智能</span>
          </button>
          
          {selectedCount > 0 && (
            <button
              className="clear-skills-btn"
              onClick={(e) => {
                e.stopPropagation()
                onClearSelection()
              }}
              title="Clear all"
            >
              ✕
            </button>
          )}
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
        </div>
      </div>

      {/* Smart Mode Indicator */}
      {isSmartMode && matchedCount > 0 && (
        <div className="smart-matches-preview">
          <div className="smart-matches-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
            </svg>
            智能匹配
          </div>
          <div className="smart-matches-list">
            {matchedSkills.slice(0, 3).map((match) => (
              <span 
                key={match.skill.name} 
                className="smart-match-tag"
                title={`匹配度: ${(match.score * 100).toFixed(0)}%`}
              >
                {match.skill.metadata?.icon || '🔧'} {match.skill.name}
                <span className="match-score">{(match.score * 100).toFixed(0)}%</span>
              </span>
            ))}
            {matchedCount > 3 && (
              <span className="smart-match-more">+{matchedCount - 3}</span>
            )}
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="skill-selector-dropdown">
          {/* Smart Mode Banner */}
          <div className={`smart-mode-banner ${isSmartMode ? 'active' : ''}`}>
            <div className="smart-mode-info">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
              <div>
                <div className="smart-mode-title">智能 Skill 选择</div>
                <div className="smart-mode-desc">
                  {isSmartMode 
                    ? '根据您的输入自动匹配相关技能' 
                    : '开启后自动根据输入推荐技能'}
                </div>
              </div>
            </div>
            <button 
              className={`smart-mode-switch ${isSmartMode ? 'active' : ''}`}
              onClick={onToggleSmartMode}
            >
              {isSmartMode ? '已开启' : '开启'}
            </button>
          </div>

          <div className="skill-search">
            <input
              type="text"
              placeholder="Search skills..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="skill-search-input"
            />
          </div>

          <div className="skill-list">
            {filteredSkills ? (
              // Show filtered results
              filteredSkills.length > 0 ? (
                filteredSkills.map((skill) => (
                  <SkillItem
                    key={skill.name}
                    skill={skill}
                    isSelected={selectedSkills.includes(skill.name)}
                    isAutoMatched={isSmartMode && matchedSkills.some(m => m.skill.name === skill.name)}
                    onToggle={() => onToggleSkill(skill.name)}
                  />
                ))
              ) : (
                <div className="no-skills">No skills found</div>
              )
            ) : (
              // Show grouped skills
              categoryOrder.map(
                (category) =>
                  groupedSkills[category]?.length > 0 && (
                    <div key={category} className="skill-category">
                      <div className="skill-category-title">
                        {categoryLabels[category] || category}
                      </div>
                      <div className="skill-category-items">
                        {groupedSkills[category].map((skill) => (
                          <SkillItem
                            key={skill.name}
                            skill={skill}
                            isSelected={selectedSkills.includes(skill.name)}
                            isAutoMatched={isSmartMode && matchedSkills.some(m => m.skill.name === skill.name)}
                            onToggle={() => onToggleSkill(skill.name)}
                          />
                        ))}
                      </div>
                    </div>
                  )
              )
            )}
          </div>

          {selectedCount > 0 && (
            <div className="selected-skills-preview">
              <div className="selected-label">已选择:</div>
              <div className="selected-tags">
                {selectedSkills.map((skillName) => {
                  const skill = availableSkills.find((s) => s.name === skillName)
                  return (
                    <span key={skillName} className="selected-tag">
                      {skill?.metadata?.icon || '🔧'} {skillName}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {!isExpanded && totalActiveCount > 0 && (
        <div className="skill-selector-preview">
          {/* Manual selected skills */}
          {selectedSkills.slice(0, 2).map((skillName) => {
            const skill = availableSkills.find((s) => s.name === skillName)
            return (
              <span key={skillName} className="skill-tag manual" title={skill?.description}>
                {skill?.metadata?.icon || '🔧'}
              </span>
            )
          })}
          
          {/* Auto matched skills */}
          {isSmartMode && matchedSkills.slice(0, 2).map((match) => (
            <span 
              key={match.skill.name} 
              className="skill-tag auto" 
              title={`智能匹配: ${match.skill.description}`}
            >
              <span className="auto-indicator">✦</span>
              {match.skill.metadata?.icon || '🔧'}
            </span>
          ))}
          
          {totalActiveCount > 4 && (
            <span className="skill-tag more">+{totalActiveCount - 4}</span>
          )}
        </div>
      )}
    </div>
  )
}

interface SkillItemProps {
  skill: Skill
  isSelected: boolean
  isAutoMatched: boolean
  onToggle: () => void
}

function SkillItem({ skill, isSelected, isAutoMatched, onToggle }: SkillItemProps) {
  return (
    <div
      className={`skill-item ${isSelected ? 'selected' : ''} ${isAutoMatched ? 'auto-matched' : ''}`}
      onClick={onToggle}
      title={skill.description}
    >
      <div className="skill-item-checkbox">
        {isSelected ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        )}
      </div>
      <div className="skill-item-icon">{skill.metadata?.icon || '🔧'}</div>
      <div className="skill-item-info">
        <div className="skill-item-name">
          {skill.name}
          {isAutoMatched && (
            <span className="auto-match-badge" title="智能匹配">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
              </svg>
            </span>
          )}
        </div>
        <div className="skill-item-desc">{skill.description.slice(0, 60)}...</div>
      </div>
    </div>
  )
}
