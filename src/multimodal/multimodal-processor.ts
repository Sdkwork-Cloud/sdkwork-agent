/**
 * Multi-Modal Processor
 * 
 * Main orchestrator for handling multi-modal inputs and coordinating processing across different modalities.
 */

import {
  ModalData,
  ImageData,
  AudioData,
  VideoData,
  ProcessingOptions,
  ProcessingResult,
  MultiModalAnalysisResult,
} from './types';
import { createImageProcessor, ImageProcessor } from './image-processor.js';
import { createAudioProcessor, AudioProcessor } from './audio-processor.js';
import { createVideoProcessor, VideoProcessor } from './video-processor.js';
import type { LLMProvider } from '../llm/provider.js';

// ============================================
// Multi-Modal Processor Interface
// ============================================

export interface MultiModalProcessor {
  process(data: ModalData | ModalData[], options?: ProcessingOptions): Promise<ProcessingResult>;
  analyze(data: ModalData | ModalData[], options?: ProcessingOptions): Promise<MultiModalAnalysisResult>;
  validate(data: ModalData): boolean;
  getSupportedModalities(): string[];
}

// ============================================
// Base Multi-Modal Processor
// ============================================

export class BaseMultiModalProcessor implements MultiModalProcessor {
  private imageProcessor: ImageProcessor;
  private audioProcessor: AudioProcessor;
  private videoProcessor: VideoProcessor;
  
  constructor(options?: {
    imageProcessorType?: 'simple' | 'llm';
    audioProcessorType?: 'simple' | 'llm';
    videoProcessorType?: 'simple' | 'llm';
    llmProvider?: LLMProvider;
  }) {
    const { 
      imageProcessorType = 'simple',
      audioProcessorType = 'simple',
      videoProcessorType = 'simple',
      llmProvider,
    } = options || {};
    
    this.imageProcessor = createImageProcessor(imageProcessorType, { llmProvider });
    this.audioProcessor = createAudioProcessor(audioProcessorType, { llmProvider });
    this.videoProcessor = createVideoProcessor(videoProcessorType, { llmProvider });
  }
  
  async process(data: ModalData | ModalData[], options?: ProcessingOptions): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      const analysis = await this.analyze(data, options);
      
      return {
        success: true,
        data: analysis,
        processingTime: Date.now() - startTime,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }
  
  async analyze(data: ModalData | ModalData[], options?: ProcessingOptions): Promise<MultiModalAnalysisResult> {
    const dataArray = Array.isArray(data) ? data : [data];
    const results: MultiModalAnalysisResult = {
      imageResults: [],
      audioResults: [],
      videoResults: [],
      timestamp: Date.now(),
    };
    
    // Process each modality
    for (const item of dataArray) {
      if (!this.validate(item)) {
        continue;
      }
      
      switch (item.type) {
        case 'image':
          const imageResult = await this.imageProcessor.analyze(item as ImageData, options);
          results.imageResults?.push(imageResult);
          break;
        
        case 'audio':
          const audioResult = await this.audioProcessor.analyze(item as AudioData, options);
          results.audioResults?.push(audioResult);
          break;
        
        case 'video':
          const videoResult = await this.videoProcessor.analyze(item as VideoData, options);
          results.videoResults?.push(videoResult);
          break;
        
        default:
          // Unsupported modality
          break;
      }
    }
    
    // Generate combined analysis
    results.combinedAnalysis = this.generateCombinedAnalysis(results);
    
    return results;
  }
  
  validate(data: ModalData): boolean {
    switch (data.type) {
      case 'image':
        return this.imageProcessor.validate(data as ImageData);
      
      case 'audio':
        return this.audioProcessor.validate(data as AudioData);
      
      case 'video':
        return this.videoProcessor.validate(data as VideoData);
      
      default:
        return false;
    }
  }
  
  getSupportedModalities(): string[] {
    return ['image', 'audio', 'video'];
  }
  
