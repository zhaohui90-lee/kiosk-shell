/**
 * Update related type definitions
 */

export type SlotId = 'slot-a' | 'slot-b';

export interface SlotInfo {
  id: SlotId;
  version: string;
  hash: string;
  updatedAt: string;
  isActive: boolean;
}

export interface UpdateManifest {
  version: string;
  hash: string;
  url: string;
  releaseNotes?: string;
  mandatory?: boolean;
}

export interface UpdateProgress {
  phase: 'downloading' | 'verifying' | 'extracting' | 'switching';
  percent: number;
  bytesDownloaded?: number;
  totalBytes?: number;
}

export interface UpdateResult {
  success: boolean;
  version?: string;
  error?: string;
  rollbackPerformed?: boolean;
}
