import { getLogger } from '@kiosk/logger'
import { randomBytes } from 'crypto'
import {
  createInMemorySessionTokenStore,
  isSecurePasswordOverride,
  verifyPassword,
} from '@kiosk/shared'
import { IPC_CHANNELS, type AdminLoginResult } from '../../types'
import { DEFAULT_ADMIN_PASSWORD, ERROR_MESSAGES } from '../../constants'
import { checkRateLimit } from '../../rate-limiter'

const logger = getLogger()

let adminPassword = DEFAULT_ADMIN_PASSWORD
const sessionTokenStore = createInMemorySessionTokenStore(() => randomBytes(32).toString('hex'))

export function setAdminPassword(password: string): void {
  if (password === DEFAULT_ADMIN_PASSWORD || isSecurePasswordOverride(password)) {
    adminPassword = password
    logger.info('[IPC:Admin] Admin password updated')
  } else {
    logger.warn('[IPC:Admin] Invalid password provided, keeping existing')
  }
}

export function verifyAdminSessionToken(token: string | undefined): boolean {
  return sessionTokenStore.verifyToken(token)
}

export function invalidateSession(): void {
  sessionTokenStore.invalidateToken()
  logger.debug('[IPC:Admin] Session invalidated')
}

export async function handleAdminLogin(
  _event: Electron.IpcMainInvokeEvent,
  password: string,
): Promise<AdminLoginResult> {
  const channel = IPC_CHANNELS.ADMIN_LOGIN

  if (!checkRateLimit(channel)) {
    logger.warn('[IPC:Admin] Login request rate limited')
    return { success: false, message: ERROR_MESSAGES.RATE_LIMITED }
  }

  logger.info('[IPC:Admin] Processing login request')

  if (!verifyPassword(password, adminPassword)) {
    logger.warn('[IPC:Admin] Invalid password attempt')
    return { success: false, message: ERROR_MESSAGES.INVALID_PASSWORD }
  }

  const token = sessionTokenStore.issueToken()
  logger.info('[IPC:Admin] Login successful, session token generated')

  return { success: true, token }
}