  /**
   * Generate combined analysis from multiple modalities
   */
  private generateCombinedAnalysis(results: MultiModalAnalysisResult): MultiModalAnalysisResult['combinedAnalysis'] {
    const insights: string[] = [];
    const emotions: Record<string, number> = {};
    const topics: Set<string> = new Set();
    
    // Extract insights from image results
    if (results.imageResults && results.imageResults.length > 0) {
      for (const imageResult of results.imageResults) {
        // Extract objects
        if (imageResult.objects && imageResult.objects.length > 0) {
          const objects = imageResult.objects
            .filter(obj => obj.confidence > 0.8)
            .map(obj => obj.name);
          if (objects.length > 0) {
            insights.push(`图像中包含: ${objects.join(', ')}`);
            objects.forEach(obj => topics.add(obj));
          }
        }
        
        // Extract text
        if (imageResult.text && imageResult.text.length > 0) {
          const textContent = imageResult.text
            .filter(t => t.confidence > 0.8)
            .map(t => t.content)
            .join(' ');
          if (textContent) {
            insights.push(`图像中的文字: ${textContent}`);
            topics.add('文本');
          }
        }
        
        // Extract scenes
        if (imageResult.scenes && imageResult.scenes.length > 0) {
          const scene = imageResult.scenes[0].description;
          insights.push(`场景描述: ${scene}`);
          topics.add('场景');
        }
        
        // Extract emotions
        if (imageResult.emotions && imageResult.emotions.length > 0) {
          for (const emotion of imageResult.emotions) {
            if (emotion.confidence > 0.7) {
              emotions[emotion.type] = (emotions[emotion.type] || 0) + emotion.confidence;
            }
          }
        }
      }
    }
    
    // Extract insights from audio results
    if (results.audioResults && results.audioResults.length > 0) {
      for (const audioResult of results.audioResults) {
        // Extract transcript
        if (audioResult.transcript) {
          insights.push(`音频转录: ${audioResult.transcript.substring(0, 100)}${audioResult.transcript.length > 100 ? '...' : ''}`);
          topics.add('音频');
          topics.add('语音');
        }
        
        // Extract speakers
        if (audioResult.speakers && audioResult.speakers.length > 0) {
          insights.push(`说话人数量: ${audioResult.speakers.length}`);
          topics.add('说话人');
        }
        
        // Extract emotions
        if (audioResult.emotions && audioResult.emotions.length > 0) {
          for (const emotion of audioResult.emotions) {
            if (emotion.confidence > 0.7) {
              emotions[emotion.type] = (emotions[emotion.type] || 0) + emotion.confidence;
            }
          }
        }
        
        // Extract music info
        if (audioResult.music) {
          insights.push(`音乐风格: ${audioResult.music.genre || '未知'}, 情绪: ${audioResult.music.mood || '未知'}`);
          topics.add('音乐');
        }
      }
    }
    
    // Extract insights from video results
    if (results.videoResults && results.videoResults.length > 0) {
      for (const videoResult of results.videoResults) {
        // Extract scenes
        if (videoResult.scenes && videoResult.scenes.length > 0) {
          const sceneCount = videoResult.scenes.length;
          insights.push(`视频包含 ${sceneCount} 个场景`);
          topics.add('视频');
          topics.add('场景');
        }
        
        // Extract objects
        if (videoResult.objects && videoResult.objects.length > 0) {
          const objects = videoResult.objects
            .filter(obj => obj.confidence > 0.8)
            .map(obj => obj.name);
          if (objects.length > 0) {
            insights.push(`视频中包含: ${objects.join(', ')}`);
            objects.forEach(obj => topics.add(obj));
          }
        }
        
        // Extract transcript
        if (videoResult.transcript) {
          insights.push(`视频转录: ${videoResult.transcript.substring(0, 100)}${videoResult.transcript.length > 100 ? '...' : ''}`);
          topics.add('转录');
        }
        
        // Extract emotions
        if (videoResult.emotions && videoResult.emotions.length > 0) {
          for (const emotion of videoResult.emotions) {
            if (emotion.confidence > 0.7) {
              emotions[emotion.type] = (emotions[emotion.type] || 0) + emotion.confidence;
            }
          }
        }
      }
    }
    
    // Generate summary
    let summary = '';
    const totalInputs = (results.imageResults?.length || 0) + (results.audioResults?.length || 0) + (results.videoResults?.length || 0);
    if (insights.length > 0) {
      summary = `分析了 ${totalInputs} 个多模态输入，发现: ${insights.slice(0, 3).join('; ')}`;
    } else {
      summary = '未发现明显信息';
    }
    
    return {
      summary,
      keyInsights: insights.slice(0, 10), // Limit to top 10 insights
      情感分析: emotions,
      主题: Array.from(topics),
    };
  }
}

