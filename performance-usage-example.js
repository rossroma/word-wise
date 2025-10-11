/**
 * 性能监控使用示例
 * 
 * 本文件展示如何在代码中集成性能监控功能
 * 假设你已经创建了全局的 perfLogger 实例
 */

// ============================================
// 示例1: 监控单个函数的执行时间
// ============================================

async function fetchUserData(userId) {
  // 开始计时
  perfLogger.start('获取用户数据', '数据加载');
  
  try {
    const response = await fetch(`/api/users/${userId}`);
    const data = await response.json();
    
    // 结束计时，并附加额外信息
    perfLogger.end('获取用户数据', '数据加载', {
      userId: userId,
      dataSize: JSON.stringify(data).length
    });
    
    return data;
  } catch (error) {
    // 即使出错也要结束计时
    perfLogger.end('获取用户数据', '数据加载', {
      userId: userId,
      error: error.message
    });
    throw error;
  }
}

// ============================================
// 示例2: 监控带有子步骤的复杂函数
// ============================================

async function processDocument(doc) {
  perfLogger.start('处理文档', '文档处理');
  
  try {
    // 子步骤1: 解析文档
    perfLogger.start('解析文档', '文档处理');
    const parsed = parseDocument(doc);
    perfLogger.end('解析文档', '文档处理', {
      段落数: parsed.paragraphs.length
    });
    
    // 子步骤2: 提取关键词
    perfLogger.start('提取关键词', '文档处理');
    const keywords = extractKeywords(parsed);
    perfLogger.end('提取关键词', '文档处理', {
      关键词数: keywords.length
    });
    
    // 子步骤3: 生成摘要
    perfLogger.start('生成摘要', '文档处理');
    const summary = generateSummary(parsed, keywords);
    perfLogger.end('生成摘要', '文档处理', {
      摘要长度: summary.length
    });
    
    perfLogger.end('处理文档', '文档处理', {
      成功: true
    });
    
    return { parsed, keywords, summary };
  } catch (error) {
    perfLogger.end('处理文档', '文档处理', {
      成功: false,
      错误: error.message
    });
    throw error;
  }
}

// ============================================
// 示例3: 监控批量处理
// ============================================

async function processBatch(items) {
  const batchId = `批次-${Date.now()}`;
  perfLogger.start(batchId, '批量处理');
  
  let successCount = 0;
  let failCount = 0;
  
  for (const item of items) {
    try {
      await processItem(item);
      successCount++;
    } catch (error) {
      failCount++;
      console.error('处理项失败:', error);
    }
  }
  
  perfLogger.end(batchId, '批量处理', {
    总数: items.length,
    成功: successCount,
    失败: failCount
  });
}

// ============================================
// 示例4: 监控循环中的操作（采样）
// ============================================

function processLargeArray(array) {
  perfLogger.start('处理大数组', '数组处理');
  
  const results = [];
  let processedCount = 0;
  
  // 每100个元素记录一次性能
  for (let i = 0; i < array.length; i++) {
    if (i % 100 === 0) {
      perfLogger.start(`处理块${Math.floor(i/100)}`, '数组处理');
    }
    
    results.push(processItem(array[i]));
    processedCount++;
    
    if ((i + 1) % 100 === 0 || i === array.length - 1) {
      perfLogger.end(`处理块${Math.floor(i/100)}`, '数组处理', {
        起始索引: Math.floor(i/100) * 100,
        结束索引: i
      });
    }
  }
  
  perfLogger.end('处理大数组', '数组处理', {
    总数: array.length,
    已处理: processedCount
  });
  
  return results;
}

// ============================================
// 示例5: 有条件的性能监控
// ============================================

function conditionalMonitoring(data, enableMonitoring = true) {
  // 只在需要时启用监控
  if (enableMonitoring) {
    perfLogger.start('条件处理', '特殊处理');
  }
  
  try {
    const result = expensiveOperation(data);
    
    if (enableMonitoring) {
      perfLogger.end('条件处理', '特殊处理', {
        数据大小: data.length,
        结果大小: result.length
      });
    }
    
    return result;
  } catch (error) {
    if (enableMonitoring) {
      perfLogger.end('条件处理', '特殊处理', {
        错误: error.message
      });
    }
    throw error;
  }
}

// ============================================
// 示例6: 使用闭包自动管理计时器
// ============================================

