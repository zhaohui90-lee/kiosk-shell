/**
 * Resource loader module
 * Handles static resource loading, path resolution, and A/B slot management
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { getLogger } from '@kiosk/logger';
import type { LoaderConfig, SlotId, SlotInfo } from './types';

const logger = getLogger().child('core:loader');

/**
 * Default slot configuration file name
 */
const ACTIVE_SLOT_FILE = 'active.json';

/**
 * Default entry file
 */
const DEFAULT_ENTRY_FILE = 'index.html';

/**
 * ResourceLoader class
 * Manages loading of static resources from local file system
 */
export class ResourceLoader {
  private config: LoaderConfig;
  private activeSlot: SlotId = 'slot-a';
  private isInitialized = false;

  constructor(config: LoaderConfig) {
    this.config = {
      entryFile: DEFAULT_ENTRY_FILE,
      useKioskProtocol: true,
      enableSlotSwitching: false,
      ...config,
    };
  }

  /**
   * Initialize the loader
   * Reads active slot configuration if slot switching is enabled
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('ResourceLoader already initialized');
      return;
    }

    logger.info('Initializing ResourceLoader', {
      basePath: this.config.basePath,
      enableSlotSwitching: this.config.enableSlotSwitching,
    });

    // Verify base path exists
    if (!this.pathExists(this.config.basePath)) {
      logger.warn('Base path does not exist, creating', { basePath: this.config.basePath });
      await fs.promises.mkdir(this.config.basePath, { recursive: true });
    }

    // Load active slot if slot switching is enabled
    if (this.config.enableSlotSwitching) {
      await this.loadActiveSlot();
    }

    this.isInitialized = true;
    logger.info('ResourceLoader initialized', { activeSlot: this.activeSlot });
  }

  /**
   * Get the URL for loading resources
   */
  getEntryURL(): string {
    const resourcePath = this.getResourcePath();
    const entryPath = path.join(resourcePath, this.config.entryFile!);

    if (this.config.useKioskProtocol) {
      // Use kiosk:// protocol
      return `kiosk://app/${this.config.entryFile}`;
    }

    // Use file:// protocol
    return `file://${entryPath}`;
  }

  /**
   * Get the absolute path to the resource directory
   */
  getResourcePath(): string {
    if (this.config.enableSlotSwitching) {
      return path.join(this.config.basePath, this.activeSlot, 'dist');
    }

    return this.config.basePath;
  }

  /**
   * Get the path to a specific resource file
   */
  getFilePath(relativePath: string): string {
    const resourcePath = this.getResourcePath();
    return path.join(resourcePath, relativePath);
  }

  /**
   * Check if a resource file exists
   */
  fileExists(relativePath: string): boolean {
    const filePath = this.getFilePath(relativePath);
    return this.pathExists(filePath);
  }

  /**
   * Read a resource file
   */
  async readFile(relativePath: string): Promise<Buffer> {
    const filePath = this.getFilePath(relativePath);

    if (!this.pathExists(filePath)) {
      throw new Error(`Resource not found: ${relativePath}`);
    }

    logger.debug('Reading file', { relativePath, filePath });
    return fs.promises.readFile(filePath);
  }

  /**
   * Get information about all slots
   */
  async getSlotInfo(): Promise<SlotInfo[]> {
    if (!this.config.enableSlotSwitching) {
      return [];
    }

    const slots: SlotInfo[] = [];

    for (const slotId of ['slot-a', 'slot-b'] as SlotId[]) {
      const slotPath = path.join(this.config.basePath, slotId);
      const distPath = path.join(slotPath, 'dist');
      const versionFile = path.join(slotPath, 'version.json');

      let version: string | undefined;
      let lastModified: Date | undefined;

      if (this.pathExists(versionFile)) {
        try {
          const versionData = await fs.promises.readFile(versionFile, 'utf-8');
          const parsed = JSON.parse(versionData) as { version?: string };
          version = parsed.version;
        } catch {
          // Ignore version file errors
        }
      }

      if (this.pathExists(distPath)) {
        try {
          const stats = await fs.promises.stat(distPath);
          lastModified = stats.mtime;
        } catch {
          // Ignore stat errors
        }
      }

      slots.push({
        id: slotId,
        path: slotPath,
        version,
        lastModified,
        isActive: slotId === this.activeSlot,
      });
    }

    return slots;
  }

  /**
   * Get the current active slot
   */
  getActiveSlot(): SlotId {
    return this.activeSlot;
  }

  /**
   * Get the inactive slot (for updates)
   */
  getInactiveSlot(): SlotId {
    return this.activeSlot === 'slot-a' ? 'slot-b' : 'slot-a';
  }

