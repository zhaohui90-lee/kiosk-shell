/**
 * Process Monitor
 * Monitors process state and handles automatic restart
 */

import { spawn } from 'child_process';
import { getLogger } from '@kiosk/logger';
import type {
  MonitorConfig,
  MonitorState,
  ProcessState,
  ProcessInfo,
  WatchdogEvent,
  WatchdogEventHandler,
} from './types';
import {
  DEFAULT_MONITOR_CONFIG,
  ERROR_MESSAGES,
  LOG_MESSAGES,
  INITIAL_BACKOFF_DELAY,
  BACKOFF_MULTIPLIER,
} from './constants';

/**
 * Get logger instance
 */
function getMonitorLogger() {
  return getLogger();
}

/**
 * Log info message with monitor prefix
 */
function logInfo(msg: string): void {
  getMonitorLogger().info(`[watchdog] ${msg}`);
}

/**
 * Log error message with monitor prefix
 */
function logError(msg: string): void {
  getMonitorLogger().error(`[watchdog] ${msg}`);
}

/**
 * Module state
 */
const state: MonitorState = {
  active: false,
  processState: 'unknown',
  pid: null,
  restartAttempts: 0,
  lastCheck: null,
  lastStateChange: null,
  currentBackoffDelay: INITIAL_BACKOFF_DELAY,
};

/**
 * Current configuration
 */
let currentConfig: MonitorConfig = { ...DEFAULT_MONITOR_CONFIG };

/**
 * Check interval timer
 */
let checkTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Event handlers
 */
const eventHandlers: Set<WatchdogEventHandler> = new Set();

/**
 * Emit watchdog event
 */
function emitEvent(type: WatchdogEvent['type'], data?: Record<string, unknown>): void {
  const event: WatchdogEvent = {
    type,
    timestamp: new Date(),
    pid: state.pid ?? undefined,
    data,
  };

  for (const handler of eventHandlers) {
    try {
      handler(event);
    } catch (error) {
      logError(`Event handler error: ${String(error)}`);
    }
  }
}

/**
 * Update process state and emit event if changed
 */
function updateProcessState(newState: ProcessState): void {
  if (state.processState !== newState) {
    const oldState = state.processState;
    state.processState = newState;
    state.lastStateChange = new Date();

    switch (newState) {
      case 'running':
        emitEvent('process-started', { previousState: oldState });
        break;
      case 'stopped':
        emitEvent('process-stopped', { previousState: oldState });
        break;
      case 'crashed':
        emitEvent('process-crashed', { previousState: oldState });
        break;
      case 'unresponsive':
        emitEvent('process-unresponsive', { previousState: oldState });
        break;
    }
  }
}

/**
 * Check if a process is running by PID
 * Uses platform-specific method
 */
