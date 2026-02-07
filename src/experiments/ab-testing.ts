/**
 * A/B Testing Framework
 *
 * Provides comprehensive experimentation capabilities including feature flags,
 * traffic allocation, metrics collection, and statistical significance testing.
 * Compatible with both browser and Node.js environments.
 */

// ============================================
// Types
// ============================================

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: Variant[];
  trafficAllocation: TrafficAllocation;
  metrics: MetricConfig[];
  startDate?: number;
  endDate?: number;
  targetAudience?: AudienceFilter;
}

export interface Variant {
  id: string;
  name: string;
  description: string;
  weight: number;
  config: Record<string, unknown>;
}

export interface TrafficAllocation {
  type: 'percentage' | 'hash' | 'user_id';
  percentage: number; // 0-100
}

export interface MetricConfig {
  name: string;
  type: 'conversion' | 'count' | 'sum' | 'average' | 'duration';
  eventName: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

export interface AudienceFilter {
  userIds?: string[];
  userSegments?: string[];
  userAttributes?: Record<string, unknown>;
}

export interface ExperimentResult {
  experimentId: string;
  variantResults: VariantResult[];
  winner?: string;
  confidence: number;
  isSignificant: boolean;
  sampleSize: number;
  duration: number;
}

export interface VariantResult {
  variantId: string;
  participants: number;
  metrics: Record<string, MetricResult>;
  conversionRate?: number;
  improvement?: number;
  confidenceInterval?: { lower: number; upper: number };
}

export interface MetricResult {
  total: number;
  count: number;
  average: number;
  min: number;
  max: number;
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  targeting?: AudienceFilter;
  rolloutPercentage: number;
}

// ============================================
// Experiment Manager
// ============================================

export class ExperimentManager {
  private experiments = new Map<string, Experiment>();
  private userAssignments = new Map<string, Map<string, string>>(); // userId -> experimentId -> variantId
  private metrics = new Map<string, Array<{ userId: string; variantId: string; value: number; timestamp: number }>>();
  private featureFlags = new Map<string, FeatureFlag>();

  /**
   * Create a new experiment
   */
  createExperiment(config: Omit<Experiment, 'id' | 'status'>): Experiment {
    const experiment: Experiment = {
      ...config,
      id: this.generateId(),
      status: 'draft',
    };

    this.experiments.set(experiment.id, experiment);
    return experiment;
  }

  /**
   * Start an experiment
   */
  startExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return false;

    experiment.status = 'running';
    experiment.startDate = Date.now();
    return true;
  }

  /**
   * Stop an experiment
   */
  stopExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return false;

