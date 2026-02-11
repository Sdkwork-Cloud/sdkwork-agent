import type {
  ReflectionAlgorithm,
  ReflectionInput,
  ReflectionConfig,
  ReflectionResult,
  ReflectionFinding,
  ReflectionSuggestion,
  AlgorithmResult,
  ReflectionType,
} from '../../domain/algorithms.js';
import type { ExecutionPlan } from '../../domain/execution.js';

/**
 * Reflection Algorithm Implementation
 * 反思算法实现
 *
 * 支持：
 * 1. 自我批评 (Self Critique)
 * 2. 计划评估 (Plan Evaluation)
 * 3. 执行回顾 (Execution Review)
 * 4. 结果分析 (Outcome Analysis)
 * 5. 改进建议 (Improvement Suggestion)
 */
export class ReflectionAlgorithmImpl implements ReflectionAlgorithm {
  private _learnings: Map<string, unknown> = new Map();

  /**
   * Main reflection method
   */
  async reflect(
    input: ReflectionInput,
    _config: ReflectionConfig
  ): Promise<AlgorithmResult<ReflectionResult>> {
    const startTime = Date.now();
    const findings: ReflectionFinding[] = [];

    try {
      // Perform reflection based on type
      switch (input.type) {
        case 'self_critique':
          findings.push(...(await this._selfCritique(input)));
          break;
        case 'plan_evaluation':
          findings.push(...(await this._evaluatePlan(input)));
          break;
        case 'execution_review':
          findings.push(...(await this._reviewExecution(input)));
          break;
        case 'outcome_analysis':
          findings.push(...(await this._analyzeOutcome(input)));
          break;
        case 'improvement_suggestion':
          findings.push(...(await this._suggestImprovements(input)));
          break;
      }

      // Generate suggestions based on findings
      const suggestions = await this.suggestImprovements(findings);

      // Calculate confidence
      const confidence = this._calculateConfidence(findings, suggestions);

      // Generate summary
      const summary = this._generateSummary(input.type, findings, suggestions);

      const result: ReflectionResult = {
        type: input.type,
        findings,
        suggestions,
        summary,
        confidence,
        learning: this._extractLearning(findings),
      };

      // Store learning
      await this.learn(result);

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: result,
        iterations: 1,
        duration,
        confidence,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        iterations: 0,
        duration: Date.now() - startTime,
        confidence: 0,
      };
    }
  }

  /**
   * Critique a plan and execution result
   */
  async critique(plan: ExecutionPlan, executionResult: unknown): Promise<ReflectionFinding[]> {
    const findings: ReflectionFinding[] = [];

    // Check plan completeness
    if (plan.steps.length === 0) {
      findings.push({
        id: this._generateId(),
        type: 'issue',
        category: 'plan_completeness',
        description: 'Plan has no steps defined',
        severity: 'critical',
        evidence: ['Plan.steps is empty'],
        suggestions: ['Add at least one step to the plan'],
      });
    }

    // Check step dependencies
    const dependencyIssues = this._checkDependencies(plan);
    findings.push(...dependencyIssues);

    // Check execution result
    if (executionResult === null || executionResult === undefined) {
      findings.push({
        id: this._generateId(),
        type: 'issue',
        category: 'execution_result',
        description: 'Execution result is null or undefined',
        severity: 'high',
        evidence: ['Execution result is empty'],
      });
    }

    // Identify strengths
    if (plan.steps.length > 0 && dependencyIssues.length === 0) {
      findings.push({
        id: this._generateId(),
        type: 'strength',
        category: 'plan_structure',
        description: 'Plan has well-defined structure with valid dependencies',
        severity: 'low',
        evidence: [`Plan has ${plan.steps.length} steps with valid dependencies`],
      });
    }

    return findings;
  }

  /**
   * Evaluate a plan against an outcome
   */
  async evaluate(plan: ExecutionPlan, outcome: unknown): Promise<number> {
    let score = 0;
    const maxScore = 100;

    // Completeness score (30%)
    if (plan.steps.length > 0) {
      score += 30;
    }

    // Dependency validity score (20%)
    const dependencyIssues = this._checkDependencies(plan);
    if (dependencyIssues.length === 0) {
      score += 20;
    } else {
      score += Math.max(0, 20 - dependencyIssues.length * 5);
    }

    // Outcome quality score (50%)
    if (outcome !== null && outcome !== undefined) {
      score += 30;

      // Check if outcome has expected structure
      if (typeof outcome === 'object' && outcome !== null) {
        const obj = outcome as Record<string, unknown>;
        if ('success' in obj) score += 10;
        if ('data' in obj || 'result' in obj) score += 10;
      }
    }

    return Math.min(score, maxScore) / maxScore;
  }

  /**
   * Suggest improvements based on findings
   */
  async suggestImprovements(findings: ReflectionFinding[]): Promise<ReflectionSuggestion[]> {
    const suggestions: ReflectionSuggestion[] = [];

    for (const finding of findings) {
      if (finding.type === 'issue' || finding.type === 'opportunity') {
        const suggestion: ReflectionSuggestion = {
          id: this._generateId(),
          type: this._mapFindingTypeToSuggestionType(finding.type, finding.category),
          description: finding.suggestions?.[0] || `Address: ${finding.description}`,
          priority: this._severityToPriority(finding.severity),
          expectedImprovement: this._estimateImprovement(finding),
        };

        suggestions.push(suggestion);
      }
    }

    // Sort by priority
    suggestions.sort((a, b) => b.priority - a.priority);

    return suggestions;
  }

  /**
   * Learn from reflection
   */
  async learn(reflection: ReflectionResult): Promise<void> {
    // Store learning
    const key = `reflection:${reflection.type}:${Date.now()}`;
    this._learnings.set(key, {
      findings: reflection.findings,
      suggestions: reflection.suggestions,
      timestamp: Date.now(),
    });

    // Limit stored learnings
    if (this._learnings.size > 1000) {
      const firstKey = this._learnings.keys().next().value;
      if (firstKey) {
        this._learnings.delete(firstKey);
      }
    }
  }

  // ============================================
  // Private Methods
  // ============================================

  private async _selfCritique(input: ReflectionInput): Promise<ReflectionFinding[]> {
    const findings: ReflectionFinding[] = [];

    // Analyze context for potential issues
    if (input.context) {
      const context = input.context;

      // Check for missing information
      if (!context.userIntent) {
        findings.push({
          id: this._generateId(),
          type: 'issue',
          category: 'context_completeness',
          description: 'User intent is not clearly defined',
          severity: 'medium',
          evidence: ['Context lacks userIntent field'],
          suggestions: ['Clarify user intent before proceeding'],
        });
      }

      // Check for constraints
      if (!context.constraints) {
        findings.push({
          id: this._generateId(),
          type: 'opportunity',
          category: 'optimization',
          description: 'No constraints defined - may have optimization opportunities',
          severity: 'low',
          evidence: ['Context lacks constraints'],
        });
      }
    }

    return findings;
  }

  private async _evaluatePlan(input: ReflectionInput): Promise<ReflectionFinding[]> {
    if (!input.plan) {
      return [{
        id: this._generateId(),
        type: 'issue',
        category: 'input_validation',
        description: 'No plan provided for evaluation',
        severity: 'critical',
        evidence: ['Input.plan is undefined'],
      }];
    }

    return this.critique(input.plan, input.executionResult);
  }

  private async _reviewExecution(input: ReflectionInput): Promise<ReflectionFinding[]> {
    const findings: ReflectionFinding[] = [];

    if (!input.executionResult) {
      findings.push({
        id: this._generateId(),
        type: 'issue',
        category: 'execution_data',
        description: 'No execution result available for review',
        severity: 'high',
        evidence: ['Execution result is missing'],
      });
      return findings;
    }

    // Analyze execution result
    const result = input.executionResult;

    if (result?.status === 'failed') {
      findings.push({
        id: this._generateId(),
        type: 'issue',
        category: 'execution_failure',
        description: `Execution failed: ${result.errors?.[0]?.message || 'Unknown error'}`,
        severity: 'critical',
        evidence: [JSON.stringify(result)],
        suggestions: ['Review error details and retry with corrections'],
      });
    }

    if (result.metrics) {
      const metrics = result.metrics;

      if (metrics.retryCount > 3) {
        findings.push({
          id: this._generateId(),
          type: 'issue',
          category: 'execution_efficiency',
          description: `High retry count: ${metrics.retryCount}`,
          severity: 'medium',
          evidence: [`Retry count: ${metrics.retryCount}`],
          suggestions: ['Investigate root cause of retries', 'Improve error handling'],
        });
      }

      if (metrics.timeoutCount > 0) {
        findings.push({
          id: this._generateId(),
          type: 'issue',
          category: 'performance',
          description: `Timeouts occurred: ${metrics.timeoutCount}`,
          severity: 'high',
          evidence: [`Timeout count: ${metrics.timeoutCount}`],
          suggestions: ['Increase timeout values', 'Optimize slow operations'],
        });
      }
    }

    return findings;
  }

  private async _analyzeOutcome(input: ReflectionInput): Promise<ReflectionFinding[]> {
    const findings: ReflectionFinding[] = [];

    if (!input.expectedOutcome || !input.actualOutcome) {
      findings.push({
        id: this._generateId(),
        type: 'issue',
        category: 'comparison_data',
        description: 'Missing expected or actual outcome for comparison',
        severity: 'high',
        evidence: [
          `Expected: ${JSON.stringify(input.expectedOutcome)}`,
          `Actual: ${JSON.stringify(input.actualOutcome)}`,
        ],
      });
      return findings;
    }

    // Compare outcomes
    const match = JSON.stringify(input.expectedOutcome) === JSON.stringify(input.actualOutcome);

    if (match) {
      findings.push({
        id: this._generateId(),
        type: 'strength',
        category: 'outcome_accuracy',
        description: 'Actual outcome matches expected outcome',
        severity: 'low',
        evidence: ['Outcomes are identical'],
      });
    } else {
      findings.push({
        id: this._generateId(),
        type: 'issue',
        category: 'outcome_mismatch',
        description: 'Actual outcome differs from expected',
        severity: 'high',
        evidence: [
          `Expected: ${JSON.stringify(input.expectedOutcome)}`,
          `Actual: ${JSON.stringify(input.actualOutcome)}`,
        ],
        suggestions: ['Analyze differences and adjust plan accordingly'],
      });
    }

    return findings;
  }

  private async _suggestImprovements(input: ReflectionInput): Promise<ReflectionFinding[]> {
    const findings: ReflectionFinding[] = [];

    // Look for opportunities in the plan
    if (input.plan) {
      const plan = input.plan;

      // Check for parallelization opportunities
      const independentSteps = this._findIndependentSteps(plan);
      if (independentSteps.length > 1) {
        findings.push({
          id: this._generateId(),
          type: 'opportunity',
          category: 'performance',
          description: `Found ${independentSteps.length} independent steps that could be parallelized`,
          severity: 'low',
          evidence: independentSteps.map(s => s.id),
          suggestions: ['Consider changing execution strategy to parallel'],
        });
      }

      // Check for missing error handling
      const stepsWithoutErrorHandling = plan.steps.filter(s => !s.onError);
      if (stepsWithoutErrorHandling.length > 0) {
        findings.push({
          id: this._generateId(),
          type: 'opportunity',
          category: 'reliability',
          description: `${stepsWithoutErrorHandling.length} steps lack error handling`,
          severity: 'medium',
          evidence: stepsWithoutErrorHandling.map(s => s.id),
          suggestions: ['Add error handling to improve reliability'],
        });
      }
    }

    return findings;
  }

  private _checkDependencies(plan: ExecutionPlan): ReflectionFinding[] {
    const findings: ReflectionFinding[] = [];
    const stepIds = new Set(plan.steps.map(s => s.id));

    for (const step of plan.steps) {
      for (const depId of step.dependencies) {
        if (!stepIds.has(depId)) {
          findings.push({
            id: this._generateId(),
            type: 'issue',
            category: 'dependency_validation',
            description: `Step ${step.id} depends on non-existent step ${depId}`,
            severity: 'critical',
            evidence: [`Dependency: ${depId}`],
            suggestions: ['Remove invalid dependency or add missing step'],
          });
        }
      }
    }

    return findings;
  }

  private _findIndependentSteps(plan: ExecutionPlan): ExecutionPlan['steps'] {
    return plan.steps.filter(step => step.dependencies.length === 0);
  }

  private _mapFindingTypeToSuggestionType(
    findingType: ReflectionFinding['type'],
    category: string
  ): ReflectionSuggestion['type'] {
    if (findingType === 'issue') {
      if (category.includes('plan')) return 'plan_change';
      if (category.includes('parameter')) return 'parameter_adjust';
      return 'alternative_approach';
    }
    return 'learning';
  }

  private _severityToPriority(severity: ReflectionFinding['severity']): number {
    switch (severity) {
      case 'critical': return 10;
      case 'high': return 7;
      case 'medium': return 5;
      case 'low': return 3;
      default: return 1;
    }
  }

  private _estimateImprovement(finding: ReflectionFinding): number {
    // Estimate improvement based on severity
    switch (finding.severity) {
      case 'critical': return 0.5;
      case 'high': return 0.3;
      case 'medium': return 0.2;
      case 'low': return 0.1;
      default: return 0.05;
    }
  }

  private _calculateConfidence(findings: ReflectionFinding[], suggestions: ReflectionSuggestion[]): number {
    if (findings.length === 0) return 0;

    // Confidence based on number and quality of findings
    const issueCount = findings.filter(f => f.type === 'issue').length;
    const strengthCount = findings.filter(f => f.type === 'strength').length;

    // More strengths and fewer issues = higher confidence
    const baseConfidence = 0.5;
    const issuePenalty = issueCount * 0.1;
    const strengthBonus = strengthCount * 0.05;
    const suggestionBonus = Math.min(suggestions.length * 0.02, 0.2);

    return Math.max(0, Math.min(1, baseConfidence - issuePenalty + strengthBonus + suggestionBonus));
  }

  private _generateSummary(type: ReflectionType, findings: ReflectionFinding[], suggestions: ReflectionSuggestion[]): string {
    const issueCount = findings.filter(f => f.type === 'issue').length;
    const strengthCount = findings.filter(f => f.type === 'strength').length;
    const opportunityCount = findings.filter(f => f.type === 'opportunity').length;

    return `${type} reflection completed. Found ${issueCount} issues, ${strengthCount} strengths, ${opportunityCount} opportunities. Generated ${suggestions.length} improvement suggestions.`;
  }

  private _extractLearning(findings: ReflectionFinding[]): Record<string, unknown> {
    const learning: Record<string, unknown> = {};

    for (const finding of findings) {
      if (finding.type === 'issue') {
        learning[`issue_${finding.category}`] = {
          description: finding.description,
          severity: finding.severity,
        };
      }
    }

    return learning;
  }

  private _generateId(): string {
    return `refl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default ReflectionAlgorithmImpl;
