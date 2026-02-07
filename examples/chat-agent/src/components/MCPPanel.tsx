import { useState, useCallback } from 'react'
import { mcpManager, type MCPServerConfig } from '../mcp'
import './MCPPanel.css'

interface MCPPanelProps {
  onClose: () => void
  onSkillsUpdated?: () => void
}

export function MCPPanel({ onClose, onSkillsUpdated }: MCPPanelProps) {
  const [servers, setServers] = useState<{ id: string; config: MCPServerConfig; connected: boolean }[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newServer, setNewServer] = useState<{
    id: string
    name: string
    url: string
    authType: 'none' | 'bearer' | 'apiKey'
    token: string
  }>({
    id: '',
    name: '',
    url: '',
    authType: 'none',
    token: '',
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = useCallback(async () => {
    if (!newServer.id || !newServer.name || !newServer.url) {
      setError('Please fill in all required fields')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const config: MCPServerConfig = {
        name: newServer.name,
        url: newServer.url,
      }

      if (newServer.authType !== 'none' && newServer.token) {
        config.auth = {
          type: newServer.authType,
          token: newServer.token,
        }
      }

      await mcpManager.connectServer(newServer.id, config)

      setServers(prev => [
        ...prev,
        { id: newServer.id, config, connected: true },
      ])

      setShowAddForm(false)
      setNewServer({
        id: '',
        name: '',
        url: '',
        authType: 'none',
        token: '',
      })

      onSkillsUpdated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    } finally {
      setIsConnecting(false)
    }
  }, [newServer, onSkillsUpdated])

  const handleDisconnect = useCallback((id: string) => {
    mcpManager.disconnectServer(id)
    setServers(prev => prev.filter(s => s.id !== id))
    onSkillsUpdated?.()
  }, [onSkillsUpdated])

  const handleRefresh = useCallback(() => {
    const status = mcpManager.getStatus()
    setServers(prev =>
      prev.map(server => ({
        ...server,
        connected: status.find(s => s.id === server.id)?.connected ?? false,
      }))
    )
  }, [])

  return (
    <div className="mcp-panel-overlay" onClick={onClose}>
      <div className="mcp-panel" onClick={(e) => e.stopPropagation()}>
        <div className="mcp-panel-header">
          <div className="header-title">
            <span className="header-icon">🔌</span>
            <h3>MCP Servers</h3>
          </div>
          <div className="header-actions">
            <button className="refresh-btn" onClick={handleRefresh} title="Refresh status">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </button>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="mcp-panel-content">
          {servers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔌</div>
              <p>No MCP servers connected</p>
              <p className="hint">Connect to external MCP servers to extend agent capabilities</p>
            </div>
          ) : (
            <div className="servers-list">
              {servers.map(server => (
                <div key={server.id} className={`server-item ${server.connected ? 'connected' : 'disconnected'}`}>
                  <div className="server-info">
                    <div className="server-name">
                      {server.config.name}
                      <span className={`status-badge ${server.connected ? 'connected' : 'disconnected'}`}>
                        {server.connected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                    <div className="server-url">{server.config.url}</div>
                    <div className="server-id">ID: {server.id}</div>
                  </div>
                  <button
                    className="disconnect-btn"
                    onClick={() => handleDisconnect(server.id)}
                    title="Disconnect"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {showAddForm ? (
            <div className="add-server-form">
              <h4>Add MCP Server</h4>
              
              <div className="form-group">
                <label>Server ID *</label>
                <input
                  type="text"
                  placeholder="my-server"
                  value={newServer.id}
                  onChange={(e) => setNewServer({ ...newServer, id: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Server Name *</label>
                <input
                  type="text"
                  placeholder="My MCP Server"
                  value={newServer.name}
                  onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Server URL *</label>
                <input
                  type="url"
                  placeholder="https://api.example.com/mcp"
                  value={newServer.url}
                  onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Authentication</label>
                <select
                  value={newServer.authType}
                  onChange={(e) => setNewServer({ ...newServer, authType: e.target.value as any })}
                >
                  <option value="none">None</option>
                  <option value="bearer">Bearer Token</option>
                  <option value="apiKey">API Key</option>
                </select>
              </div>

              {newServer.authType !== 'none' && (
                <div className="form-group">
                  <label>Token / API Key</label>
                  <input
                    type="password"
                    placeholder="Enter token..."
                    value={newServer.token}
                    onChange={(e) => setNewServer({ ...newServer, token: e.target.value })}
                  />
                </div>
              )}

              {error && <div className="error-message">{error}</div>}

              <div className="form-actions">
                <button
                  className="cancel-btn"
                  onClick={() => {
                    setShowAddForm(false)
                    setError(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  className="connect-btn"
                  onClick={handleConnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          ) : (
            <button className="add-server-btn" onClick={() => setShowAddForm(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add MCP Server
            </button>
          )}

          <div className="mcp-info">
            <h4>About MCP</h4>
            <p>
              Model Context Protocol (MCP) allows you to connect external tools and resources to extend the agent's capabilities.
            </p>
            <p className="hint">
              Learn more at{' '}
              <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer">
                modelcontextprotocol.io
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
