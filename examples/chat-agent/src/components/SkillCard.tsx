import { useState } from 'react'
import type { Skill } from '../types'
import './SkillCard.css'

interface SkillCardProps {
  skill: Skill
  onClick?: () => void
}

// 获取技能类别对应的颜色
function getCategoryColor(category?: string): string {
  const colors: Record<string, string> = {
    utility: '#10b981',    // 绿色
    language: '#3b82f6',   // 蓝色
    development: '#8b5cf6', // 紫色
    film: '#f59e0b',       // 橙色
    other: '#6b7280',      // 灰色
  }
  return colors[category || 'other'] || colors.other
}

export function SkillCard({ skill, onClick }: SkillCardProps) {
  const categoryColor = getCategoryColor(skill.metadata?.category)
  
  return (
    <div 
      className="skill-card" 
      onClick={onClick}
      style={{ '--skill-color': categoryColor } as React.CSSProperties}
    >
      <div className="skill-card-glow" style={{ background: categoryColor }} />
      <div className="skill-card-content">
        <span className="skill-card-icon">{skill.metadata?.icon || '🔧'}</span>
        <span className="skill-card-name">{skill.name}</span>
        <svg className="skill-card-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>
    </div>
  )
}

interface SkillCardsListProps {
  skills: Skill[]
}

export function SkillCardsList({ skills }: SkillCardsListProps) {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)

  if (skills.length === 0) return null

  return (
    <>
      <div className="skill-cards-section">
        <div className="skill-cards-header">
          <div className="skill-cards-line" />
          <span className="skill-cards-label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            使用的技能
          </span>
          <div className="skill-cards-line" />
        </div>
        <div className="skill-cards-container">
          {skills.map((skill) => (
            <SkillCard
              key={skill.name}
              skill={skill}
              onClick={() => setSelectedSkill(skill)}
            />
          ))}
        </div>
      </div>

      {selectedSkill && (
        <SkillDetailModal
          skill={selectedSkill}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </>
  )
}

interface SkillDetailModalProps {
  skill: Skill
  onClose: () => void
}

function SkillDetailModal({ skill, onClose }: SkillDetailModalProps) {
  const categoryColor = getCategoryColor(skill.metadata?.category)
  const categoryLabels: Record<string, string> = {
    utility: '工具',
    language: '语言',
    development: '开发',
    film: '影视',
    other: '其他',
  }

  return (
    <div className="skill-modal-overlay" onClick={onClose}>
      <div className="skill-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header with gradient */}
        <div className="skill-modal-header" style={{ 
          background: `linear-gradient(135deg, ${categoryColor}20, ${categoryColor}05)` ,
          borderBottom: `2px solid ${categoryColor}40`
        }}>
          <div className="skill-modal-icon-wrapper" style={{ 
            background: `${categoryColor}20`,
            border: `2px solid ${categoryColor}40`
          }}>
            <span className="skill-modal-icon">{skill.metadata?.icon || '🔧'}</span>
          </div>
          <div className="skill-modal-title">
            <h3>{skill.name}</h3>
            {skill.metadata?.category && (
              <span 
                className="skill-category-badge"
                style={{ 
                  background: `${categoryColor}20`,
                  color: categoryColor,
                  border: `1px solid ${categoryColor}40`
                }}
              >
                {categoryLabels[skill.metadata.category] || skill.metadata.category}
              </span>
            )}
          </div>
          <button className="skill-modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="skill-modal-content">
          {/* Description */}
          <div className="skill-section">
            <div className="skill-section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <h4>功能描述</h4>
            </div>
            <p className="skill-description">{skill.description}</p>
          </div>

          {/* Parameters */}
          {skill.parameters && Object.keys(skill.parameters.properties).length > 0 && (
            <div className="skill-section">
              <div className="skill-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                <h4>参数说明</h4>
              </div>
              <div className="skill-parameters">
                {Object.entries(skill.parameters.properties).map(([key, value]) => (
                  <div key={key} className="skill-parameter">
                    <div className="skill-parameter-header">
                      <code className="skill-parameter-name">{key}</code>
                      <span className="skill-parameter-type">{value.type}</span>
                      {skill.parameters?.required?.includes(key) ? (
                        <span className="skill-parameter-badge required">必需</span>
                      ) : (
                        <span className="skill-parameter-badge optional">可选</span>
                      )}
                    </div>
                    {value.description && (
                      <div className="skill-parameter-desc">{value.description}</div>
                    )}
                    {value.enum && (
                      <div className="skill-parameter-enum">
                        <span className="enum-label">可选值:</span>
                        <div className="enum-values">
                          {value.enum.map((v) => (
                            <span key={v} className="enum-value">{v}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {value.default !== undefined && (
                      <div className="skill-parameter-default">
                        <span className="default-label">默认值:</span>
                        <code>{String(value.default)}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {skill.metadata?.tags && skill.metadata.tags.length > 0 && (
            <div className="skill-section">
              <div className="skill-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                  <line x1="7" y1="7" x2="7.01" y2="7"></line>
                </svg>
                <h4>相关标签</h4>
              </div>
              <div className="skill-tags">
                {skill.metadata.tags.map((tag) => (
                  <span key={tag} className="skill-tag" style={{ 
                    background: `${categoryColor}15`,
                    color: categoryColor,
                    border: `1px solid ${categoryColor}30`
                  }}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
