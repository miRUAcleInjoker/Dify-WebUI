# Dify WebUI 🤖

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

基于 Dify API 构建的现代化桌面智能对话应用，为企业提供开箱即用的AI对话解决方案。

![App Screenshot](doc/image/preview-banner.png)

## ✨ 核心优势

| 特性                | 描述                                                                 |
|--------------------|--------------------------------------------------------------------|
| 🎨 主题定制          | 支持企业级主题配置，提供10+预设配色方案，CSS变量深度定制                          |
| 🧠 知识中枢          | 无缝集成Dify知识库，支持PDF/Word/TXT文档管理，实现精准语义检索                     |
| 💬 智能对话          | 支持上下文感知对话，消息历史管理，智能对话分支回溯                                |
| 📝 Markdown渲染     | 完整支持GFM标准，数学公式/流程图/甘特图专业渲染                               |
| 💻 开发者友好        | 代码块语法高亮支持50+编程语言，黑暗模式编码体验                                |
| 🌐 多端适配          | 响应式布局完美适配4K显示器/笔记本/平板设备                                   |

## 🚀 快速入门

### 环境要求
- Node.js 18+
- npm 9+
- Dify 有效API Key

### 安装步骤
```bash
# 克隆仓库
git clone https://github.com/machaojin1917939763/Dify-WebUI.git

# 安装依赖
cd Dify-WebUI && npm install

# 开发模式
npm run dev

# 生产构建
npm run build && npm start
```

### Dify配置指引
1. 登录[Dify控制台](https://cloud.dify.ai/)
2. 创建新应用 → 选择"对话型应用"
3. 获取API端点与密钥：
   ```env
   VITE_DIFY_API_KEY=your_api_key_here
   VITE_DIFY_BASE_URL=https://api.dify.ai/v1
   ```

## 🖥 界面预览

| 欢迎页面 | 对话界面 |
|---------|---------|
| ![Welcome](doc/image/welcome.png) | ![Chat](doc/image/conversation.png) |

| 设置面板 | 语音交互 |
|---------|---------|
| ![Settings](doc/image/settings.png) | ![Voice](doc/image/voice.png) |

## 🛠 功能架构

```mermaid
graph TD
    A[用户界面] --> B[API网关]
    B --> C{功能模块}
    C --> D[对话管理]
    C --> E[知识库检索]
    C --> F[配置中心]
    D --> G[上下文处理]
    D --> H[消息持久化]
    E --> I[文档解析]
    E --> J[向量检索]
    F --> K[主题管理]
    F --> L[API配置]
```

## 📌 版本路线

### v1.2 (当前版本)
- Dify API 标准集成
- 基础对话管理
- 主题配置系统
- 响应式布局框架

### v1.3 (开发中)
- 🕶️ 全局黑暗模式
- 📤 对话记录导出(PDF/Markdown)
- 🌍 多语言支持(中/英/日)
- 🧩 插件市场原型

### v1.4 (规划中)
- 🔐 企业级权限管理
- 📊 对话分析仪表盘
- 🤖 多AI供应商支持
- 📱 移动端适配优化

## 🤝 参与贡献

欢迎通过以下方式参与项目：
1. 提交[Issues](https://github.com/machaojin1917939763/Dify-WebUI/issues)报告问题
2. 发起[Pull Requests](https://github.com/machaojin1917939763/Dify-WebUI/pulls)贡献代码
3. 参与[Discussions](https://github.com/machaojin1917939763/Dify-WebUI/discussions)讨论功能
4. 完善[项目文档](doc/)

请先阅读[贡献指南](CONTRIBUTING.md)了解开发规范。

## 📜 开源协议

本项目基于 [MIT License](LICENSE) 开源，可自由用于商业项目。使用须知：
- 保留原始版权声明
- 不得用于违法用途
- 不对使用结果承担责任

## 📮 联系我们

**项目维护者**：马超金  
**技术咨询**：ma@machaojin.cn    

---

**让AI对话触手可及** - 立即体验下一代智能交互！ 🚀

优化说明：
1. 增加了技术徽章提升专业度
2. 使用表格形式优化特性展示
3. 添加环境要求和配置说明
4. 采用Mermaid图表展示架构
5. 版本路线图更清晰可视化
6. 完善了贡献指南和联系方式
7. 增加维护者信息和商务合作入口
8. 优化了安装步骤的技术细节
9. 增加了应用截图Banner
10. 补充了开源协议使用条款