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
  if (!tab?.id) {
    toggleSwitch.disabled = true;
    statusIndicator.textContent = '此页面不可翻译';
    return;
  }

  async function refreshWordCount() {
    try {
      const result = await chrome.tabs.sendMessage(tab.id, { action: 'getTranslatedCount' });
      wordCount.textContent = String(result?.count ?? 0);
    } catch (error) {
      wordCount.textContent = '—';
    }
  }
  refreshWordCount();
  // 翻译是异步注入的，弹窗打开期间持续更新可见词数。
  setInterval(refreshWordCount, 1200);
  
  // CEFR等级映射
  const cefrLevels = {
    1: 'A1',
    2: 'A2',
    3: 'B1', 
    4: 'B2',
    5: 'C1',
    6: 'C2'
  };
  
  // 加载配置
  chrome.storage.sync.get(['config'], (result) => {
    if (result.config) {
      const level = result.config.difficultyLevel || 4;
      difficultyLevel.textContent = cefrLevels[level] || level;
    }
  });
  
  // 加载当前页面的激活状态
  chrome.storage.local.get([`activated_${tab.id}`], (result) => {
    const isActivated = result[`activated_${tab.id}`] || false;
    toggleSwitch.checked = isActivated;
    updateStatus(isActivated);
  });
  
  // 切换开关事件
  toggleSwitch.addEventListener('change', async (e) => {
    const enabled = e.target.checked;
    
    // 保存状态
    await chrome.storage.local.set({ [`activated_${tab.id}`]: enabled });
    
    // 发送消息到content script
    try {
      // 检查 tab 是否有效
      if (!tab.id) {
        throw new Error('无效的标签页');
      }
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleTranslation',
        enabled: enabled
      });
      
      updateStatus(enabled);
      await refreshWordCount();
      
      // 更新徽章
      if (enabled) {
        chrome.action.setBadgeText({ text: '✓', tabId: tab.id });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50', tabId: tab.id });
      } else {
        chrome.action.setBadgeText({ text: '', tabId: tab.id });
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 检查是否是因为 content script 未注入
      if (error.message.includes('Could not establish connection') || 
          error.message.includes('Receiving end does not exist')) {
        // 提示用户刷新页面
        if (confirm('需要刷新页面才能激活翻译功能，是否立即刷新？')) {
          chrome.tabs.reload(tab.id);
          window.close();
        } else {
          // 恢复开关状态
          toggleSwitch.checked = !enabled;
        }
        updateStatus(toggleSwitch.checked);
      }
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