export function isProcessRunning(pid: number): boolean {
  try {
    // process.kill with signal 0 checks if process exists
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get process information by PID
 * This is a basic implementation; detailed info requires platform-specific code
 */
export async function getProcessInfo(pid: number): Promise<ProcessInfo | null> {
  if (!isProcessRunning(pid)) {
    return null;
  }

  return {
    pid,
    name: 'unknown', // Would need platform-specific code to get name
    running: true,
  };
}

/**
 * Find process by name (Windows-specific)
 * Returns the first matching process PID or null
 */
export async function findProcessByName(name: string): Promise<number | null> {
  if (process.platform !== 'win32') {
    logError('findProcessByName is only supported on Windows');
    return null;
  }

  return new Promise((resolve) => {
    const tasklist = spawn('tasklist', ['/FI', `IMAGENAME eq ${name}`, '/FO', 'CSV', '/NH']);
    let output = '';

    tasklist.stdout.on('data', (data: Buffer) => {
      output += data.toString();
    });

    tasklist.on('close', () => {
      // Parse CSV output: "process.exe","PID","..."
      const lines = output.trim().split('\n');
      for (const line of lines) {
        if (line.includes(name)) {
          const match = /"[^"]*","(\d+)"/.exec(line);
          if (match?.[1]) {
            resolve(parseInt(match[1], 10));
            return;
          }
        }
      }
      resolve(null);
    });

    tasklist.on('error', () => {
      resolve(null);
    });
  });
}

/**
 * Calculate restart delay based on strategy
 */
function calculateRestartDelay(): number {
  switch (currentConfig.restartStrategy) {
    case 'immediate':
      return 0;
    case 'delayed':
      return currentConfig.restartDelay;
    case 'exponential-backoff': {
      const delay = state.currentBackoffDelay;
      // Increase backoff for next time (with cap)
      state.currentBackoffDelay = Math.min(
        state.currentBackoffDelay * BACKOFF_MULTIPLIER,
        currentConfig.maxBackoffDelay
      );
      return delay;
    }
    case 'none':
    default:
      return -1; // Signal not to restart
  }
}

/**
 * Reset backoff delay (called after successful restart)
 */
function resetBackoff(): void {
  state.currentBackoffDelay = INITIAL_BACKOFF_DELAY;
}

/**
 * Start a process
 */
async function startProcess(): Promise<number | null> {
  if (!currentConfig.executablePath) {
    logError(ERROR_MESSAGES.NO_EXECUTABLE_PATH);
    return null;
  }

  return new Promise((resolve) => {
    const proc = spawn(
      currentConfig.executablePath!,
      currentConfig.executableArgs ?? [],
      {
        cwd: currentConfig.workingDirectory,
        detached: true,
        stdio: 'ignore',
      }
    );

    proc.unref();

    if (proc.pid) {
      logInfo(`${LOG_MESSAGES.RESTART_SUCCESSFUL} (PID: ${proc.pid})`);
      resolve(proc.pid);
    } else {
      logError(LOG_MESSAGES.RESTART_FAILED);
      resolve(null);
    }

    proc.on('error', (error) => {
      logError(`Process spawn error: ${String(error)}`);
      resolve(null);
    });
  });
}

/**
 * Attempt to restart the process
 */
async function attemptRestart(): Promise<boolean> {
  if (!currentConfig.autoRestart) {
    return false;
  }

  if (currentConfig.restartStrategy === 'none') {
    return false;
  }

  if (currentConfig.maxRestartAttempts > 0 && state.restartAttempts >= currentConfig.maxRestartAttempts) {
    logError(ERROR_MESSAGES.MAX_RESTARTS_REACHED);
    emitEvent('max-restarts-reached', { attempts: state.restartAttempts });
    return false;
  }

  const delay = calculateRestartDelay();
  if (delay < 0) {
    return false;
  }

  state.restartAttempts++;
  logInfo(`${LOG_MESSAGES.RESTARTING_PROCESS} (attempt ${state.restartAttempts}, delay: ${delay}ms)`);

  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  const newPid = await startProcess();

  if (newPid) {
    state.pid = newPid;
    resetBackoff();
    emitEvent('process-restarted', { pid: newPid, attempt: state.restartAttempts });
    return true;
  } else {
    emitEvent('restart-failed', { attempt: state.restartAttempts });
    return false;
  }
}

/**
 * Perform a single check of the process
 */
async function checkProcess(): Promise<void> {
  state.lastCheck = new Date();

  // If we have a PID, check if it's running
  if (state.pid !== null) {
    const running = isProcessRunning(state.pid);

    if (running) {
      if (state.processState !== 'running') {
        updateProcessState('running');
        logInfo(`${LOG_MESSAGES.PROCESS_RUNNING} (PID: ${state.pid})`);
        state.restartAttempts = 0; // Reset on successful run
        resetBackoff();
      }
    } else {
      // Process has stopped or crashed
      const wasRunning = state.processState === 'running';
      updateProcessState(wasRunning ? 'crashed' : 'stopped');
      logInfo(wasRunning ? LOG_MESSAGES.PROCESS_CRASHED : LOG_MESSAGES.PROCESS_STOPPED);

      // Attempt restart if configured
      if (currentConfig.autoRestart) {
        await attemptRestart();
      }
    }
  } else if (currentConfig.processName) {
    // Try to find process by name
    const pid = await findProcessByName(currentConfig.processName);
    if (pid) {
      state.pid = pid;
      updateProcessState('running');
      logInfo(`${LOG_MESSAGES.PROCESS_RUNNING} (PID: ${pid})`);
    } else {
      updateProcessState('stopped');
      logInfo(LOG_MESSAGES.PROCESS_STOPPED);

      // Attempt restart if configured
      if (currentConfig.autoRestart && currentConfig.executablePath) {
        await attemptRestart();
      }
    }
  }
}

/**
 * Initialize the monitor
 * @param config - Monitor configuration
 */
export function initMonitor(config?: Partial<MonitorConfig>): void {
  currentConfig = { ...DEFAULT_MONITOR_CONFIG, ...config };

  if (config?.pid) {
    state.pid = config.pid;
  }

  logInfo(LOG_MESSAGES.MONITORING_STARTED);
}

/**
 * Start monitoring
 * @param pid - Optional PID to monitor (overrides config)
 */
export async function startMonitoring(pid?: number): Promise<void> {
  if (state.active) {
    throw new Error(ERROR_MESSAGES.ALREADY_MONITORING);
  }

  if (pid !== undefined) {
    state.pid = pid;
  }

  state.active = true;
  state.restartAttempts = 0;
  resetBackoff();

  // Perform initial check
  await checkProcess();

  // Start periodic checking
  checkTimer = setInterval(() => {
    void checkProcess();
  }, currentConfig.checkInterval);

  emitEvent('monitoring-started', {
    pid: state.pid,
    checkInterval: currentConfig.checkInterval,
  });

  logInfo(LOG_MESSAGES.MONITORING_STARTED);
}

/**
 * Stop monitoring
 */
export function stopMonitoring(): void {
  if (!state.active) {
    return;
  }

  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }

  state.active = false;
  emitEvent('monitoring-stopped');
  logInfo(LOG_MESSAGES.MONITORING_STOPPED);
}

