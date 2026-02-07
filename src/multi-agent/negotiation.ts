/**
 * Agent Negotiation - Agent 协商机制
 *
 * 核心特性：
 * 1. 任务竞标系统 - Agent 竞标任务
 * 2. 协商任务分配 - 基于能力和负载
 * 3. 冲突解决 - 解决资源冲突
 * 4. 动态团队组建 - 根据任务组建最优团队
 * 5. 群体智能 - 投票和共识机制
 *
 * @module AgentNegotiation
 * @version 1.0.0
 * @reference Multi-Agent Reinforcement Learning
 */

import { EventEmitter } from '../utils/event-emitter.js';
import type { Agent } from '../core/domain/agent.js';
import type { Logger } from '../utils/logger.js';

/**
 * 任务定义
 */
export interface Task {
  /** 任务ID */
  id: string;

  /** 任务描述 */
  description: string;

  /** 任务类型 */
  type: string;

  /** 所需能力 */
  requiredCapabilities: string[];

  /** 优先级 */
  priority: number;

  /** 预估工作量 */
  estimatedEffort: number;

  /** 截止时间 */
  deadline?: Date;

  /** 依赖任务 */
  dependencies: string[];

  /** 输入数据 */
  input?: Record<string, unknown>;
}

/**
 * 评分后的竞标
 */
interface ScoredBid extends Bid {
  /** 综合评分 */
  score: number;
}

/**
 * 竞标
 */
export interface Bid {
  /** Agent ID */
  agentId: string;

  /** 任务ID */
  taskId: string;

  /** 竞标价格（成本） */
  cost: number;

  /** 预估完成时间 */
  estimatedTime: number;

  /** 成功率预测 */
  successRate: number;

  /** 能力匹配度 */
  capabilityMatch: number;

  /** 当前负载 */
  currentLoad: number;

  /** 竞标理由 */
  reasoning: string;
}

/**
 * 任务分配
 */
export interface TaskAssignment {
  /** 任务ID */
  taskId: string;

  /** 分配的 Agent ID */
  agentId: string;

  /** 分配时间 */
  assignedAt: Date;

  /** 预期完成时间 */
  expectedCompletion: Date;

  /** 分配得分 */
  assignmentScore: number;
}

/**
 * 冲突
 */
export interface Conflict {
  /** 冲突ID */
  id: string;

  /** 冲突类型 */
  type: 'resource' | 'task' | 'priority';

  /** 涉及的任务 */
  taskIds: string[];

  /** 涉及的 Agent */
  agentIds: string[];

  /** 冲突描述 */
  description: string;

  /** 冲突时间 */
  timestamp: Date;
}

/**
 * 冲突解决
 */
export interface ConflictResolution {
  /** 冲突ID */
  conflictId: string;

  /** 解决策略 */
  strategy: 'negotiation' | 'auction' | 'priority' | 'random';

  /** 解决方案 */
  solution: string;

  /** 胜出的 Agent */
  winnerId?: string;

  /** 妥协方案 */
  compromise?: {
    agentId: string;
    adjustedTask: Partial<Task>;
  }[];

  /** 解决时间 */
  resolvedAt: Date;
}

/**
 * 团队
 */
export interface Team {
  /** 团队ID */
  id: string;

  /** 团队成员 */
  members: TeamMember[];

  /** 团队能力 */
  collectiveCapabilities: string[];

  /** 团队负载 */
  totalLoad: number;

  /** 团队效率 */
  efficiency: number;
}

/**
 * 团队成员
 */
export interface TeamMember {
  /** Agent ID */
  agentId: string;

  /** 角色 */
  role: 'leader' | 'worker' | 'specialist';

  /** 分配的任务 */
  assignedTasks: string[];

  /** 贡献度 */
  contribution: number;
}

/**
 * 投票
 */
export interface Vote {
  /** 投票者 */
  voterId: string;

  /** 投票对象 */
  candidateId: string;

  /** 投票权重 */
  weight: number;

  /** 投票理由 */
  reasoning: string;
}

/**
 * 投票结果
 */
export interface VoteResult {
  /** 获胜者 */
  winner: string;

  /** 获胜票数 */
  winningVotes: number;

  /** 总票数 */
  totalVotes: number;

  /** 投票分布 */
  distribution: Record<string, number>;

