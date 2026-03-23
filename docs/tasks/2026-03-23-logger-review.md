# @kiosk/logger 模块代码审查报告

> 审查日期：2026-03-23
> 修订日期：2026-03-23
> 审查范围：`packages/logger/src/` 全部源文件及现有测试

## 需求背景

logger 模块需要满足以下三个核心需求：

1. **记录日志**：本地文件日志记录
2. **定时上报**：批量定时上传到远程服务器
3. **本地保留一定数量日志**：限制本地日志文件数量或保留天数，防止磁盘占满

## 一、需求覆盖度评估

| 需求 | 状态 | 说明 |
|------|------|------|
| 记录日志 | ✅ 基本满足 | `FileTransport` 已接入 `electron-log`，但初始化和关闭阶段的可靠性仍有缺口 |
| 定时上报 | ⚠️ 部分满足 | `RemoteTransport` 已有 batch + interval，但缺少 buffer 上限、退避、鉴权和完整生命周期控制 |
| 宕机后日志不丢失 | ❌ 未实现 | 待上报日志只保存在内存 buffer 中；崩溃、强退或重启后无法续传 |
| 本地保留一定数量日志 | ❌ 未实现 | `maxDays` / `compress` 未落地；也没有 `maxFiles` 或任何清理逻辑 |

---

## 二、已确认问题

### 2.1 FileTransport 初始化时序不可靠

**文件**：`file-transport.ts:69-138`

`log()` 是同步入口，但 `initialize()` 是异步的，而且没有保存“初始化中”的 Promise。当前实现会带来两个问题：

- 启动早期的多次 `log()` 会重复触发 `initialize()`
- 如果进程在 `initialize()` 完成前退出，首批日志不一定能真正落盘

这里更准确的风险是“首次日志落盘不确定”和“重复初始化”，而不是已经可以确定的“双写”。

### 2.2 FileTransport 的类型声明与实现不一致

**文件**：`types.ts:14-25`、`file-transport.ts:9-15`、`file-transport.ts:79-97`

当前 `FileTransportOptions` 中的字段存在明显的“声明已暴露，但实现未兑现”问题：

- `maxDays` 已定义默认值，但未参与任何清理逻辑
- `compress` 已定义默认值，但未传递给 `electron-log` 或其他压缩实现
- `fileName` 不是完全未使用，但只在设置了 `logDir` 时才通过 `resolvePathFn` 生效；默认路径场景下它实际上不起作用

这会让调用方误以为这些能力已经可用。

### 2.3 child logger 会重复创建 transport

**文件**：`logger.ts:116-125`

`child()` 直接 `new KioskLogger()`，导致 child logger 重新创建：

- 独立的 `FileTransport`
- 独立的 `RemoteTransport`
- 独立的 remote buffer 和 flush timer

这会造成资源浪费，也会让 parent / child 的远程上报状态彼此割裂。

### 2.4 RemoteTransport buffer 无上限

**文件**：`remote-transport.ts:67-139`

远端不可达时，发送失败的日志会被重新塞回 `buffer`：

```typescript
this.buffer = [...logsToSend, ...this.buffer];
```

当前没有：

- `maxBufferSize`
- 丢弃策略
- 重试次数上限

持续故障时，内存会无限增长。

### 2.5 RemoteTransport 缺少退避策略

**文件**：`remote-transport.ts:120-136`

目前失败后只是把日志重新放回 buffer，下一次仍按固定周期继续发送。这样会导致：

- 服务端故障期间持续高频重试
- 客户端自身做无效网络消耗
- 大量积压时恢复后瞬时冲击服务器

至少需要指数退避或最小重试间隔。

### 2.6 close() 不能正确等待进行中的 flush

**文件**：`remote-transport.ts:90-101`、`remote-transport.ts:145-153`

`close()` 内部只是再次调用 `flush()`；但 `flush()` 在 `isFlushing === true` 时会直接返回。

这意味着如果关闭发生在一次上传尚未完成期间：

- `close()` 会提前 resolve
- 调用方会误以为“剩余日志已经处理完”
- 实际上仍然有日志处于不确定状态

这是比“纯内存 buffer 会在崩溃时丢失”更直接的生命周期缺陷。

### 2.7 initLogger() 覆盖单例时没有关闭旧实例

**文件**：`logger.ts:184-202`

`initLogger()` 会直接替换 `defaultLogger`：

```typescript
defaultLogger = createLogger(options);
```

但不会关闭旧实例。若旧实例启用了 remote transport，则可能遗留：

- 旧的 flush timer
- 旧的 buffer
- 旧配置对应的后台上传行为

这属于资源泄漏和行为重复风险。

### 2.8 RemoteTransport 的运行时重配置不完整

**文件**：`remote-transport.ts:159-169`

`configure()` 只处理了 `enabled` 状态切换，但没有完整处理定时器配置变化，例如：

- 已启用状态下修改 `flushInterval`
- 已启用且 `flushInterval=0` 时，后续改成正数

这两种情况都不会正确重建 timer。

### 2.9 LEVEL_PRIORITY 重复定义

**文件**：`logger.ts:17-22`、`remote-transport.ts:19-24`

相同的优先级映射维护了两份。虽然这不是功能缺陷，但属于低成本可消除的重复。

### 2.10 Logger 默认类型写法可读性较差