/**
 * Check if monitoring is active
 */
export function isMonitoringActive(): boolean {
  return state.active;
}

/**
 * Get current monitor state
 */
export function getMonitorState(): Readonly<MonitorState> {
  return { ...state };
}

/**
 * Get current process state
 */
export function getProcessState(): ProcessState {
  return state.processState;
}

/**
 * Manually trigger process restart
 */
export async function restartProcess(): Promise<boolean> {
  if (!currentConfig.executablePath) {
    throw new Error(ERROR_MESSAGES.NO_EXECUTABLE_PATH);
  }

  logInfo(LOG_MESSAGES.RESTARTING_PROCESS);
  return attemptRestart();
}

/**
 * Add event handler
 */
export function onWatchdogEvent(handler: WatchdogEventHandler): () => void {
  eventHandlers.add(handler);
  return () => {
    eventHandlers.delete(handler);
  };
}

/**
 * Remove event handler
 */
export function offWatchdogEvent(handler: WatchdogEventHandler): void {
  eventHandlers.delete(handler);
}

/**
 * Reset monitor state (for testing)
 */
export function resetMonitor(): void {
  stopMonitoring();
  state.active = false;
  state.processState = 'unknown';
  state.pid = null;
  state.restartAttempts = 0;
  state.lastCheck = null;
  state.lastStateChange = null;
  state.currentBackoffDelay = INITIAL_BACKOFF_DELAY;
  eventHandlers.clear();
  currentConfig = { ...DEFAULT_MONITOR_CONFIG };
}

/**
 * Check if platform is supported
 */
export function isPlatformSupported(): boolean {
  // Monitor works on all platforms, but some features are Windows-only
  return true;
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return process.platform === 'win32';
}