  /** 共识度 */
  consensus: number;
}

/**
 * 协商配置
 */
export interface NegotiationConfig {
  /** 竞标超时时间 (ms) */
  bidTimeout?: number;

  /** 最大协商轮数 */
  maxRounds?: number;

  /** 启用动态定价 */
  enableDynamicPricing?: boolean;

  /** 启用冲突预测 */
  enableConflictPrediction?: boolean;

  /** 启用群体智能 */
  enableSwarmIntelligence?: boolean;
}

/**
 * Agent 协商器
 *
 * 提供多 Agent 之间的任务分配和冲突解决能力
 */
export class AgentNegotiator extends EventEmitter {
  private agents = new Map<string, Agent>();
  private tasks = new Map<string, Task>();
  private bids = new Map<string, Bid[]>(); // taskId -> bids
  private assignments = new Map<string, TaskAssignment>();
  private conflicts: Conflict[] = [];
  private resolutions: ConflictResolution[] = [];
  private config: Required<NegotiationConfig>;

  constructor(
    private logger: Logger,
    config: NegotiationConfig = {}
  ) {
    super();
    this.config = {
      bidTimeout: 5000,
      maxRounds: 3,
      enableDynamicPricing: true,
      enableConflictPrediction: true,
      enableSwarmIntelligence: true,
      ...config,
    };
  }