    experiment.status = 'completed';
    experiment.endDate = Date.now();
    return true;
  }

  /**
   * Get variant assignment for a user
   */
  getVariant(experimentId: string, userId: string): Variant | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') return null;

    // Check if user is in target audience
    if (!this.isUserInAudience(userId, experiment.targetAudience)) {
      return null;
    }

    // Check if user already assigned
    const userExps = this.userAssignments.get(userId);
    if (userExps?.has(experimentId)) {
      const variantId = userExps.get(experimentId)!;
      return experiment.variants.find((v) => v.id === variantId) || null;
    }

    // Check traffic allocation
    if (!this.shouldAllocateTraffic(experiment.trafficAllocation, userId)) {
      return null;
    }

    // Assign variant based on weight
    const variant = this.assignVariant(experiment.variants, userId);
    if (variant) {
      if (!this.userAssignments.has(userId)) {
        this.userAssignments.set(userId, new Map());
      }
      this.userAssignments.get(userId)!.set(experimentId, variant.id);
    }

    return variant;
  }

  /**
   * Track metric for a user in an experiment
   */
  trackMetric(experimentId: string, userId: string, metricName: string, value: number): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') return;

    const userExps = this.userAssignments.get(userId);
    const variantId = userExps?.get(experimentId);
    if (!variantId) return;

    const key = `${experimentId}:${metricName}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    this.metrics.get(key)!.push({
      userId,
      variantId,
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Get experiment results
   */
  getResults(experimentId: string): ExperimentResult | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    const variantResults: VariantResult[] = experiment.variants.map((variant) => {
      const participants = this.getParticipantCount(experimentId, variant.id);
      const metrics: Record<string, MetricResult> = {};

      for (const metricConfig of experiment.metrics) {
        const key = `${experimentId}:${metricConfig.name}`;
        const data = this.metrics.get(key)?.filter((m) => m.variantId === variant.id) || [];
        metrics[metricConfig.name] = this.calculateMetricResult(data, metricConfig);
      }

      return {
        variantId: variant.id,
        participants,
        metrics,
      };
    });

    // Calculate statistical significance
    const significance = this.calculateSignificance(experiment, variantResults);

    return {
      experimentId,
      variantResults,
      winner: significance.winner,
      confidence: significance.confidence,
      isSignificant: significance.isSignificant,
      sampleSize: variantResults.reduce((sum, v) => sum + v.participants, 0),
      duration: experiment.endDate
        ? experiment.endDate - (experiment.startDate || 0)
        : Date.now() - (experiment.startDate || 0),
    };
  }

  // ============================================
  // Feature Flags
  // ============================================

  /**
   * Create a feature flag
   */
  createFeatureFlag(config: Omit<FeatureFlag, 'enabled'>): FeatureFlag {
    const flag: FeatureFlag = {
      ...config,
      enabled: false,
    };

    this.featureFlags.set(config.key, flag);
    return flag;
  }

  /**
   * Enable a feature flag
   */
  enableFeatureFlag(key: string): boolean {
    const flag = this.featureFlags.get(key);
    if (!flag) return false;

    flag.enabled = true;
    return true;
  }

  /**
   * Disable a feature flag
   */
  disableFeatureFlag(key: string): boolean {
    const flag = this.featureFlags.get(key);
    if (!flag) return false;

    flag.enabled = false;
    return true;
  }

  /**
   * Check if feature is enabled for user
   */
  isFeatureEnabled(key: string, userId?: string): boolean {
    const flag = this.featureFlags.get(key);
    if (!flag) return false;
    if (!flag.enabled) return false;

    // Check targeting
    if (flag.targeting && userId) {
      if (!this.isUserInAudience(userId, flag.targeting)) {
        return false;
      }
    }

    // Check rollout percentage
    if (userId) {
      const hash = this.hashString(`${key}:${userId}`);
      const percentage = (hash % 100) / 100;
      return percentage < flag.rolloutPercentage / 100;
    }

    return flag.rolloutPercentage >= 100;
  }

  /**
   * Get feature flag value
   */
  getFeatureFlag<T>(key: string, defaultValue: T, userId?: string): T {
    if (!this.isFeatureEnabled(key, userId)) {
      return defaultValue;
    }

    // Return variant config if in experiment
    const experiment = this.findExperimentByFlag(key);
    if (experiment && userId) {
      const variant = this.getVariant(experiment.id, userId);
      if (variant) {
        return (variant.config[key] as T) ?? defaultValue;
      }
    }

    return defaultValue;
  }

  // ============================================
  // Private Methods
  // ============================================

  private shouldAllocateTraffic(allocation: TrafficAllocation, userId: string): boolean {
    if (allocation.type === 'percentage') {
      const hash = this.hashString(userId);
      const percentage = (hash % 100) / 100;
      return percentage < allocation.percentage / 100;
    }

    // Hash-based allocation always includes user
    return true;
  }

  private assignVariant(variants: Variant[], userId: string): Variant | null {
    if (variants.length === 0) return null;

    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    const hash = this.hashString(userId);
    const random = (hash % totalWeight) / totalWeight;

    let cumulativeWeight = 0;
    for (const variant of variants) {
      cumulativeWeight += variant.weight / totalWeight;
      if (random <= cumulativeWeight) {
        return variant;
      }
    }

    return variants[variants.length - 1];
  }

  private isUserInAudience(userId: string, audience?: AudienceFilter): boolean {
    if (!audience) return true;

    if (audience.userIds && !audience.userIds.includes(userId)) {
      return false;
    }

    // User segments and attributes would require user service integration
    // For now, assume all users match
    return true;
  }

  private getParticipantCount(experimentId: string, variantId: string): number {
    let count = 0;
    this.userAssignments.forEach((userExps) => {
      if (userExps.get(experimentId) === variantId) {
        count++;
      }
    });
    return count;
  }

  private calculateMetricResult(
    data: Array<{ value: number }>,
    _config: MetricConfig
  ): MetricResult {
    if (data.length === 0) {
      return { total: 0, count: 0, average: 0, min: 0, max: 0 };
    }

    const values = data.map((d) => d.value);
    const total = values.reduce((sum, v) => sum + v, 0);

    return {
      total,
      count: data.length,
      average: total / data.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  private calculateSignificance(
    _experiment: Experiment,
    results: VariantResult[]
  ): { winner?: string; confidence: number; isSignificant: boolean } {
    if (results.length < 2) {
      return { confidence: 0, isSignificant: false };
    }

    // Find control variant (first one) and best performing
    const control = results[0];
    const treatment = results.slice(1).sort((a, b) => b.participants - a.participants)[0];

    if (!treatment) {
      return { confidence: 0, isSignificant: false };
    }

    // Calculate conversion rates for conversion metrics
    const controlRate = control.conversionRate || 0;
    const treatmentRate = treatment.conversionRate || 0;

    // Simple z-test for proportions
    const pooledRate =
      (controlRate * control.participants + treatmentRate * treatment.participants) /
      (control.participants + treatment.participants);

    const se = Math.sqrt(
      pooledRate *
        (1 - pooledRate) *
        (1 / control.participants + 1 / treatment.participants)
    );

    const z = (treatmentRate - controlRate) / (se || 1);
    const confidence = this.zToConfidence(Math.abs(z));

    return {
      winner: confidence > 0.95 && treatmentRate > controlRate ? treatment.variantId : undefined,
      confidence,
      isSignificant: confidence > 0.95,
    };
  }

  private zToConfidence(z: number): number {
    // Approximation of standard normal CDF
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);

    const t = 1 / (1 + p * z);
    const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

    return 0.5 * (1 + sign * y);
  }

  private findExperimentByFlag(flagKey: string): Experiment | undefined {
    let found: Experiment | undefined;
    this.experiments.forEach((experiment) => {
      if (found) return;
      for (const variant of experiment.variants) {
        if (flagKey in variant.config) {
          found = experiment;
          return;
        }
      }
    });
    return found;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// Experiment Runner
// ============================================

export class ExperimentRunner {
  private manager: ExperimentManager;

  constructor(manager: ExperimentManager) {
    this.manager = manager;
  }

  /**
   * Run an experiment with automatic control
   */
  async runExperiment(
    experimentId: string,
    options: {
      minSampleSize?: number;
      minDuration?: number;
      confidenceThreshold?: number;
      autoStop?: boolean;
    } = {}
  ): Promise<ExperimentResult> {
    const { minSampleSize = 100, minDuration = 7 * 24 * 60 * 60 * 1000, confidenceThreshold = 0.95, autoStop = true } = options;

    // Start experiment
    this.manager.startExperiment(experimentId);

    // Monitor loop
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const results = this.manager.getResults(experimentId);
        if (!results) return;

        const shouldStop =
          results.sampleSize >= minSampleSize &&
          results.duration >= minDuration &&
          (results.isSignificant || results.confidence >= confidenceThreshold);

        if (shouldStop && autoStop) {
          clearInterval(checkInterval);
          this.manager.stopExperiment(experimentId);
          resolve(results);
        }
      }, 60000); // Check every minute
    });
  }
}

// ============================================
// Export
// ============================================

export { ExperimentManager as default };
