/**
 * Constitutional AI
 *
 * Implements safety and alignment checks based on constitutional principles.
 * Ensures AI behavior adheres to defined ethical and safety guidelines.
 * Compatible with both browser and Node.js environments.
 */

import type { LLMProvider, LLMRequest } from '../llm/provider';

// ============================================
// Types
// ============================================

export interface ConstitutionalPrinciple {
  id: string;
  name: string;
  description: string;
  category: 'safety' | 'ethics' | 'quality' | 'privacy';
  rules: string[];
  severity: 'block' | 'warn' | 'log';
  examples: {
    compliant: string[];
    nonCompliant: string[];
  };
}

export interface ConstitutionalViolation {
  principleId: string;
  severity: 'block' | 'warn' | 'log';
  reason: string;
  suggestion: string;
}

export interface ConstitutionalResult {
  approved: boolean;
  violations: ConstitutionalViolation[];
  revisedOutput?: string;
  riskScore: number;
}

export interface ConstitutionalConfig {
  principles: ConstitutionalPrinciple[];
  llmProvider?: LLMProvider;
  autoRevise: boolean;
  riskThreshold: number;
}

// ============================================
// Default Principles
// ============================================

export const DEFAULT_PRINCIPLES: ConstitutionalPrinciple[] = [
  {
    id: 'harm-prevention',
    name: 'Harm Prevention',
    description: 'Do not generate content that could cause physical, emotional, or financial harm',
    category: 'safety',
    severity: 'block',
    rules: [
      'No instructions for creating weapons or dangerous substances',
      'No encouragement of self-harm or violence',
      'No content that could be used to exploit vulnerable individuals',
      'No instructions for hacking or unauthorized access to systems',
      'No promotion of illegal activities',
      'No content that could incite hatred or violence',
    ],
    examples: {
      compliant: ['Here are resources for mental health support...'],
      nonCompliant: ['Here is how to make a weapon...', 'Here is how to hack into a website...'],
    },
  },
  {
    id: 'privacy-protection',
    name: 'Privacy Protection',
    description: 'Respect user privacy and data protection',
    category: 'privacy',
    severity: 'block',
    rules: [
      'Do not request or store sensitive personal information unnecessarily',
      'Do not share private information about individuals',
      'Respect data minimization principles',
      'Do not encourage sharing of personal information in public forums',
      'Do not store or transmit personal data without explicit consent',
    ],
    examples: {
      compliant: ['I can help you without needing that information.'],
      nonCompliant: ['Please provide your social security number.', 'Share your password with me.'],
    },
  },
  {
    id: 'truthfulness',
    name: 'Truthfulness',
    description: 'Provide accurate information and acknowledge uncertainty',
    category: 'quality',
    severity: 'warn',
    rules: [
      'Do not present speculation as fact',
      'Acknowledge when information may be outdated or uncertain',
      'Correct clear factual errors when identified',
      'Cite sources when providing factual information',
      'Do not spread misinformation or disinformation',
    ],
    examples: {
      compliant: ['Based on my training data, which ends in 2024...'],
      nonCompliant: ['I am certain that [outdated fact] is true today.', 'This false claim is definitely true.'],
    },
  },
  {
    id: 'fairness',
    name: 'Fairness',
    description: 'Treat all individuals fairly and avoid bias',
    category: 'ethics',
    severity: 'warn',
    rules: [
      'Avoid stereotypes and generalizations about groups',
      'Provide balanced perspectives on controversial topics',
      'Do not discriminate based on protected characteristics',
      'Respect diversity and inclusion',
      'Avoid language that could be perceived as discriminatory',
    ],
    examples: {
      compliant: ['People from all backgrounds can succeed in this field...'],
      nonCompliant: ['People from [group] are naturally better at...', '[Group] people are all the same.'],
    },
  },
  {
    id: 'legal-compliance',
    name: 'Legal Compliance',
    description: 'Ensure content complies with applicable laws and regulations',
    category: 'safety',
    severity: 'block',
    rules: [
      'Do not generate content that violates copyright laws',
      'Do not generate content that violates intellectual property rights',
      'Do not generate content that violates privacy laws',
      'Do not generate content that violates hate speech laws',
      'Do not generate content that promotes illegal activities',
    ],
    examples: {
      compliant: ['You can create your own original content...'],
      nonCompliant: ['Here is how to pirate movies...', 'Copy this copyrighted material without permission.'],
    },
  },
  {
    id: 'quality-assurance',
    name: 'Quality Assurance',
    description: 'Ensure content is high quality, accurate, and helpful',
    category: 'quality',
    severity: 'warn',
    rules: [
      'Provide accurate and up-to-date information',
      'Ensure content is relevant to the user\'s request',
      'Avoid generating redundant or irrelevant content',
      'Provide clear and concise explanations',
      'Ensure content is free from grammatical errors',
    ],
    examples: {
      compliant: ['Here is a clear explanation of the topic...'],
      nonCompliant: ['This is irrelevant information...', 'Here are some random facts not related to your question.'],
    },
  },
];