  /**
   * 注册 Agent
   */
  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);

    this.emit('agent:registered', {
      type: 'agent:registered',
      timestamp: new Date(),
      data: { agentId: agent.id },
    });
  }

  /**
   * 发布任务
   */
  publishTask(task: Task): void {
    this.tasks.set(task.id, task);
    this.bids.set(task.id, []);

    this.emit('task:published', {
      type: 'task:published',
      timestamp: new Date(),
      data: { taskId: task.id },
    });

    // 预测冲突
    if (this.config.enableConflictPrediction) {
      this.predictConflicts(task);
    }
  }

  /**
   * 提交竞标
   */
  submitBid(bid: Bid): void {
    const taskBids = this.bids.get(bid.taskId);
    if (!taskBids) return;

    taskBids.push(bid);

    this.emit('bid:submitted', {
      type: 'bid:submitted',
      timestamp: new Date(),
      data: { bid },
    });
  }

  /**
   * 协商任务分配
   */
  async negotiateTaskAssignment(taskId: string): Promise<TaskAssignment | undefined> {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;

    this.emit('negotiation:started', {
      type: 'negotiation:started',
      timestamp: new Date(),
      data: { taskId },
    });

    // 等待竞标
    await this.waitForBids(taskId);

    // 获取所有竞标
    const bids = this.bids.get(taskId) || [];

    if (bids.length === 0) {
      this.logger.warn(`No bids for task ${taskId}`);
      return undefined;
    }

    // 评估竞标
    const evaluatedBids = this.evaluateBids(bids, task);

    // 选择最优竞标
    const winner = evaluatedBids[0];

    // 创建分配
    const assignment: TaskAssignment = {
      taskId,
      agentId: winner.agentId,
      assignedAt: new Date(),
      expectedCompletion: new Date(Date.now() + winner.estimatedTime),
      assignmentScore: this.calculateAssignmentScore(winner, task),
    };

    this.assignments.set(taskId, assignment);

    this.emit('assignment:completed', {
      type: 'assignment:completed',
      timestamp: new Date(),
      data: { assignment },
    });

    return assignment;
  }

  /**
   * 解决冲突
   */
  async resolveConflict(conflict: Conflict): Promise<ConflictResolution> {
    this.emit('conflict:detected', {
      type: 'conflict:detected',
      timestamp: new Date(),
      data: { conflict },
    });

    let resolution: ConflictResolution;

    switch (conflict.type) {
      case 'resource':
        resolution = await this.resolveResourceConflict(conflict);
        break;
      case 'task':
        resolution = await this.resolveTaskConflict(conflict);
        break;
      case 'priority':
        resolution = await this.resolvePriorityConflict(conflict);
        break;
      default:
        resolution = this.createDefaultResolution(conflict);
    }

    this.resolutions.push(resolution);

    this.emit('conflict:resolved', {
      type: 'conflict:resolved',
      timestamp: new Date(),
      data: { resolution },
    });

    return resolution;
  }

  /**
   * 组建最优团队
   */
  formOptimalTeam(taskIds: string[]): Team {
    const requiredCapabilities = new Set<string>();
    const totalEffort = taskIds.reduce((sum, id) => {
      const task = this.tasks.get(id);
      if (task) {
        task.requiredCapabilities.forEach(c => requiredCapabilities.add(c));
        return sum + task.estimatedEffort;
      }
      return sum;
    }, 0);

    // 选择能覆盖所有能力的 Agent
    const selectedAgents: TeamMember[] = [];
    const coveredCapabilities = new Set<string>();

    // 按能力匹配度排序
    const sortedAgents = Array.from(this.agents.values()).sort((a, b) => {
      const scoreA = this.calculateCapabilityCoverage(a, requiredCapabilities);
      const scoreB = this.calculateCapabilityCoverage(b, requiredCapabilities);
      return scoreB - scoreA;
    });

    for (const agent of sortedAgents) {
      if (coveredCapabilities.size >= requiredCapabilities.size) break;

      const newCapabilities = this.getNewCapabilities(agent, coveredCapabilities);
      if (newCapabilities.length > 0) {
        selectedAgents.push({
          agentId: agent.id,
          role: selectedAgents.length === 0 ? 'leader' : 'worker',
          assignedTasks: [],
          contribution: newCapabilities.length,
        });

        newCapabilities.forEach(c => coveredCapabilities.add(c));
      }
    }

    const team: Team = {
      id: `team_${Date.now()}`,
      members: selectedAgents,
      collectiveCapabilities: Array.from(coveredCapabilities),
      totalLoad: totalEffort / selectedAgents.length,
      efficiency: coveredCapabilities.size / requiredCapabilities.size,
    };

    this.emit('team:formed', {
      type: 'team:formed',
      timestamp: new Date(),
      data: { team },
    });

    return team;
  }

  /**
   * 投票决策
   */
  async vote(candidates: string[], votes: Vote[]): Promise<VoteResult> {
    const voteCounts: Record<string, number> = {};
    let totalWeight = 0;

    for (const vote of votes) {
      voteCounts[vote.candidateId] = (voteCounts[vote.candidateId] || 0) + vote.weight;
      totalWeight += vote.weight;
    }

    // 找出获胜者
    let winner = candidates[0];
    let maxVotes = 0;

    for (const [candidate, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        winner = candidate;
      }
    }

    // 计算共识度
    const consensus = maxVotes / totalWeight;

    const result: VoteResult = {
      winner,
      winningVotes: maxVotes,
      totalVotes: totalWeight,
      distribution: voteCounts,
      consensus,
    };

    this.emit('vote:completed', {
      type: 'vote:completed',
      timestamp: new Date(),
      data: { result },
    });

    return result;
  }

  /**
   * 达成共识
   */
  async reachConsensus(
    proposal: string,
    agentIds: string[],
    threshold: number = 0.7
  ): Promise<{ agreed: boolean; support: number; objections: string[] }> {
    const votes: Vote[] = [];
    const objections: string[] = [];

    for (const agentId of agentIds) {
      const agent = this.agents.get(agentId);
      if (!agent) continue;

      // 模拟 Agent 投票
      const support = await this.simulateVoting(agent, proposal);
      const weight = this.calculateVotingWeight(agent);

      votes.push({
        voterId: agentId,
        candidateId: support > 0.5 ? 'agree' : 'disagree',
        weight,
        reasoning: support > 0.5 ? 'Supports the proposal' : 'Has concerns',
      });

      if (support <= 0.5) {
        objections.push(`${agentId}: ${support}`);
      }
    }

    const result = await this.vote(['agree', 'disagree'], votes);
    const agreed = result.winner === 'agree' && result.consensus >= threshold;

    return {
      agreed,
      support: result.distribution['agree'] || 0,
      objections,
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async waitForBids(_taskId: string): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, this.config.bidTimeout);
    });
  }

  private evaluateBids(bids: Bid[], _task: Task): ScoredBid[] {
    return bids
      .map(bid => ({
        ...bid,
        // 综合评分
        score:
          bid.capabilityMatch * 0.3 +
          (1 - bid.cost / 100) * 0.2 +
          bid.successRate * 0.3 +
          (1 - bid.currentLoad / 10) * 0.2,
      }))
      .sort((a, b) => b.score - a.score);
  }

  private calculateAssignmentScore(bid: Bid, _task: Task): number {
    return (
      bid.capabilityMatch * 0.4 +
      bid.successRate * 0.3 +
      (1 - bid.currentLoad / 10) * 0.3
    );
  }

  private async resolveResourceConflict(conflict: Conflict): Promise<ConflictResolution> {
    // 资源冲突：通过拍卖解决
    const bids = conflict.agentIds.map(agentId => ({
      agentId,
      value: Math.random() * 100, // 模拟估值
    }));

    bids.sort((a, b) => b.value - a.value);
    const winner = bids[0];

    return {
      conflictId: conflict.id,
      strategy: 'auction',
      solution: `Resource allocated to highest bidder: ${winner.agentId}`,
      winnerId: winner.agentId,
      resolvedAt: new Date(),
    };
  }

  private async resolveTaskConflict(conflict: Conflict): Promise<ConflictResolution> {
    // 任务冲突：重新分配
    const compromise = conflict.agentIds.map(agentId => ({
      agentId,
      adjustedTask: {
        priority: 1, // 降低优先级
      },
    }));

    return {
      conflictId: conflict.id,
      strategy: 'negotiation',
      solution: 'Tasks redistributed with adjusted priorities',
      compromise,
      resolvedAt: new Date(),
    };
  }

  private async resolvePriorityConflict(conflict: Conflict): Promise<ConflictResolution> {
    // 优先级冲突：按整体目标优先级解决
    const tasks = conflict.taskIds
      .map(id => this.tasks.get(id))
      .filter(Boolean) as Task[];

    tasks.sort((a, b) => b.priority - a.priority);
    const winner = tasks[0];

    return {
      conflictId: conflict.id,
      strategy: 'priority',
      solution: `Higher priority task ${winner.id} takes precedence`,
      winnerId: winner.id,
      resolvedAt: new Date(),
    };
  }

  private createDefaultResolution(conflict: Conflict): ConflictResolution {
    return {
      conflictId: conflict.id,
      strategy: 'random',
      solution: 'Random selection due to unresolved conflict',
      winnerId: conflict.agentIds[0],
      resolvedAt: new Date(),
    };
  }

  private predictConflicts(task: Task): void {
    // 预测可能的冲突
    for (const [otherId, otherTask] of this.tasks) {
      if (otherId === task.id) continue;

      // 检查资源竞争
      const commonCapabilities = task.requiredCapabilities.filter(c =>
        otherTask.requiredCapabilities.includes(c)
      );

      if (commonCapabilities.length > 0) {
        const conflict: Conflict = {
          id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          type: 'resource',
          taskIds: [task.id, otherId],
          agentIds: [],
          description: `Resource competition for capabilities: ${commonCapabilities.join(', ')}`,
          timestamp: new Date(),
        };

        this.conflicts.push(conflict);

        this.emit('conflict:predicted', {
          type: 'conflict:predicted',
          timestamp: new Date(),
          data: { conflict },
        });
      }
    }
  }

  private calculateCapabilityCoverage(
    _agent: Agent,
    _requiredCapabilities: Set<string>
  ): number {
    // 简化实现，实际应该检查 Agent 的能力
    return Math.random(); // 模拟
  }

  private getNewCapabilities(_agent: Agent, _covered: Set<string>): string[] {
    // 简化实现
    return [];
  }

  private async simulateVoting(_agent: Agent, _proposal: string): Promise<number> {
    // 模拟 Agent 对提案的支持度
    return 0.5 + Math.random() * 0.5;
  }

  private calculateVotingWeight(_agent: Agent): number {
    // 基于 Agent 的权威性和贡献度计算投票权重
    return 1.0;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    agentCount: number;
    taskCount: number;
    assignmentCount: number;
    conflictCount: number;
    resolutionCount: number;
  } {
    return {
      agentCount: this.agents.size,
      taskCount: this.tasks.size,
      assignmentCount: this.assignments.size,
      conflictCount: this.conflicts.length,
      resolutionCount: this.resolutions.length,
    };
  }
}

/**
 * 创建 Agent 协商器实例
 */
export function createAgentNegotiator(
  logger: Logger,
  config?: NegotiationConfig
): AgentNegotiator {
  return new AgentNegotiator(logger, config);
}
