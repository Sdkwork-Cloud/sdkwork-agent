/**
 * Task Type Detector
 * 
 * Provides intelligent task type detection and difficulty estimation.
 */

export type TaskType = 'research' | 'analysis' | 'planning' | 'execution' | 'evaluation' | 'coordination' | 'communication' | 'problem_solving' | 'general';

export type TaskComplexity = 'simple' | 'moderate' | 'complex' | 'very_complex';

export async function detectTaskType(input: string): Promise<TaskType> {
  const detector = new TaskTypeDetector();
  return await detector.detectTaskType(input) as TaskType;
}

export class TaskTypeDetector {
  private taskTypeKeywords = {
    research: ['research', 'study', 'investigate', 'explore', 'analyze', 'examine'],
    analysis: ['analyze', 'evaluate', 'assess', 'examine', 'inspect', 'review'],
    planning: ['plan', 'design', 'develop', 'create', 'build', 'construct'],
    execution: ['execute', 'implement', 'perform', 'carry out', 'do', 'complete'],
    evaluation: ['evaluate', 'assess', 'review', 'analyze', 'check', 'verify'],
    coordination: ['coordinate', 'organize', 'manage', 'arrange', 'synchronize', 'harmonize'],
    communication: ['communicate', 'inform', 'notify', 'report', 'update', 'share'],
    problem_solving: ['solve', 'fix', 'resolve', 'address', 'tackle', 'overcome']
  };

  /**
   * Detect task type based on input text
   */
  async detectTaskType(input: string): Promise<string> {
    const lowerInput = input.toLowerCase();
    const scores = new Map<string, number>();

    // Calculate score for each task type
    for (const [type, keywords] of Object.entries(this.taskTypeKeywords)) {
      const score = keywords.reduce((total, keyword) => {
        return total + (lowerInput.includes(keyword) ? 1 : 0);
      }, 0);
      if (score > 0) {
        scores.set(type, score);
      }
    }

    // Return type with highest score or 'general'
    if (scores.size === 0) {
      return 'general';
    }

    return Array.from(scores.entries())
      .sort(([,a], [,b]) => b - a)[0][0];
  }

  /**
   * Estimate task difficulty
   */
  async estimateDifficulty(input: string): Promise<number> {
    const lowerInput = input.toLowerCase();
    
    // Difficulty factors
    let difficulty = 0.5; // Base difficulty

    // Length-based difficulty
    const wordCount = input.split(' ').length;
    if (wordCount > 50) difficulty += 0.2;
    else if (wordCount < 10) difficulty -= 0.1;

    // Complexity keywords
    const complexKeywords = ['complex', 'difficult', 'challenging', 'hard', 'complicated', 'sophisticated'];
    const simpleKeywords = ['simple', 'easy', 'straightforward', 'basic', 'simple', 'easy'];

    for (const keyword of complexKeywords) {
      if (lowerInput.includes(keyword)) {
        difficulty += 0.1;
        break;
      }
    }

    for (const keyword of simpleKeywords) {
      if (lowerInput.includes(keyword)) {
        difficulty -= 0.1;
        break;
      }
    }

    // Task type-based difficulty adjustment
    const taskType = await this.detectTaskType(input);
    const typeDifficultyMap = {
      research: 0.2,
      analysis: 0.15,
      planning: 0.1,
      problem_solving: 0.25,
      coordination: 0.15,
      general: 0
    };

    difficulty += typeDifficultyMap[taskType as keyof typeof typeDifficultyMap] || 0;

    // Normalize to 0-1 range
    return Math.min(1, Math.max(0, difficulty));
  }

  /**
   * Get task requirements based on type
   */
  getTaskRequirements(type: string): string[] {
    const requirementsMap = {
      research: ['information_gathering', 'analysis', 'synthesis', 'evaluation'],
      analysis: ['data_collection', 'pattern_recognition', 'insight_generation', 'reporting'],
      planning: ['goal_setting', 'resource_allocation', 'timeline_creation', 'risk_assessment'],
      execution: ['resource_management', 'progress_tracking', 'problem_solving', 'quality_control'],
      evaluation: ['criteria_definition', 'data_collection', 'comparison_analysis', 'recommendation_generation'],
      coordination: ['communication', 'scheduling', 'conflict_resolution', 'resource_allocation'],
      communication: ['message_crafting', 'audience_analysis', 'channel_selection', 'feedback_reception'],
      problem_solving: ['problem_definition', 'root_cause_analysis', 'solution_generation', 'implementation_planning'],
      general: ['adaptability', 'resourcefulness', 'problem_solving', 'communication']
    };

    return requirementsMap[type as keyof typeof requirementsMap] || requirementsMap.general;
  }
}

export default TaskTypeDetector;