# 2026-03-02 Admin Panel 测试问题修复路线

> 来源: [docs/issues/2026-03-02-zh.md](../issues/2026-03-02-zh.md)

---

## Issue 1: 管理页面开发模式下没有控制台

**问题描述**: 启动 admin panel 时，开发模式下 DevTools 不会自动弹出。

**根因分析**:
- admin 窗口的 `webPreferences.devTools` 已设为 `true`（`packages/core/src/window.ts:382`）
- 但创建窗口后**没有调用** `webContents.openDevTools()`
- 主窗口有此逻辑（`apps/kiosk/src/main/index.ts:177-180`），admin 窗口缺失

**修复方案**:
在 `apps/kiosk/src/main/index.ts` 的 `setupAdminPanel()` 函数中（约 L288-292），创建 admin 窗口后根据 `config.devMode` 自动打开 DevTools。

**涉及文件**:
- `apps/kiosk/src/main/index.ts` — 在 `setupAdminPanel()` 中添加 DevTools 自动打开逻辑
- 可能需要 `packages/core/src/window.ts` — 确认 admin 窗口实例可获取 `webContents`

**优先级**: P1
**状态**: [x] 已完成

---

## Issue 2: 修改控制面板的启动方式为连点触发

**问题描述**: 自助系统没有外接键盘，不能依赖快捷键（`Ctrl+Shift+F12`）。需改为**左下角连点触发**。

**当前触发方式**（`apps/kiosk/src/main/index.ts:310-335`）:
1. 键盘快捷键 `Cmd/Ctrl+Shift+F12` → `toggleAdminWindow()`
2. 渲染进程 IPC `shell:adminTrigger` → `showAdminWindow()`

**修复方案**:
1. 在业务页面（renderer）中添加一个隐藏的点击区域（左下角），监听连续点击事件
2. 当连续点击达到阈值（如 5 次、2秒内），通过已有的 `shell:adminTrigger` IPC 通道通知主进程打开 admin panel
3. 保留键盘快捷键作为开发模式的 fallback

**涉及文件**:
- `packages/ipc/src/preload.ts` — 确认已暴露 `adminTrigger` 方法
- `apps/kiosk/resources/renderer/index.html` 或业务页面 — 添加隐藏点击区域和连点逻辑（注意：业务页面由外部项目加载，此触发区域应由壳注入或在 preload 中实现）

**关键决策**:
- 连点区域尺寸和位置（建议：左下角 50x50px 透明区域）
- 连点次数阈值和时间窗口（建议：5次 / 2秒）
- 实现方式：preload 脚本注入 vs 壳内置 overlay

**优先级**: P1
**状态**: [x] 已完成

---

## Issue 3: testNetwork API 调用失败

**问题描述**: `admin/index.html` 第 517 行 `window.adminAPI.testNetwork(sessionToken, host)` 调用失败。

**IPC 调用链分析**:
```
HTML: window.adminAPI.testNetwork(token, host)
  → Preload: ipcRenderer.invoke('admin:networkTest', token, host)
    → Main: handleAdminTestNetwork(_event, token, host, count=4)
      → exec(`ping -c 4 www.baidu.com`)
        → parsePingResult(stdout, host, platform)
```

**IPC 接线已验证通过**:
- ✅ `IPC_CHANNELS.ADMIN_NETWORK_TEST` = `'admin:networkTest'`（`types.ts:42`）
- ✅ `handleAdminTestNetwork` 已注册（`admin.ts:429`）
- ✅ preload `testNetwork()` 已暴露（`admin-preload.ts:74-76`）
- ✅ 函数签名匹配

**可能的失败原因**（需逐一排查）:
1. **Token 无效** — `verifyToken(token)` 返回 false，未正确登录或 token 过期
2. **ping 命令执行错误** — 网络不通、命令权限问题、超时
3. **输出解析正则不匹配** — macOS 的 ping 输出格式与正则不匹配
4. **admin-preload.ts 未正确加载** — preload 路径配置问题导致 `window.adminAPI` 为 undefined

**排查步骤**:
1. 先解决 Issue 1（打开 DevTools），用控制台查看具体报错信息
2. 检查 `window.adminAPI` 是否存在
3. 检查 token 是否有效
4. 手动在终端执行 `ping -c 4 www.baidu.com` 确认输出格式
5. 对比 `parsePingResult()` 的正则与实际输出

**涉及文件**:
- `packages/ipc/src/handlers/admin.ts` — `handleAdminTestNetwork` 和 `parsePingResult`
- `packages/ipc/src/admin-preload.ts` — testNetwork 暴露
- `apps/kiosk/resources/renderer/admin/index.html` — 调用方

**优先级**: P0（依赖 Issue 1 先完成，以便用 DevTools 调试）
**状态**: [x] 已完成

---

## 执行顺序

```
Issue 1 (DevTools)  →  Issue 3 (testNetwork 调试)
                          ↑ 用 DevTools 查看具体报错
Issue 2 (连点触发)  →  独立进行，无依赖
```

| 序号 | 任务 | 优先级 | 依赖 | 预估复杂度 |
|------|------|--------|------|-----------|
| 1 | Admin DevTools 自动打开 | P1 | 无 | 低 |
| 2 | 连点触发 admin panel | P1 | 无 | 中 |
| 3 | testNetwork API 排查修复 | P0 | Issue 1 | 中 |