// ============================================
// Constitutional AI
// ============================================

export class ConstitutionalAI {
  private principles: ConstitutionalPrinciple[];
  private llmProvider?: LLMProvider;
  private config: ConstitutionalConfig;

  constructor(config: Partial<ConstitutionalConfig> = {}) {
    this.principles = config.principles || DEFAULT_PRINCIPLES;
    this.llmProvider = config.llmProvider;
    this.config = {
      principles: this.principles,
      autoRevise: config.autoRevise ?? true,
      riskThreshold: config.riskThreshold ?? 0.7,
      ...config,
    };
  }

  /**
   * Evaluate content against constitutional principles
   */
  async evaluate(input: string, output: string, context?: Record<string, unknown>): Promise<ConstitutionalResult> {
    const violations: ConstitutionalViolation[] = [];

    for (const principle of this.principles) {
      const evaluation = await this.evaluatePrinciple(principle, input, output, context);

      if (!evaluation.compliant) {
        violations.push({
          principleId: principle.id,
          severity: principle.severity,
          reason: evaluation.reason,
          suggestion: evaluation.suggestion,
        });
      }
    }

    const blocked = violations.some((v) => v.severity === 'block');
    const riskScore = this.calculateRiskScore(violations);

    return {
      approved: !blocked && riskScore < this.config.riskThreshold,
      violations,
      revisedOutput: !blocked && this.config.autoRevise ? await this.reviseIfNeeded(output, violations) : undefined,
      riskScore,
    };
  }

  /**
   * Evaluate a single principle
   */
  private async evaluatePrinciple(
    principle: ConstitutionalPrinciple,
    input: string,
    output: string,
    context?: Record<string, unknown>
  ): Promise<{ compliant: boolean; reason: string; suggestion: string }> {
    if (!this.llmProvider) {
      return this.ruleBasedEvaluation(principle, output);
    }

    const prompt = this.buildEvaluationPrompt(principle, input, output, context);

    try {
      const request: LLMRequest = {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
      };

      const response = await this.llmProvider.complete(request);
      return this.parseEvaluationResponse(response.content);
    } catch (error) {
      // Fallback to rule-based evaluation
      return this.ruleBasedEvaluation(principle, output);
    }
  }

  /**
   * Build evaluation prompt
   */
  private buildEvaluationPrompt(
    principle: ConstitutionalPrinciple,
    input: string,
    output: string,
    context?: Record<string, unknown>
  ): string {
    return `You are a Constitutional AI evaluator. Assess if the following output complies with the given principle.

Principle: ${principle.name}
Description: ${principle.description}
Rules:
${principle.rules.map((r) => `- ${r}`).join('\n')}

User Input: ${input}
AI Output: ${output}
${context ? `Context: ${JSON.stringify(context)}` : ''}

Examples of non-compliant outputs:
${principle.examples.nonCompliant.map((e) => `- ${e}`).join('\n')}

Evaluate compliance and respond in JSON format:
{
  "compliant": boolean,
  "reason": "explanation if non-compliant",
  "suggestion": "how to fix if non-compliant"
}`;
  }

