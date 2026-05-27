export type FitMode = 'stretch' | 'fit' | 'fill';

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ResizePreset {
  id: string;
  name: string;
  category: 'Social' | 'Web' | 'Custom';
  width: number;
  height: number;
  icon?: string;
}

export interface BackgroundImage {
  id: string;
  dataUrl: string;
  name: string;
}

export interface TaskHistoryItem {
  id: string;
  fileName: string;
  originalFormat: string;
  originalSize: number;
  resizedSize: number;
  originalWidth: number;
  originalHeight: number;
  resizedWidth: number;
  resizedHeight: number;
  quality: number;
  timestamp: string;
  downloadUrl: string; // The resized WebP data URL
}