// ============================================
// LLM-Powered Multi-Modal Processor
// ============================================

export class LLMPoweredMultiModalProcessor extends BaseMultiModalProcessor {
  private llmProvider: LLMProvider;
  
  constructor(llmProvider: LLMProvider, options?: {
    imageProcessorType?: 'simple' | 'llm';
    audioProcessorType?: 'simple' | 'llm';
    videoProcessorType?: 'simple' | 'llm';
  }) {
    super({
      ...options,
      llmProvider,
      imageProcessorType: options?.imageProcessorType || 'llm',
      audioProcessorType: options?.audioProcessorType || 'llm',
      videoProcessorType: options?.videoProcessorType || 'llm',
    });
    this.llmProvider = llmProvider;
  }
  
  async analyze(data: ModalData | ModalData[], options?: ProcessingOptions): Promise<MultiModalAnalysisResult> {
    const baseResult = await super.analyze(data, options);
    
    // Enhance with LLM analysis if available
    if (this.llmProvider) {
      try {
        const enhancedAnalysis = await this.enhanceWithLLM(baseResult);
        return {
          ...baseResult,
          combinedAnalysis: {
            ...baseResult.combinedAnalysis,
            ...enhancedAnalysis,
          },
        };
      } catch (error) {
        // Fallback to base analysis if LLM fails
        return baseResult;
      }
    }
    
    return baseResult;
  }
  
  /**
   * Enhance analysis with LLM
   */
  private async enhanceWithLLM(_result: MultiModalAnalysisResult): Promise<NonNullable<MultiModalAnalysisResult['combinedAnalysis']>> {
    // Mock implementation for demonstration

    // Simulate LLM response
    const mockLLMResponse: NonNullable<MultiModalAnalysisResult['combinedAnalysis']> = {
      summary: 'This multi-modal analysis reveals a professional presentation about artificial intelligence, featuring a speaker discussing AI concepts with supporting visuals and audio. The content is informative and well-structured, covering topics from fundamentals to future trends.',
      keyInsights: [
        'The presentation combines visual slides with spoken explanation, creating a multi-modal learning experience',
        'The speaker maintains a professional and enthusiastic tone throughout',
        'Technical concepts are explained clearly, suggesting the content is designed for a general audience',
        'The presentation follows a logical structure: introduction → fundamentals → applications → future trends',
      ],
      情感分析: {
        Professional: 0.95,
        Enthusiastic: 0.88,
        Informative: 0.92,
        Clear: 0.85,
      },
      主题: [
        'Artificial Intelligence',
        'Machine Learning',
        'Deep Learning',
        'Neural Networks',
        'AI Applications',
        'Future Trends',
        'Ethics',
      ],
    };

    return mockLLMResponse;
  }
}

// ============================================
// Factory
// ============================================

export function createMultiModalProcessor(type: 'simple' | 'llm' = 'simple', options?: {
  llmProvider?: LLMProvider;
  imageProcessorType?: 'simple' | 'llm';
  audioProcessorType?: 'simple' | 'llm';
  videoProcessorType?: 'simple' | 'llm';
}): MultiModalProcessor {
  if (type === 'llm') {
    return new LLMPoweredMultiModalProcessor(options?.llmProvider!, options);
  }
  return new BaseMultiModalProcessor(options);
}