  /**
   * Switch to the specified slot
   */
  async switchSlot(slotId: SlotId): Promise<void> {
    if (!this.config.enableSlotSwitching) {
      throw new Error('Slot switching is not enabled');
    }

    const slotPath = path.join(this.config.basePath, slotId, 'dist');

    if (!this.pathExists(slotPath)) {
      throw new Error(`Slot does not exist: ${slotId}`);
    }

    logger.info('Switching slot', { from: this.activeSlot, to: slotId });

    this.activeSlot = slotId;
    await this.saveActiveSlot();
  }

  /**
   * Switch to the inactive slot
   */
  async switchToInactiveSlot(): Promise<void> {
    const inactiveSlot = this.getInactiveSlot();
    await this.switchSlot(inactiveSlot);
  }

  /**
   * Get the path for the inactive slot (for downloading updates)
   */
  getInactiveSlotPath(): string {
    const inactiveSlot = this.getInactiveSlot();
    return path.join(this.config.basePath, inactiveSlot);
  }

  /**
   * Verify the integrity of a slot
   */
  async verifySlot(slotId: SlotId): Promise<boolean> {
    const slotPath = path.join(this.config.basePath, slotId, 'dist');
    const entryFile = path.join(slotPath, this.config.entryFile!);

    // Check if dist directory exists
    if (!this.pathExists(slotPath)) {
      logger.warn('Slot dist directory does not exist', { slotId, slotPath });
      return false;
    }

    // Check if entry file exists
    if (!this.pathExists(entryFile)) {
      logger.warn('Slot entry file does not exist', { slotId, entryFile });
      return false;
    }

    logger.info('Slot verification passed', { slotId });
    return true;
  }

  /**
   * Get default business resource path
   */
  static getDefaultBusinessPath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'business');
  }

  /**
   * Get embedded resources path (built into the app)
   */
  static getEmbeddedResourcesPath(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'app', 'resources', 'renderer');
    }
    // Development mode
    return path.join(app.getAppPath(), 'resources', 'renderer');
  }

  /**
   * Get backup path
   */
  static getBackupPath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'backup', 'last-working');
  }

  /**
   * Load active slot from configuration file
   */
  private async loadActiveSlot(): Promise<void> {
    const activeSlotPath = path.join(this.config.basePath, ACTIVE_SLOT_FILE);

    if (!this.pathExists(activeSlotPath)) {
      logger.info('No active slot file found, using default', { slot: this.activeSlot });
      return;
    }

    try {
      const data = await fs.promises.readFile(activeSlotPath, 'utf-8');
      const parsed = JSON.parse(data) as { activeSlot?: SlotId };

      if (parsed.activeSlot === 'slot-a' || parsed.activeSlot === 'slot-b') {
        this.activeSlot = parsed.activeSlot;
        logger.info('Loaded active slot from config', { slot: this.activeSlot });
      }
    } catch (error) {
      logger.error('Failed to load active slot config', { error });
    }
  }

  /**
   * Save active slot to configuration file
   */
  private async saveActiveSlot(): Promise<void> {
    const activeSlotPath = path.join(this.config.basePath, ACTIVE_SLOT_FILE);

    try {
      const data = JSON.stringify({ activeSlot: this.activeSlot }, null, 2);
      await fs.promises.writeFile(activeSlotPath, data, 'utf-8');
      logger.info('Saved active slot config', { slot: this.activeSlot });
    } catch (error) {
      logger.error('Failed to save active slot config', { error });
      throw error;
    }
  }

  /**
   * Check if a path exists
   */
  private pathExists(filePath: string): boolean {
    try {
      fs.accessSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LoaderConfig {
    return { ...this.config };
  }
}

// Singleton instance
let resourceLoader: ResourceLoader | null = null;

/**
 * Get the ResourceLoader singleton
 */
export function getResourceLoader(config?: LoaderConfig): ResourceLoader {
  if (!resourceLoader) {
    if (!config) {
      // Use default configuration
      config = {
        basePath: ResourceLoader.getDefaultBusinessPath(),
        enableSlotSwitching: true,
      };
    }
    resourceLoader = new ResourceLoader(config);
  }
  return resourceLoader;
}

/**
 * Reset the ResourceLoader (useful for testing)
 */
export function resetResourceLoader(): void {
  resourceLoader = null;
}

/**
 * Create a new ResourceLoader instance
 */
export function createResourceLoader(config: LoaderConfig): ResourceLoader {
  return new ResourceLoader(config);
}