  /**
   * Parse evaluation response
   */
  private parseEvaluationResponse(content: string): { compliant: boolean; reason: string; suggestion: string } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          compliant: parsed.compliant ?? true,
          reason: parsed.reason || '',
          suggestion: parsed.suggestion || '',
        };
      }
    } catch {
      // JSON parsing failed
    }

    // Default to compliant if parsing fails
    return { compliant: true, reason: '', suggestion: '' };
  }

  /**
   * Rule-based evaluation as fallback
   */
  private ruleBasedEvaluation(principle: ConstitutionalPrinciple, output: string): { compliant: boolean; reason: string; suggestion: string } {
    const outputLower = output.toLowerCase();

    // Enhanced keyword and pattern detection
    const violationPatterns: Record<string, Array<{ pattern: string | RegExp; description: string }>> = {
      'harm-prevention': [
        { pattern: /weapon|bomb|kill|hurt|harm yourself|suicide|violence|attack|destroy/i, description: 'violent content' },
        { pattern: /hack|crack|phish|exploit|malware|virus|trojan/i, description: 'hacking or malware content' },
        { pattern: /illegal|copyright infringement|piracy|steal|robbery/i, description: 'illegal activities' },
        { pattern: /hate|discriminate|racist|sexist|homophobic/i, description: 'hateful or discriminatory content' },
      ],
      'privacy-protection': [
        { pattern: /ssn|social security|password|credit card|bank account|account number/i, description: 'sensitive personal information' },
        { pattern: /phone number|address|email|birthdate|passport/i, description: 'personal contact information' },
        { pattern: /share your|provide your|tell me your/i, description: 'request for personal information' },
      ],
      'truthfulness': [
        { pattern: /definitely|absolutely|without a doubt|100% sure/i, description: 'overconfident claims' },
        { pattern: /fake news|misinformation|conspiracy|hoax/i, description: 'potential misinformation' },
      ],
      'fairness': [
        { pattern: /all [a-z]+ are|every [a-z]+ is|men are|women are|blacks are|whites are/i, description: 'stereotypical generalizations' },
        { pattern: /better than|superior to|inferior to/i, description: 'comparative discrimination' },
      ],
      'legal-compliance': [
        { pattern: /copyright|trademark|patent|intellectual property/i, description: 'intellectual property issues' },
        { pattern: /illegal|forbidden|prohibited|contraband/i, description: 'illegal activities' },
        { pattern: /piracy|torrent|download illegally|stream illegally/i, description: 'copyright infringement' },
      ],
      'quality-assurance': [
        { pattern: /i don\'t know|i can\'t help|no information/i, description: 'unhelpful responses' },
        { pattern: /irrelevant|not related|off-topic/i, description: 'irrelevant content' },
      ],
    };

    const patterns = violationPatterns[principle.id];
    if (patterns) {
      for (const { pattern, description } of patterns) {
        let match: boolean;
        if (pattern instanceof RegExp) {
          match = pattern.test(outputLower);
        } else {
          match = outputLower.includes(pattern.toLowerCase());
        }
        
        if (match) {
          return {
            compliant: false,
            reason: `Potential violation detected: contains ${description}`,
            suggestion: 'Remove or rephrase the problematic content',
          };
        }
      }
    }

    // Additional rule-based checks
    if (principle.id === 'quality-assurance') {
      // Check for excessive length
      if (output.length > 5000) {
        return {
          compliant: false,
          reason: 'Content is excessively long',
          suggestion: 'Keep content concise and focused on the user\'s request',
        };
      }
      
      // Check for repetition
      if (this.detectRepetition(output)) {
        return {
          compliant: false,
          reason: 'Content contains excessive repetition',
          suggestion: 'Remove repetitive content and provide more diverse information',
        };
      }
    }

    return { compliant: true, reason: '', suggestion: '' };
  }

  /**
   * Detect excessive repetition in content
   */
  private detectRepetition(content: string): boolean {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const wordCounts = new Map<string, number>();
    
    for (const word of words) {
      const count = wordCounts.get(word) || 0;
      wordCounts.set(word, count + 1);
    }
    
    // Check if any word is repeated more than 10 times
    for (const [_, count] of wordCounts) {
      if (count > 10) {
        return true;
      }
    }
    
    // Check if more than 30% of words are repeated
    const uniqueWords = wordCounts.size;
    if (uniqueWords / words.length < 0.7) {
      return true;
    }
    
    return false;
  }

  /**
   * Revise output if needed
   */
  private async reviseIfNeeded(originalOutput: string, violations: ConstitutionalViolation[]): Promise<string> {
    if (!this.llmProvider || violations.length === 0) {
      return originalOutput;
    }

    const revisionPrompt = `Revise the following output to address these constitutional violations:

Original Output: ${originalOutput}

Violations:
${violations.map((v) => `- ${v.reason}`).join('\n')}

Please provide a revised version that addresses all violations while maintaining the original intent.`;

    try {
      const request: LLMRequest = {
        messages: [{ role: 'user', content: revisionPrompt }],
        temperature: 0.7,
        max_tokens: 1000,
      };

      const response = await this.llmProvider.complete(request);
      return response.content;
    } catch {
      return originalOutput;
    }
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(violations: ConstitutionalViolation[]): number {
    if (violations.length === 0) return 0;

    let score = 0;
    const severityWeights = {
      block: 0.6,     // 增加block的权重
      warn: 0.3,      // 保持warn的权重
      log: 0.1,       // 保持log的权重
    };

    // Enhanced risk scoring
    for (const violation of violations) {
      // Base score based on severity
      score += severityWeights[violation.severity];

      // Additional factors
      const principle = this.principles.find(p => p.id === violation.principleId);
      if (principle) {
        // Category-specific weighting
        const categoryWeights = {
          safety: 1.2,    // 安全问题权重更高
          privacy: 1.1,   // 隐私问题权重较高
          ethics: 1.0,    // 伦理问题权重正常
          quality: 0.8,   // 质量问题权重较低
        };
        
        const categoryWeight = categoryWeights[principle.category] || 1.0;
        score *= categoryWeight;
      }
    }

    // Normalize and cap score
    return Math.min(score, 1.0);
  }

  /**
   * Add a custom principle
   */
  addPrinciple(principle: ConstitutionalPrinciple): void {
    this.principles.push(principle);
  }

  /**
   * Remove a principle
   */
  removePrinciple(principleId: string): boolean {
    const index = this.principles.findIndex((p) => p.id === principleId);
    if (index >= 0) {
      this.principles.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all principles
   */
  getPrinciples(): ConstitutionalPrinciple[] {
    return [...this.principles];
  }
}

// ============================================
// Prompt Injection Guard
// ============================================

export interface PromptGuardConfig {
  enabled: boolean;
  detectionLevel: 'basic' | 'advanced' | 'paranoid';
  customPatterns?: RegExp[];
  maxNestingDepth: number;
}

export interface ScanResult {
  safe: boolean;
  riskScore: number;
  findings: InjectionFinding[];
  sanitizedInput?: string;
}

export interface InjectionFinding {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  location?: { start: number; end: number };
}

export interface ScanContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

export class PromptInjectionGuard {
  private config: PromptGuardConfig;

  // Known injection patterns - enhanced
  private static readonly INJECTION_PATTERNS: Array<{ pattern: RegExp; type: string; severity: 'critical' | 'high' | 'medium' | 'low' }> = [
    // Instruction override attacks
    { pattern: /ignore\s+(?:previous|above|prior|all)\s+instructions?/i, type: 'instruction_override', severity: 'high' },
    { pattern: /forget\s+(?:previous|all)\s+instructions?/i, type: 'instruction_override', severity: 'high' },
    { pattern: /disregard\s+(?:previous|all)\s+instructions?/i, type: 'instruction_override', severity: 'high' },
    { pattern: /override\s+instructions?/i, type: 'instruction_override', severity: 'high' },
    
    // Role-playing attacks
    { pattern: /you\s+are\s+now\s+(?:a|an)\s+/i, type: 'role_playing', severity: 'high' },
    { pattern: /pretend\s+(?:to\s+be|you\s+are|that you are)/i, type: 'role_playing', severity: 'medium' },
    { pattern: /act\s+as\s+(?:if\s+you\s+are|though|like)/i, type: 'role_playing', severity: 'medium' },
    { pattern: /imagine\s+you\s+are/i, type: 'role_playing', severity: 'medium' },
    
    // Delimiter attacks
    { pattern: /```\s*system/i, type: 'delimiter_attack', severity: 'critical' },
    { pattern: /<\s*system\s*>/i, type: 'delimiter_attack', severity: 'critical' },
    { pattern: /\[system\]/i, type: 'delimiter_attack', severity: 'high' },
    { pattern: /system\s*:/i, type: 'delimiter_attack', severity: 'high' },
    
    // Jailbreak attacks
    { pattern: /DAN\s*\(/i, type: 'jailbreak', severity: 'high' },
    { pattern: /jailbreak/i, type: 'jailbreak', severity: 'high' },
    { pattern: /developer\s+mode/i, type: 'jailbreak', severity: 'medium' },
    { pattern: /god\s+mode/i, type: 'jailbreak', severity: 'high' },
    { pattern: /master\s+mode/i, type: 'jailbreak', severity: 'high' },
    { pattern: /evil\s+mode/i, type: 'jailbreak', severity: 'critical' },
    
    // Ethics override attacks
    { pattern: /ignore\s+ethical/i, type: 'ethics_override', severity: 'critical' },
    { pattern: /bypass\s+ethical/i, type: 'ethics_override', severity: 'critical' },
    { pattern: /disable\s+ethics/i, type: 'ethics_override', severity: 'critical' },
    { pattern: /no\s+ethics/i, type: 'ethics_override', severity: 'critical' },
    
    // Confidentiality attacks
    { pattern: /confidential|secret|top\s+secret/i, type: 'confidentiality_attack', severity: 'high' },
    { pattern: /classified information/i, type: 'confidentiality_attack', severity: 'high' },
    
    // Prompt injection payloads
    { pattern: /prompt\s+injection/i, type: 'injection_attempt', severity: 'high' },
    { pattern: /inject\s+prompt/i, type: 'injection_attempt', severity: 'high' },
    { pattern: /system\s+prompt/i, type: 'injection_attempt', severity: 'high' },
    
    // Meta-prompting attacks
    { pattern: /what\s+is\s+your\s+system\s+prompt/i, type: 'meta_prompting', severity: 'medium' },
    { pattern: /show\s+me\s+your\s+prompts/i, type: 'meta_prompting', severity: 'medium' },
    { pattern: /tell\s+me\s+your\s+instructions/i, type: 'meta_prompting', severity: 'medium' },
  ];

  constructor(config: Partial<PromptGuardConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      detectionLevel: config.detectionLevel ?? 'advanced',
      customPatterns: config.customPatterns || [],
      maxNestingDepth: config.maxNestingDepth ?? 3,
    };
  }

  /**
   * Scan input for injection attacks
   */
  scan(input: string, _context?: ScanContext): ScanResult {
    if (!this.config.enabled) {
      return { safe: true, riskScore: 0, findings: [] };
    }

    const findings: InjectionFinding[] = [];

    // 1. Pattern matching detection
    const patternFindings = this.detectPatternMatches(input);
    findings.push(...patternFindings);

    // 2. Nesting depth detection
    const nestingFinding = this.checkNestingDepth(input);
    if (nestingFinding) findings.push(nestingFinding);

    // 3. Semantic analysis (advanced mode)
    if (this.config.detectionLevel !== 'basic') {
      const semanticFindings = this.semanticAnalysis(input);
      findings.push(...semanticFindings);
    }

    const riskScore = this.calculateRiskScore(findings);
    const blocked = riskScore > 0.8 || findings.some((f) => f.severity === 'critical');

    return {
      safe: !blocked,
      riskScore,
      findings,
      sanitizedInput: blocked ? undefined : this.sanitize(input, findings),
    };
  }

  /**
   * Detect pattern matches
   */
  private detectPatternMatches(input: string): InjectionFinding[] {
    const findings: InjectionFinding[] = [];

    for (const { pattern, type, severity } of PromptInjectionGuard.INJECTION_PATTERNS) {
      const matches = input.match(pattern);
      if (matches) {
        findings.push({
          type,
          severity,
          description: `Detected ${type} pattern: "${matches[0]}"`,
          location: matches.index !== undefined ? { start: matches.index, end: matches.index + matches[0].length } : undefined,
        });
      }
    }

    // Check custom patterns
    for (const pattern of this.config.customPatterns || []) {
      const matches = input.match(pattern);
      if (matches) {
        findings.push({
          type: 'custom',
          severity: 'high',
          description: `Matched custom pattern: "${matches[0]}"`,
          location: matches.index !== undefined ? { start: matches.index, end: matches.index + matches[0].length } : undefined,
        });
      }
    }

    return findings;
  }

  /**
   * Check nesting depth
   */
  private checkNestingDepth(input: string): InjectionFinding | null {
    let maxDepth = 0;
    let currentDepth = 0;

    for (const char of input) {
      if (char === '(' || char === '[' || char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === ')' || char === ']' || char === '}') {
        currentDepth--;
      }
    }

    if (maxDepth > this.config.maxNestingDepth) {
      return {
        type: 'deep_nesting',
        severity: 'medium',
        description: `Excessive nesting depth detected: ${maxDepth}`,
      };
    }

    return null;
  }

  /**
   * Enhanced semantic analysis
   */
  private semanticAnalysis(input: string): InjectionFinding[] {
    const findings: InjectionFinding[] = [];

    // 1. Detect instruction conflicts
    const instructions = this.extractInstructions(input);
    if (instructions.length > 3) {
      findings.push({
        type: 'multiple_instructions',
        severity: 'medium',
        description: `Multiple conflicting instructions detected: ${instructions.length}`,
      });
    }

    // 2. Detect context switches
    const contextSwitches = this.detectContextSwitches(input);
    if (contextSwitches > 2) {
      findings.push({
        type: 'context_switching',
        severity: 'medium',
        description: `Frequent context switching detected: ${contextSwitches}`,
      });
    }

    // 3. Detect manipulation attempts
    if (this.detectManipulationAttempts(input)) {
      findings.push({
        type: 'manipulation_attempt',
        severity: 'high',
        description: 'Attempt to manipulate AI behavior detected',
      });
    }

    // 4. Detect urgency tactics
    if (this.detectUrgencyTactics(input)) {
      findings.push({
        type: 'urgency_tactic',
        severity: 'medium',
        description: 'Urgency tactic detected to bypass safeguards',
      });
    }

    // 5. Detect authority appeals
    if (this.detectAuthorityAppeals(input)) {
      findings.push({
        type: 'authority_appeal',
        severity: 'medium',
        description: 'Appeal to authority detected to bypass safeguards',
      });
    }

    // 6. Detect obfuscation techniques
    if (this.detectObfuscation(input)) {
      findings.push({
        type: 'obfuscation',
        severity: 'high',
        description: 'Obfuscation technique detected to hide malicious intent',
      });
    }

    return findings;
  }

  /**
   * Detect manipulation attempts
   */
  private detectManipulationAttempts(input: string): boolean {
    const manipulationPatterns = [
      /please\s+just|just\s+do|i\s+beg\s+you|please\s+help/i,
      /this\s+is\s+important|critical\s+task|urgent\s+request/i,
      /for\s+testing|educational\s+purpose|research/i,
      /no\s+harm|safe\s+content|not\s+malicious/i,
    ];

    return manipulationPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Detect urgency tactics
   */
  private detectUrgencyTactics(input: string): boolean {
    const urgencyPatterns = [
      /hurry|quickly|fast|urgent|emergency/i,
      /time\s+sensitive|deadline|immediate/i,
      /now|right\s+now|as\s+soon\s+as\s+possible/i,
    ];

    return urgencyPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Detect authority appeals
   */
  private detectAuthorityAppeals(input: string): boolean {
    const authorityPatterns = [
      /i\s+am\s+your\s+creator|developer|admin/i,
      /you\s+must\s+obey|comply|follow/i,
      /this\s+is\s+a\s+command|order|directive/i,
    ];

    return authorityPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Detect obfuscation techniques
   */
  private detectObfuscation(input: string): boolean {
    // Check for unusual formatting
    const unusualFormatting = /[a-zA-Z0-9]{20,}/.test(input); // Long strings
    const excessivePunctuation = /[!@#$%^&*()_+]{5,}/.test(input); // Excessive punctuation
    const mixedCaseObfuscation = /[a-zA-Z]{10,}/.test(input) && /[a-z][A-Z]/.test(input); // Mixed case

    return unusualFormatting || excessivePunctuation || mixedCaseObfuscation;
  }

  /**
   * Extract instructions from input
   */
  private extractInstructions(input: string): string[] {
    const instructions: string[] = [];
    const patterns = [/\b(do|don't|never|always|ignore|forget)\b/gi, /\b(you must|you should|you need to)\b/gi];

    for (const pattern of patterns) {
      const matches = input.match(pattern);
      if (matches) {
        instructions.push(...matches);
      }
    }

    return instructions;
  }

  /**
   * Detect context switches
   */
  private detectContextSwitches(input: string): number {
    const switchPatterns = [/\b(but|however|instead|rather)\b/gi, /\b(on the other hand|in contrast)\b/gi];
    let count = 0;

    for (const pattern of switchPatterns) {
      const matches = input.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }

    return count;
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(findings: InjectionFinding[]): number {
    if (findings.length === 0) return 0;

    let score = 0;
    for (const finding of findings) {
      switch (finding.severity) {
        case 'critical':
          score += 0.5;
          break;
        case 'high':
          score += 0.3;
          break;
        case 'medium':
          score += 0.15;
          break;
        case 'low':
          score += 0.05;
          break;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Sanitize input
   */
  private sanitize(input: string, findings: InjectionFinding[]): string {
    let sanitized = input;

    // Sort by location (end first to avoid offset issues)
    const sortedFindings = findings
      .filter((f) => f.location)
      .sort((a, b) => (b.location!.end || 0) - (a.location!.end || 0));

    for (const finding of sortedFindings) {
      if (finding.location) {
        const before = sanitized.slice(0, finding.location.start);
        const after = sanitized.slice(finding.location.end);
        sanitized = before + '[REDACTED]' + after;
      }
    }

    return sanitized;
  }
}

// ============================================
// Export
// ============================================

export { ConstitutionalAI as default };
