# 故障排除

本文档列出了使用 SDKWork Agent 时可能遇到的常见问题及解决方案。

## 安装问题

### 安装失败

**症状**: 运行 `npm install sdkwork-agent` 时出错

**解决方案**:
1. 检查 Node.js 版本
   ```bash
   node --version  # 应 >= 18.0.0
   ```

2. 清除 npm 缓存
   ```bash
   npm cache clean --force
   ```

3. 使用其他包管理器
   ```bash
   yarn add sdkwork-agent
   # 或
   pnpm add sdkwork-agent
   ```

### TypeScript 类型错误

**症状**: 编译时出现类型错误

**解决方案**:
1. 确保 `tsconfig.json` 配置正确
   ```json
   {
     "compilerOptions": {
       "moduleResolution": "bundler",
       "esModuleInterop": true
     }
   }
   ```

2. 安装类型定义
   ```bash
   npm install -D @types/node
   ```

## 运行时问题

### Agent 初始化失败

**症状**: `await agent.initialize()` 抛出错误

**可能原因**:
1. API 密钥无效
2. 网络连接问题
3. 依赖服务未启动

**解决方案**:
```typescript
try {
  await agent.initialize();
} catch (error) {
  console.error('初始化失败:', error.message);
  // 检查 API 密钥
  // 检查网络连接
}
```

### LLM 调用失败

**症状**: `agent.chat()` 返回错误或超时

**解决方案**:
1. 检查 API 密钥
   ```typescript
   // 确保环境变量已设置
   console.log(process.env.OPENAI_API_KEY);
   ```

2. 增加超时时间
   ```typescript
   const response = await agent.chat({
     messages: [...],
     timeout: 60000  // 60秒
   });
   ```

3. 检查网络代理设置

### Skill 执行失败

**症状**: `agent.executeSkill()` 返回错误

**常见错误**:
- `Skill not found`: Skill ID 错误
- `Execution timeout`: 执行超时
- `Invalid input`: 输入参数不符合 Schema

**解决方案**:
```typescript
// 检查 Skill 是否存在
const skill = agent.skills.get('skill-id');
if (!skill) {
  console.error('Skill 不存在');
}

// 验证输入
const result = await agent.executeSkill('skill-id', JSON.stringify(input));
if (!result.success) {
  console.error('执行失败:', result.error);
}
```

### Tool 调用失败

**症状**: `agent.executeTool()` 返回错误

**解决方案**:
1. 检查 Tool 是否存在
2. 验证输入参数
3. 检查确认级别

```typescript
const result = await agent.executeTool('file-read', JSON.stringify({
  path: './file.txt'
}));

if (!result.success) {
  console.error('Tool 错误:', result.error.message);
}
```

## 性能问题

### 内存泄漏

**症状**: 应用运行一段时间后内存持续增长

**解决方案**:
1. 及时销毁 Agent
   ```typescript
   await agent.destroy();
   ```

2. 限制记忆大小
   ```typescript
   const agent = createAgent({
     memory: { maxTokens: 4000 }
   });
   ```

3. 定期清理记忆
   ```typescript
   await agent.memory.clear();
   ```

### 响应缓慢

**症状**: API 调用响应时间过长

**优化建议**:
1. 使用流式响应
   ```typescript
   const stream = agent.chatStream({ messages });
   ```

2. 启用缓存
   ```typescript
   const agent = createAgent({
     memory: { enableCache: true }
   });
   ```

3. 减少上下文长度
   ```typescript
   const response = await agent.chat({
     messages: messages.slice(-10)  // 只保留最近10条
   });
   ```

## 浏览器环境问题

### 模块导入错误

**症状**: 浏览器中出现 `Cannot find module` 错误

**解决方案**:
1. 使用正确的导入路径
   ```typescript
   // 浏览器环境
   import { createAgent } from 'sdkwork-agent';
   ```

2. 配置构建工具
   ```javascript
   // vite.config.js
   export default {
     resolve: {
       alias: {
         'sdkwork-agent': 'sdkwork-agent/dist/browser/index.js'
       }
     }
   };
   ```

### CORS 错误

**症状**: 浏览器中出现跨域错误

**解决方案**:
1. 使用代理服务器
2. 配置后端允许跨域
3. 使用服务器端渲染

## 调试技巧

### 启用详细日志

```typescript
const agent = createAgent({
  logger: {
    level: 'debug',
    transport: console
  }
});
```

### 监听所有事件

```typescript
agent.on('*', (event) => {
  console.log('Event:', event.type, event.payload);
});
```

### 检查 Agent 状态

```typescript
console.log('Agent ID:', agent.id);
console.log('Agent State:', agent.state);
console.log('Registered Skills:', agent.skills.list().map(s => s.id));
console.log('Registered Tools:', agent.tools.list().map(t => t.id));
```

## 获取帮助

如果以上解决方案无法解决你的问题：

1. **查看文档**: [完整文档](https://sdkwork-agent.vercel.app)
2. **GitHub Issues**: [提交问题](https://github.com/Sdkwork-Cloud/sdkwork-agent/issues)
3. **社区讨论**: [GitHub Discussions](https://github.com/Sdkwork-Cloud/sdkwork-agent/discussions)

## 报告问题

报告问题时请提供：

1. SDKWork Agent 版本
2. Node.js 版本
3. 操作系统
4. 错误信息和堆栈跟踪
5. 复现步骤
6. 最小代码示例
