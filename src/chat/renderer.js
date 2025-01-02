// ...existing code...

document.getElementById('checkUpdate').addEventListener('click', async () => {
    const status = document.getElementById('updateStatus');
    status.textContent = '正在检查更新...';
    
    try {
        const result = await window.electronAPI.checkForUpdates();
        if (result.success) {
            status.textContent = '检查更新完成';
        } else {
            status.textContent = `检查更新失败: ${result.error}`;
        }
    } catch (error) {
        status.textContent = '检查更新时发生错误';
    }
});
