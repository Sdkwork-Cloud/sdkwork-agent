/**
 * Multi-Modal Types
 * 
 * Defines types for various modalities and processing results.
 */

// ============================================
// Base Modal Types
// ============================================

export interface ModalData {
  type: string;
  data: unknown;
  metadata?: Record<string, unknown>;
}

// ============================================
// Image Types
// ============================================

export interface ImageData extends ModalData {
  type: 'image';
  data: string; // Base64 or URL
  metadata: {
    format?: string;
    width?: number;
    height?: number;
    size?: number;
    source?: string;
  };
}

export interface ImageAnalysisResult {
  objects: Array<{
    name: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  text: Array<{
    content: string;
    confidence: number;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  scenes: Array<{
    description: string;
    confidence: number;
  }>;
  emotions: Array<{
    type: string;
    confidence: number;
  }>;
  colorPalette?: Array<{
    color: string;
    percentage: number;
  }>;
}

// ============================================
// Audio Types
// ============================================

export interface AudioData extends ModalData {
  type: 'audio';
  data: string; // Base64 or URL
  metadata: {
    format?: string;
    duration?: number;
    sampleRate?: number;
    channels?: number;
    size?: number;
    source?: string;
  };
}

export interface AudioAnalysisResult {
  transcript: string;
  speakers: Array<{
    id: string;
    segments: Array<{
      text: string;
      startTime: number;
      endTime: number;
      confidence: number;
    }>;
  }>;
  emotions: Array<{
    type: string;
    confidence: number;
    startTime: number;
    endTime: number;
  }>;
  music?: {
    genre?: string;
    tempo?: number;
    mood?: string;
  };
  noiseLevel?: string;
}

// ============================================
// Video Types
// ============================================

export interface VideoData extends ModalData {
  type: 'video';
  data: string; // URL or path
  metadata: {
    format?: string;
    duration?: number;
    width?: number;
    height?: number;
    fps?: number;
    size?: number;
    source?: string;
  };
}

export interface VideoAnalysisResult {
  scenes: Array<{
    startTime: number;
    endTime: number;
    description: string;
    keyframes: Array<{
      timestamp: number;
      image: string; // Base64
      description: string;
    }>;
  }>;
  objects: Array<{
    name: string;
    confidence: number;
    occurrences: Array<{
      startTime: number;
      endTime: number;
      boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
  }>;
  transcript: string;
  speakers: Array<{
    id: string;
    segments: Array<{
      text: string;
      startTime: number;
      endTime: number;
      confidence: number;
    }>;
  }>;
  emotions: Array<{
    type: string;
    confidence: number;
    startTime: number;
    endTime: number;
  }>;
}

// ============================================
// Processing Types
// ============================================

export interface ProcessingOptions {
  detailLevel?: 'low' | 'medium' | 'high';
  timeout?: number;
  maxResults?: number;
  [key: string]: unknown;
}

export interface ProcessingResult {
  success: boolean;
  data: unknown;
  error?: string;
  processingTime: number;
  timestamp: number;
}

export interface MultiModalAnalysisResult {
  imageResults?: ImageAnalysisResult[];
  audioResults?: AudioAnalysisResult[];
  videoResults?: VideoAnalysisResult[];
  combinedAnalysis?: {
    summary: string;
    keyInsights: string[];
   情感分析?: Record<string, number>;
   主题?: string[];
  };
  timestamp: number;
}
