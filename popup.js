// Popup页面逻辑

document.addEventListener('DOMContentLoaded', async () => {
  const toggleSwitch = document.getElementById('toggleTranslation');
  const statusIndicator = document.getElementById('statusIndicator');
  const difficultyLevel = document.getElementById('difficultyLevel');
  const wordCount = document.getElementById('wordCount');
  const settingsBtn = document.getElementById('settingsBtn');
  settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
  
  // 获取当前标签页
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:\/\//.test(tab.url || '')) {
    toggleSwitch.disabled = true;
    statusIndicator.textContent = '此页面不可翻译';
    return;
  }
  let blocked = false;
  let hasContentScript = false;
  try {
    const result = await chrome.tabs.sendMessage(tab.id, { action: 'getSitePolicy' });
    hasContentScript = !!result?.policy;
    if (result?.policy === 'blocked') {
      toggleSwitch.disabled = true;
      toggleSwitch.checked = false;
      statusIndicator.textContent = '此网站已被屏蔽';
      wordCount.textContent = '0';
      blocked = true;
    }
  } catch {
    // 旧页面可能还没有新内容脚本，切换时会给出刷新提示。
  }
  if (!hasContentScript) {
    toggleSwitch.disabled = true;
    statusIndicator.textContent = '刷新页面后可使用';
    wordCount.textContent = '—';
  }
  const currentConfig = await chrome.storage.sync.get(['config']);
  if (currentConfig.config) {
    const cefr = { 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1', 6: 'C2' };
    difficultyLevel.textContent = cefr[currentConfig.config.difficultyLevel || 4] || 'B2';
  }

  async function refreshWordCount() {
    try {
      const result = await chrome.tabs.sendMessage(tab.id, { action: 'getTranslatedCount' });
      wordCount.textContent = String(result?.count ?? 0);
    } catch (error) {
      wordCount.textContent = '—';
    }
  }
  if (hasContentScript && !blocked) refreshWordCount();
  // 翻译是异步注入的，弹窗打开期间持续更新可见词数。
  if (hasContentScript && !blocked) setInterval(refreshWordCount, 1200);
  
  // 加载当前页面的激活状态
  if (hasContentScript && !blocked) chrome.storage.local.get([`activated_${tab.id}`], (result) => {
    const isActivated = result[`activated_${tab.id}`] || false;
    toggleSwitch.checked = isActivated;
    updateStatus(isActivated);
  });
  
  // 切换开关事件
  toggleSwitch.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    toggleSwitch.disabled = true;
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleTranslation',
        enabled: enabled
      });
      if (!response?.success) throw new Error(response?.error || '切换失败');
      updateStatus(enabled);
      await refreshWordCount();
    } catch (error) {
      console.error('发送消息失败:', error);
      toggleSwitch.checked = !enabled;
      updateStatus(!enabled);
      if (error.message.includes('Could not establish connection') || 
          error.message.includes('Receiving end does not exist')) {
        if (confirm('需要刷新页面才能激活翻译功能，是否立即刷新？')) {
          chrome.tabs.reload(tab.id);
          window.close();
        }
      } else {
        statusIndicator.textContent = error.message;
      }
    } finally {
      toggleSwitch.disabled = false;
    }
  });
  
  // 更新状态显示
  function updateStatus(isActive) {
    if (isActive) {
      statusIndicator.textContent = '已激活';
      statusIndicator.className = 'status-indicator active';
    } else {
      statusIndicator.textContent = '未激活';
      statusIndicator.className = 'status-indicator inactive';
    }
  }
});
