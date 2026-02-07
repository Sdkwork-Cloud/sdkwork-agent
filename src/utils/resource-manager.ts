/**
 * Resource Manager
 * 
 * Provides intelligent resource management and load balancing for multi-agent systems.
 */

export class ResourceManager {
  private resourceAllocations = new Map<string, number>();
  private resourceCaps = new Map<string, number>();
  private resourceHistory = new Map<string, Array<{ timestamp: number; allocation: number }>>();

  /**
   * Reserve resources for an agent
   */
  reserveResources(agentId: string, amount: number): boolean {
    const current = this.resourceAllocations.get(agentId) || 0;
    const cap = this.resourceCaps.get(agentId) || 5; // Default cap

    if (current + amount > cap) {
      return false; // Not enough resources
    }

    this.resourceAllocations.set(agentId, current + amount);
    this.recordResourceUsage(agentId, current + amount);
    return true;
  }

  /**
   * Release resources from an agent
   */
  releaseResources(agentId: string, amount: number): void {
    const current = this.resourceAllocations.get(agentId) || 0;
    const newAmount = Math.max(0, current - amount);
    this.resourceAllocations.set(agentId, newAmount);
    this.recordResourceUsage(agentId, newAmount);
  }

  /**
   * Get resource availability for an agent
   */
  getResourceAvailability(agentId: string): number {
    const current = this.resourceAllocations.get(agentId) || 0;
    const cap = this.resourceCaps.get(agentId) || 5; // Default cap
    return Math.max(0, 1 - (current / cap));
  }

  /**
   * Set resource cap for an agent
   */
  setResourceCap(agentId: string, cap: number): void {
    this.resourceCaps.set(agentId, cap);
  }

  /**
   * Get current resource usage for all agents
   */
  getResourceUsage(): Map<string, number> {
    return new Map(this.resourceAllocations);
  }

  /**
   * Get resource utilization for an agent
   */
  getResourceUtilization(agentId: string): number {
    const current = this.resourceAllocations.get(agentId) || 0;
    const cap = this.resourceCaps.get(agentId) || 5; // Default cap
    return Math.min(1, current / cap);
  }

  /**
   * Find agent with most available resources
   */
  findMostAvailableAgent(agentIds: string[]): string | null {
    let bestAgent: string | null = null;
    let bestAvailability = -1;

    for (const agentId of agentIds) {
      const availability = this.getResourceAvailability(agentId);
      if (availability > bestAvailability) {
        bestAvailability = availability;
        bestAgent = agentId;
      }
    }

    return bestAgent;
  }

  /**
   * Balance resources across agents
   */
  balanceResources(): void {
    const agents = Array.from(this.resourceAllocations.keys());
    if (agents.length < 2) return;

    // Calculate average utilization
    const totalUsage = Array.from(this.resourceAllocations.values()).reduce((sum, val) => sum + val, 0);
    const avgUsage = totalUsage / agents.length;

    // Simple balancing: redistribute excess resources
    for (const agentId of agents) {
      const current = this.resourceAllocations.get(agentId) || 0;
      if (current > avgUsage * 1.2) {
        // Reduce usage for over-utilized agents
        const newUsage = Math.max(avgUsage, current * 0.8);
        this.resourceAllocations.set(agentId, newUsage);
        this.recordResourceUsage(agentId, newUsage);
      }
    }
  }

  /**
   * Record resource usage for historical analysis
   */
  private recordResourceUsage(agentId: string, allocation: number): void {
    if (!this.resourceHistory.has(agentId)) {
      this.resourceHistory.set(agentId, []);
    }

    const history = this.resourceHistory.get(agentId)!;
    history.push({ timestamp: Date.now(), allocation });

    // Keep only last 100 records
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get resource usage trends for an agent
   */
  getResourceUsageTrend(agentId: string): 'increasing' | 'decreasing' | 'stable' {
    const history = this.resourceHistory.get(agentId);
    if (!history || history.length < 3) {
      return 'stable';
    }

    // Calculate simple linear regression
    const recentHistory = history.slice(-5); // Last 5 records
    const n = recentHistory.length;
    const sumX = recentHistory.reduce((sum, _, i) => sum + i, 0);
    const sumY = recentHistory.reduce((sum, record) => sum + record.allocation, 0);
    const sumXY = recentHistory.reduce((sum, record, i) => sum + i * record.allocation, 0);
    const sumX2 = recentHistory.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    if (slope > 0.1) return 'increasing';
    if (slope < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Reset resource allocations
   */
  reset(): void {
    this.resourceAllocations.clear();
    this.resourceHistory.clear();
  }
}

export default ResourceManager;