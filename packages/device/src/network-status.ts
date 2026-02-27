import { performance } from 'perf_hooks'

import type {
  BusinessNetworkStatus
} from '@kiosk/shared'

export async function checkBusinessStatus(url: string): Promise<BusinessNetworkStatus> {
  const start = performance.now()

  try {
    // 使用 fetch 发送一个轻量级的 HEAD 请求，避免拉取大量数据
    const response = await fetch(url, {
      method: 'HEAD',
      // 设置超时时间，例如 3 秒
      signal: AbortSignal.timeout(3000),
    })

    const end = performance.now()

    return {
      latency: Math.round(end - start),
      isOnline: response.ok,
      statusCode: response.status,
    }
  } catch (error) {
    // 捕获超时、DNS 错误、断网等异常
    return {
      latency: 9999, // 代表超时或不可达
      isOnline: false,
      statusCode: 0,
    }
  }
}