function createTimedFunction(name, category, fn) {
  return async function(...args) {
    perfLogger.start(name, category);
    
    try {
      const result = await fn(...args);
      perfLogger.end(name, category, { 
        参数数量: args.length 
      });
      return result;
    } catch (error) {
      perfLogger.end(name, category, { 
        错误: error.message 
      });
      throw error;
    }
  };
}

// 使用示例
const timedFetchData = createTimedFunction(
  '获取数据', 
  'API调用', 
  fetchData
);

// 调用时会自动记录性能
await timedFetchData(userId);

// ============================================
// 示例7: 在类中使用性能监控
// ============================================

class DataProcessor {
  constructor() {
    this.name = 'DataProcessor';
  }
  
  async process(data) {
    const methodName = `${this.name}.process`;
    perfLogger.start(methodName, '类方法');
    
    try {
      await this.validate(data);
      const result = await this.transform(data);
      await this.save(result);
      
      perfLogger.end(methodName, '类方法', {
        数据量: data.length,
        成功: true
      });
      
      return result;
    } catch (error) {
      perfLogger.end(methodName, '类方法', {
        数据量: data.length,
        成功: false,
        错误: error.message
      });
      throw error;
    }
  }
  
  async validate(data) {
    perfLogger.start(`${this.name}.validate`, '类方法');
    // 验证逻辑...
    perfLogger.end(`${this.name}.validate`, '类方法');
  }
  
  async transform(data) {
    perfLogger.start(`${this.name}.transform`, '类方法');
    // 转换逻辑...
    const result = data;
    perfLogger.end(`${this.name}.transform`, '类方法');
    return result;
  }
  
  async save(result) {
    perfLogger.start(`${this.name}.save`, '类方法');
    // 保存逻辑...
    perfLogger.end(`${this.name}.save`, '类方法');
  }
}

// ============================================
// 示例8: 监控DOM操作
// ============================================

function updateUI(elements, data) {
  perfLogger.start('更新UI', 'DOM操作');
  
  // 子步骤1: 查询元素
  perfLogger.start('查询元素', 'DOM操作');
  const targetElements = document.querySelectorAll(elements);
  perfLogger.end('查询元素', 'DOM操作', {
    元素数量: targetElements.length
  });
  
  // 子步骤2: 更新内容
  perfLogger.start('更新内容', 'DOM操作');
  let updatedCount = 0;
  targetElements.forEach((el, index) => {
    if (data[index]) {
      el.textContent = data[index];
      updatedCount++;
    }
  });
  perfLogger.end('更新内容', 'DOM操作', {
    更新数量: updatedCount
  });
  
  perfLogger.end('更新UI', 'DOM操作', {
    总元素: targetElements.length,
    已更新: updatedCount
  });
}

// ============================================
// 示例9: 监控事件处理
// ============================================

function setupEventListener() {
  let eventCount = 0;
  
  document.addEventListener('scroll', () => {
    eventCount++;
    
    // 只记录每10次事件
    if (eventCount % 10 === 0) {
      perfLogger.start('滚动事件处理', '事件');
      
      // 处理逻辑...
      handleScroll();
      
      perfLogger.end('滚动事件处理', '事件', {
        事件计数: eventCount
      });
    }
  });
}

// ============================================
// 示例10: 生成性能报告
// ============================================

function generatePerformanceReport() {
  console.log('\n=== 性能分析报告 ===\n');
  
  // 获取所有统计数据
  const stats = perfLogger.getStats();
  
  // 找出最慢的操作
  let slowestCategory = null;
  let slowestAvg = 0;
  
  Object.keys(stats).forEach(category => {
    const avg = parseFloat(stats[category].average);
    if (avg > slowestAvg) {
      slowestAvg = avg;
      slowestCategory = category;
    }
  });
  
  console.log(`🐌 最慢的分类: ${slowestCategory} (平均 ${slowestAvg}ms)`);
  
  // 输出完整报告
  perfLogger.report();
  
  // 返回统计数据供进一步分析
  return stats;
}

// ============================================
// 使用建议
// ============================================

/**
 * 1. 在关键函数的入口和出口添加计时
 * 2. 为复杂函数的子步骤添加独立计时
 * 3. 使用有意义的名称和分类
 * 4. 在 end() 时添加有用的附加信息
 * 5. 始终在 try-finally 或 catch 中调用 end()
 * 6. 避免在高频循环中直接使用（使用采样）
 * 7. 定期查看和分析性能报告
 * 8. 在生产环境可以选择性禁用
 */

// ============================================
// 导出工具函数（如果使用模块化）
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createTimedFunction,
    DataProcessor,
    generatePerformanceReport
  };
}