**文件**：`logger.ts:25`、`logger.ts:34`

```typescript
Required<Omit<LoggerOptions, 'file' | 'remote'>> & LoggerOptions
```

类型本身没有错，但可读性差，后续维护时理解成本偏高。这个问题优先级不高，但可以顺手整理。

---

## 三、这份代码当前没有实现，但报告中需要谨慎表述的点

### 3.1 “FileTransport 初始化会双写”不能直接下结论

当前实现确实存在初始化时序问题，但从现有控制流只能确认：

- 早期日志写入时机不稳定
- 可能重复触发初始化

不能仅凭现有代码就断定“同一条日志一定会双写”。

### 3.2 “`fileName` 完全未使用”不准确

`fileName` 在 `logDir` 存在时会参与 `resolvePathFn` 计算，因此应改为：

- `fileName` 仅在自定义日志目录场景下生效
- 默认路径场景下没有接通

### 3.3 “日志清理可能删除未上报日志”属于未来实现风险，不是当前已发生缺陷

当前代码里压根没有任何本地日志清理逻辑，因此“误删未上报日志”还不是现实 bug。

更准确的表述应是：

- 如果后续新增 `maxDays` / `maxFiles` 清理能力
- 且仍然采用“内存 buffer + 无持久化上传状态”的方案
- 那么就会引入误删未上报日志的风险

---

## 四、功能缺陷汇总

| 问题 | 严重程度 | 说明 |
|------|----------|------|
| `maxDays` 未实现 | 高 | 本地日志保留策略未落地，无法满足核心需求 |
| 无 `maxFiles` 选项 | 高 | 无法从“数量”维度限制日志保留 |
| `compress` 未实现 | 中 | 类型暴露了能力，但实现并不存在 |
| FileTransport 初始化时序不可靠 | 高 | 首批日志落盘时机不确定，且会重复初始化 |
| RemoteTransport buffer 无上限 | 高 | 持续网络故障时内存无限增长 |
| 无退避策略 | 中 | 故障期间固定频率重试，不够稳健 |
| `close()` 不等待进行中的 flush | 高 | 关闭时存在日志处理状态不确定的问题 |
| `initLogger()` 不关闭旧实例 | 中 | 可能遗留 timer、buffer 和重复上报行为 |
| child logger 创建独立 transport | 中 | 资源浪费，buffer 与 timer 碎片化 |
| 宕机后未上报日志无法续传 | 高 | 远程上报状态纯内存，重启后丢失上下文 |
| RemoteTransport 配置热更新不完整 | 中 | 修改 `flushInterval` 后行为可能与配置不一致 |

---

## 五、测试覆盖缺口

现有测试主要覆盖了基础 happy path，但以下关键场景没有测试：

- `FileTransport` 初始化中的并发 `log()` 行为
- `FileTransport` 中 `fileName` / `logDir` 的实际生效路径
- `maxDays` / `compress` 这类声明能力未实现的契约测试
- `RemoteTransport.close()` 遇到进行中 flush 的场景
- `initLogger()` 重复初始化后的旧实例清理
- `configure()` 修改 `flushInterval` 的运行时行为

这意味着当前测试通过，并不能证明 logger 生命周期可靠。

---

## 六、改进建议

### 6.1 P0：先补齐“当前实现已经承诺但没做到”的部分

优先处理以下问题：

- 实现本地日志清理能力：`maxDays`，并补充 `maxFiles`
- 修复 `FileTransport` 初始化时序，至少要去重初始化过程
- 修复 `RemoteTransport.close()`，确保能等待进行中的 flush
- 修复 `initLogger()`，替换单例前先关闭旧实例
- 给 remote buffer 加上上限和基础丢弃策略

### 6.2 P1：明确远程上报的可靠性目标

当前 `RemoteTransport` 是“内存缓冲 + 定时 POST”的 best-effort 模式。若业务要求满足“宕机后不丢待上报日志”，就必须升级为持久化方案，例如：

- 基于本地文件扫描 + 上传游标
- 基于本地持久化队列
- 或者把文件日志作为 source of truth，再由独立上传器消费

这一层属于架构升级，不应与前述现有 bug 混为一谈，但如果需求明确要求 crash-safe，那么它就是必做项。

### 6.3 P2：整理 API 和实现边界

这部分属于次优先级整理：

- 让 child logger 共享 transport，仅覆盖 `source`
- 整理 `LEVEL_PRIORITY` 重复定义
- 简化 logger 默认类型声明
- 明确 `fileName` / `compress` / `maxDays` 的契约，未实现就不要对外暴露
- 视需求决定是否引入可扩展 transport 注册机制

---

## 七、建议的推进顺序

### Stage 1：先修当前确定缺陷

- `FileTransport` 初始化去重
- `RemoteTransport.close()` 生命周期修复
- `initLogger()` 正确关闭旧实例
- `maxDays` / `maxFiles` 清理能力
- remote buffer 上限

### Stage 2：补齐可靠性和配置能力

- 退避策略
- `configure()` 对 `flushInterval` 的完整热更新
- child logger 共享 transport
- 补齐缺失测试

### Stage 3：按产品要求决定是否做持久化上传

如果需求只需要“尽力上报”，Stage 1-2 已足够；如果需求要求“崩溃后待上报日志仍可恢复”，则需要引入文件游标或本地持久化队列方案。
