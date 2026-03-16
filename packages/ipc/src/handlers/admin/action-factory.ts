import { getLogger } from '@kiosk/logger'
import type { AdminOperationResult, IpcChannel } from '../../types'
import { ERROR_MESSAGES } from '../../constants'
import { checkRateLimit } from '../../rate-limiter'
import { verifyAdminSessionToken } from './auth'

const logger = getLogger()

type AdminHandlerFunction<T extends unknown[], R> = (
  event: Electron.IpcMainInvokeEvent,
  ...args: T
) => Promise<R>

export function createAdminAction<T extends unknown[], R>(
  channel: IpcChannel,
  action: AdminHandlerFunction<T, R>,
) {
  return async (
    event: Electron.IpcMainInvokeEvent,
    token: string,
    ...args: T
  ): Promise<AdminOperationResult | R> => {
    if (!checkRateLimit(channel)) {
      return { success: false, message: ERROR_MESSAGES.RATE_LIMITED }
    }

    if (!verifyAdminSessionToken(token)) {
      return { success: false, message: ERROR_MESSAGES.INVALID_TOKEN }
    }

    try {
      return await action(event, ...args)
    } catch (error) {
      const err = error as Error
      logger.error(`[IPC:Admin] Operation failed on channel ${channel}`, { error: err.message })
      return { success: false, message: `${ERROR_MESSAGES.OPERATION_FAILED}: ${err.message}` }
    }
  }
}
