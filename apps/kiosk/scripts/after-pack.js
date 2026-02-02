/**
 * electron-builder afterPack hook
 * 在打包完成后执行的脚本
 */

// @ts-check

/**
 * @param {import('electron-builder').AfterPackContext} context
 */
exports.default = async function afterPack(context) {
  console.log(`[after-pack] Platform: ${context.electronPlatformName}`);
  console.log(`[after-pack] Arch: ${context.arch}`);
  console.log(`[after-pack] Output: ${context.appOutDir}`);

  // 可以在这里添加额外的打包后处理逻辑
  // 例如：复制配置文件、设置权限等
};
