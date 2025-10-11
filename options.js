// Options页面逻辑

document.addEventListener('DOMContentLoaded', () => {
  // DOM元素
  const apiKeyInput = document.getElementById('apiKey');
  const modelNameInput = document.getElementById('modelName');
  const baseUrlInput = document.getElementById('baseUrl');
  const targetLanguageSelect = document.getElementById('targetLanguage');
  const difficultyLevelSlider = document.getElementById('difficultyLevel');
  const levelDisplay = document.getElementById('levelDisplay');
  const whitelistInput = document.getElementById('whitelistInput');
  const blacklistInput = document.getElementById('blacklistInput');
  const addWhitelistBtn = document.getElementById('addWhitelist');
  const addBlacklistBtn = document.getElementById('addBlacklist');
  const whitelistDomains = document.getElementById('whitelistDomains');
  const blacklistDomains = document.getElementById('blacklistDomains');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const saveMessage = document.getElementById('saveMessage');
  
  // 标签切换
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`${targetTab}-content`).classList.add('active');
    });
  });
  
  // 难度等级滑块
  difficultyLevelSlider.addEventListener('input', (e) => {
    levelDisplay.textContent = e.target.value;
  });
  
  // 默认配置
  const defaultConfig = {
    apiKey: '',
    modelName: 'gpt-3.5-turbo',
    baseUrl: 'https://api.openai.com/v1',
    targetLanguage: 'zh-CN',
    difficultyLevel: 5,
    whitelist: [],
    blacklist: []
  };
  
  // 加载已保存的配置
  loadConfig();
  
  function loadConfig() {
    chrome.storage.sync.get(['config'], (result) => {
      const config = result.config || defaultConfig;
      
      apiKeyInput.value = config.apiKey || '';
      modelNameInput.value = config.modelName || 'gpt-3.5-turbo';
      baseUrlInput.value = config.baseUrl || 'https://api.openai.com/v1';
      targetLanguageSelect.value = config.targetLanguage || 'zh-CN';
      difficultyLevelSlider.value = config.difficultyLevel || 5;
      levelDisplay.textContent = config.difficultyLevel || 5;
      
      renderDomainList(whitelistDomains, config.whitelist || [], 'whitelist');
      renderDomainList(blacklistDomains, config.blacklist || [], 'blacklist');
    });
  }
  
  // 渲染域名列表
  function renderDomainList(container, domains, type) {
    container.innerHTML = '';
    
    if (domains.length === 0) {
      container.innerHTML = '<li style="text-align: center; color: #999;">暂无域名</li>';
      return;
    }
    
    domains.forEach(domain => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span>${domain}</span>
        <button onclick="removeDomain('${type}', '${domain}')">×</button>
      `;
      container.appendChild(li);
    });
  }
  
  // 添加到白名单
  addWhitelistBtn.addEventListener('click', () => {
    const domain = whitelistInput.value.trim();
    if (domain) {
      chrome.storage.sync.get(['config'], (result) => {
        const config = result.config || defaultConfig;
        if (!config.whitelist) config.whitelist = [];
        
        if (!config.whitelist.includes(domain)) {
          config.whitelist.push(domain);
          chrome.storage.sync.set({ config }, () => {
            renderDomainList(whitelistDomains, config.whitelist, 'whitelist');
            whitelistInput.value = '';
          });
        }
      });
    }
  });
  
  // 添加到黑名单
  addBlacklistBtn.addEventListener('click', () => {
    const domain = blacklistInput.value.trim();
    if (domain) {
      chrome.storage.sync.get(['config'], (result) => {
        const config = result.config || defaultConfig;
        if (!config.blacklist) config.blacklist = [];
        
        if (!config.blacklist.includes(domain)) {
          config.blacklist.push(domain);
          chrome.storage.sync.set({ config }, () => {
            renderDomainList(blacklistDomains, config.blacklist, 'blacklist');
            blacklistInput.value = '';
          });
        }
      });
    }
  });
  
  // 移除域名（全局函数）
  window.removeDomain = function(type, domain) {
    chrome.storage.sync.get(['config'], (result) => {
      const config = result.config || defaultConfig;
      
      if (type === 'whitelist') {
        config.whitelist = config.whitelist.filter(d => d !== domain);
        renderDomainList(whitelistDomains, config.whitelist, 'whitelist');
      } else {
        config.blacklist = config.blacklist.filter(d => d !== domain);
        renderDomainList(blacklistDomains, config.blacklist, 'blacklist');
      }
      
      chrome.storage.sync.set({ config });
    });
  };
  
  // 保存设置
  saveBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showMessage('请输入API Key', 'error');
      return;
    }
    
    chrome.storage.sync.get(['config'], (result) => {
      const config = result.config || defaultConfig;
      
      config.apiKey = apiKey;
      config.modelName = modelNameInput.value.trim() || 'gpt-3.5-turbo';
      config.baseUrl = baseUrlInput.value.trim() || 'https://api.openai.com/v1';
      config.targetLanguage = targetLanguageSelect.value;
      config.difficultyLevel = parseInt(difficultyLevelSlider.value);
      
      chrome.storage.sync.set({ config }, () => {
        showMessage('设置已保存！', 'success');
        
        // 通知background script更新配置
        chrome.runtime.sendMessage({ action: 'configUpdated', config });
      });
    });
  });
  
  // 恢复默认设置
  resetBtn.addEventListener('click', () => {
    if (confirm('确定要恢复默认设置吗？')) {
      chrome.storage.sync.set({ config: defaultConfig }, () => {
        loadConfig();
        showMessage('已恢复默认设置', 'success');
      });
    }
  });
  
  // 显示消息
  function showMessage(message, type) {
    saveMessage.textContent = message;
    saveMessage.className = `save-message ${type}`;
    
    setTimeout(() => {
      saveMessage.style.display = 'none';
    }, 3000);
  }
  
  // 回车键添加域名
  whitelistInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addWhitelistBtn.click();
    }
  });
  
  blacklistInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addBlacklistBtn.click();
    }
  });
});

