const { app, Menu, BrowserWindow, dialog, ipcMain } = require('electron')
const path = require('node:path')
const log = require('electron-log')
const { autoUpdater } = require('electron-updater')
const fs = require('fs')

// 配置日志
log.transports.file.level = 'info'
log.info('应用启动')

// 检查是否是开发环境
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// 设置应用数据路径并确保目录存在
const userDataPath = path.join(app.getPath('appData'), app.getName())
try {
  fs.mkdirSync(userDataPath, { recursive: true })
  app.setPath('userData', userDataPath)
} catch (err) {
  log.error('创建用户数据目录失败:', err)
}

// 创建缓存目录
const cacheDir = path.join(userDataPath, 'Cache')
try {
  fs.mkdirSync(cacheDir, { recursive: true })
} catch (err) {
  log.error('创建缓存目录失败:', err)
}

// 配置自动更新
function setupAutoUpdater() {
  autoUpdater.logger = log
  autoUpdater.logger.transports.file.level = 'info'
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('error', (error) => {
    log.error('更新出错：', error)
  })

  autoUpdater.on('checking-for-update', () => {
    log.info('正在检查更新...')
  })

  autoUpdater.on('update-available', (info) => {
    log.info('有可用更新:', info)
    dialog.showMessageBox({
      type: 'info',
      title: '发现新版本',
      message: `发现新版本: ${info.version}`,
      detail: '正在自动下载更新...',
      buttons: ['确定']
    })
  })

  autoUpdater.on('update-not-available', () => {
    log.info('当前已是最新版本')
  })

  autoUpdater.on('download-progress', (progressObj) => {
    let message = `下载速度: ${progressObj.bytesPerSecond}`
    message += `\n已下载 ${progressObj.percent}%`
    message += `\n(${progressObj.transferred}/${progressObj.total})`
    log.info(message)
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info('更新下载完成')
    dialog.showMessageBox({
      type: 'info',
      title: '安装更新',
      message: '更新已下载完成，是否现在安装？',
      buttons: ['现在安装', '稍后安装']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true)
      }
    })
  })

  setInterval(() => {
    autoUpdater.checkForUpdates().catch(err => log.error('自动检查更新失败:', err))
  }, 60 * 60 * 1000)

  autoUpdater.checkForUpdates().catch(err => log.error('初始检查更新失败:', err))
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:main',
      disableHardwareAcceleration: true,
      session: {
        cachePath: cacheDir,
        clearCache: true
      }
    }
  })

  // 配置session
  const ses = mainWindow.webContents.session
  ses.clearCache()
    .then(() => {
      log.info('Cache cleared successfully')
      return ses.clearStorageData({
        storages: ['appcache', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
      })
    })
    .then(() => {
      log.info('Storage cleared successfully')
      mainWindow.loadFile('src/chat/index.html')
    })
    .catch(err => {
      log.error('清理缓存失败:', err)
      // 即使清理失败也加载页面
      mainWindow.loadFile('src/chat/index.html')
    })

  Menu.setApplicationMenu(null)

  mainWindow.webContents.on('crashed', () => {
    log.error('Window crashed!')
    dialog.showErrorBox('错误', '应用发生错误，需要重启。')
  })

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  return mainWindow
}

// 应用配置
app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-software-rasterizer')
app.disableHardwareAcceleration()

// 生命周期管理
app.whenReady().then(() => {
  app.name = 'MiChat'
  const mainWindow = createWindow()

  if (!isDev) {
    setupAutoUpdater()
  }

  ipcMain.handle('check-for-updates', async () => {
    if (!isDev) {
      try {
        await autoUpdater.checkForUpdates()
        return { success: true }
      } catch (error) {
        log.error('手动检查更新失败:', error)
        return { success: false, error: error.message }
      }
    }
    return { success: false, error: '开发环境不支持更新检查' }
  })

  // 错误处理
  process.on('uncaughtException', (error) => {
    log.error('未捕获的异常:', error)
    dialog.showErrorBox('错误', '发生未知错误')
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  const ses = BrowserWindow.getAllWindows()[0]?.webContents?.session
  if (ses) {
    ses.clearCache()
      .then(() => log.info('Cache cleared before quit'))
      .catch(err => log.error('Failed to clear cache before quit:', err))
  }
})

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// 进程错误处理
app.on('render-process-gone', (event, webContents, details) => {
  log.error('Render process gone:', details)
  dialog.showErrorBox('错误', '渲染进程崩溃，请重启应用。')
})

app.on('gpu-process-crashed', (event, killed) => {
  log.error('GPU process crashed:', {killed})
  dialog.showErrorBox('错误', 'GPU进程崩溃，请重启应用。')
})