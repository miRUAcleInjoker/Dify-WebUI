class AgentChat {
    constructor() {
        console.log('初始化AgentChat...');
        
        this.initializeElements();
        this.initializeEventListeners();
        this.currentConversationId = '';
        this.firstMessageId = null;
        this.lastMessageId = null;
        this.loadConversations();
        this.apiKey = localStorage.getItem('openai_api_key') || 'dont_update_me';
        this.baseUrl = localStorage.getItem('openai_base_url') || 'https://api.openai.com/v1';
        this.model = localStorage.getItem('openai_model') || 'gpt-3.5-turbo';
        this.maxTokens = parseInt(localStorage.getItem('openai_max_tokens') || '2000');
        this.temperature = parseFloat(localStorage.getItem('openai_temperature') || '0.7');
        this.messages = [];
        this.thinkingRounds = parseInt(localStorage.getItem('thinking_rounds') || '3');
        this.currentRound = 0;
        this.model_type = localStorage.getItem('openai_live') || true;
        //弹窗
        this.confirmBtn = document.getElementById("confirmBtn");
        this.cancelBtn = document.getElementById("cancelBtn");
        this.tipPage = document.getElementById("tipPage");
        
        // 初始化输入框高度
        this.initTextareaHeight();
        
        // 应用保存的主题
        this.applyTheme();
        
        // 配置Markdown解析
        this.configureMarked();
        
        // 初始化代码高亮
        this.initializeCodeHighlighting();

        // 如果是dify，则使用dify的apiKey和baseUrl
        if(this.model_type){
            this.apiKey = localStorage.getItem("apiKey");
            this.baseUrl = localStorage.getItem("baseUrl");
        }
        console.log('AgentChat初始化完成');
    }

    initializeElements() {
        // 页面元素
        this.welcomePage = document.getElementById('welcomePage');
        this.chatContainer = document.getElementById('chatContainer');
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.welcomeUserInput = document.getElementById('welcomeUserInput');
        this.sendButton = document.getElementById('sendButton');
        this.welcomeSendButton = document.getElementById('welcomeSendButton');
        this.newChatButton = document.getElementById('newChatButton');
        this.conversationItems = document.getElementById('conversationItems');
        this.menuButton = document.getElementById('menuButton');
        this.showSidebarButton = document.getElementById('showSidebarButton');
        this.toggleSidebarButton = document.getElementById('toggleSidebarButton');
        this.sidebar = document.querySelector('.sidebar');
        this.mainContent = document.querySelector('.main-content');
        this.overlay = document.getElementById('overlay');
        this.settingsButton = document.getElementById('settingsButton');
        this.chatModeButton = document.getElementById('chatModeButton');
        
        
        // 添加设置面板事件
        this.settingsButton.addEventListener('click', () => this.showSettingsModal());
        
        // 确保所有必要的元素都存在
        if (!this.chatContainer || !this.welcomePage || !this.chatMessages || 
            !this.userInput || !this.welcomeUserInput || !this.sendButton || 
            !this.welcomeSendButton || !this.newChatButton || !this.conversationItems) {
            console.error('初始化失败：找不到必要的DOM元素');
            return false;
        }
        
        return true;
    }

    initializeEventListeners() {
        // 发送按钮点击事件
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.welcomeSendButton.addEventListener('click', () => {
            const welcomeInput = this.welcomeUserInput.value.trim();
            if (welcomeInput) {
                this.welcomePage.style.display = 'none';
                this.chatContainer.style.display = 'flex';
                this.userInput.value = welcomeInput;
                this.sendMessage();
            }
        });

        // 输入框键盘事件
        this.userInput.addEventListener('keydown', (e) => this.handleInputKeydown(e));
        this.welcomeUserInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const welcomeInput = this.welcomeUserInput.value.trim();
                if (welcomeInput) {
                    this.welcomePage.style.display = 'none';
                    this.chatContainer.style.display = 'flex';
                    this.userInput.value = welcomeInput;
                    this.sendMessage();
                }
            } else {
                this.autoResizeTextarea(e);
            }
        });

        // 新对话按钮点击事件
        this.newChatButton.addEventListener('click', () => {
            // 清除当前会话ID
            this.currentConversationId = null;
            // 创建新对话
            this.startNewChat();
            // 切换到聊天界面
            this.welcomePage.style.display = 'none';
            this.chatContainer.style.display = 'flex';
        });

        // 侧边栏切换按钮点击事件
        this.menuButton.addEventListener('click', () => this.toggleSidebar());
        this.showSidebarButton.addEventListener('click', () => this.toggleSidebar());
        this.toggleSidebarButton.addEventListener('click', () => this.toggleSidebar());
        this.overlay.addEventListener('click', () => this.toggleSidebar());

        // 欢迎页面建议按钮事件
        document.querySelectorAll('.welcome-suggestion-items button').forEach(button => {
            button.addEventListener('click', () => {
                const text = button.textContent.replace(/[""]/g, '');
                this.welcomeUserInput.value = text;
                this.sendMessage();
            });
        });

        // 返回普通聊天模式按钮点击事件
        if (this.chatModeButton) {
            this.chatModeButton.addEventListener('click', () => {
                window.location.href = '../chat/index.html';
            });
        } else {
            console.error("找不到返回普通聊天模式按钮");
        }
    }

    async sendMessage() {
        console.log('发送消息');
        const input = this.welcomePage.style.display === 'flex' ? this.welcomeUserInput : this.userInput;
        const message = input.value.trim();
        console.log('消息内容:', message);
        if (!message) return;

        // 如果在欢迎页面，切换到聊天页面
        if (this.welcomePage.style.display === 'flex') {
            this.welcomePage.style.display = 'none';
            this.chatContainer.style.display = 'flex';
        }

        // 如果没有当前会话，创建新会话
        if (!this.currentConversationId) {
            console.log('没有当前会话，创建新会话');
            const newConversationId = this.startNewChat();
            if (!newConversationId) {
                console.error('创建新会话失败，无法发送消息');
                return;
            }
            console.log(`新会话创建成功: ${newConversationId}`);
        }

        // 添加用户消息
        this.addMessage(message, 'user');
        
        // 保存用户消息到当前会话
        this.saveMessageToConversation(message, 'user');

        // 清空输入框
        input.value = '';
        this.autoResizeTextarea({ target: input });

        // 重置迭代计数
        this.currentRound = 0;
        
        // 开始多轮思考回答
        await this.startThinkingProcess(message);
    }

    addMessage(content, type) {
        console.log(`添加${type}消息:`, content);
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        avatar.src = type === 'user' ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=user' 
                                   : 'https://api.dicebear.com/7.x/adventurer/svg?seed=agent';
        avatar.alt = type === 'user' ? '用户头像' : 'Agent头像';

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'message-content-wrapper';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        try {
            // 使用marked处理Markdown内容
            let formattedContent = this.formatMessage(content);
            
            // 确保内容完整
            if (content.includes('<think>') && !formattedContent.endsWith('</div></div>')) {
                formattedContent += '</div></div>';
            }
            
            messageContent.innerHTML = formattedContent;
            console.log('设置消息内容长度:', formattedContent.length);
        } catch (error) {
            console.error('设置消息内容失败:', error);
            messageContent.textContent = content;
        }
        
        // 添加消息操作按钮
        const messageActions = document.createElement('div');
        messageActions.className = 'message-actions';
        messageActions.innerHTML = `
            <button class="copy-message-button" title="复制消息">
                <i class="fas fa-copy"></i>
            </button>
        `;
        
        // 添加复制消息事件
        const copyButton = messageActions.querySelector('.copy-message-button');
        if (copyButton) {
            copyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(content).then(() => {
                    copyButton.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => {
                        copyButton.innerHTML = '<i class="fas fa-copy"></i>';
                    }, 2000);
                }).catch(err => {
                    console.error('复制失败:', err);
                    copyButton.innerHTML = '<i class="fas fa-times"></i>';
                });
            });
        }
        
        contentWrapper.appendChild(messageContent);
        contentWrapper.appendChild(messageActions);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(contentWrapper);

        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        // 添加显示动画
        setTimeout(() => messageDiv.classList.add('show'), 10);
        
        // 初始化代码高亮
        setTimeout(() => {
            if (window.hljs) {
                try {
                    // 查找所有代码块
                    const codeBlocks = messageDiv.querySelectorAll('pre code');
                    console.log(`找到${codeBlocks.length}个代码块`);
                    
                    // 应用高亮
                    codeBlocks.forEach(block => {
                        hljs.highlightElement(block);
                    });
                    
                    console.log('代码高亮应用成功');
                } catch (error) {
                    console.error('应用代码高亮失败:', error);
                }
            } else {
                console.warn('highlight.js未加载，无法应用代码高亮');
            }
        }, 100);
        
        return messageDiv;
    }

    formatMessage(content) {
        try {
            // 确保内容是字符串
            if (typeof content !== 'string') {
                console.warn('消息内容不是字符串类型:', typeof content);
                content = String(content);
            }
            
            // 处理思考过程标签
            content = content.replace(/<think>([\s\S]*?)<\/think>/g, (match, thinkContent) => {
                if (!thinkContent.trim()) return '';
                return `
                    <details style="border: 1px solid #ddd; padding: 10px; border-radius: 8px; background-color: #f9f9f9; margin-bottom: 10px;">
                        <summary style="font-size: 1.2em; font-weight: bold; color: #333; cursor: pointer;">
                            🧠 思考过程
                        </summary>
                        <div style="color: #555; font-style: italic; padding: 10px; background-color: #f4f4f4; border-radius: 5px; line-height: 1.5;">
                            ${thinkContent.trim()}
                        </div>
                    </details>
                    <div style="border: 1px solid #ddd; padding: 10px; border-radius: 8px; background-color: #f9f9f9; margin-bottom: 10px;">
                        <span style="font-size: 1.2em; font-weight: bold; color: #333;">
                            📌 正式回答
                        </span>
                        <div style="color: #000; padding: 10px; background-color: #f4f4f4; border-radius: 5px; line-height: 1.5;">
                `;
            });
            
            // 使用marked.js将Markdown转换为HTML
            const formattedContent = marked.parse(content);
            
            // 检查是否有未闭合的div标签（由思考过程标签处理引起）
            let processedContent = formattedContent;
            if (content.includes('<think>') && !processedContent.endsWith('</div></div>')) {
                processedContent += '</div></div>';
            }
            
            // 处理代码块，添加复制和折叠按钮
            processedContent = processedContent.replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, (match, codeContent) => {
                // 提取语言信息（如果有）
                let language = 'plaintext';
                const langMatch = match.match(/<code class="language-([^"]+)">/);
                if (langMatch && langMatch[1]) {
                    language = langMatch[1];
                }
                
                // 对代码内容进行HTML转义，防止XSS攻击
                const escapedCode = codeContent
                    .replace(/&lt;/g, "<")
                    .replace(/&gt;/g, ">")
                    .replace(/&amp;/g, "&");
                
                // 生成唯一ID
                const blockId = 'code-block-' + Math.random().toString(36).substr(2, 9);
                
                return `
                    <div style="margin: 15px 0; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background-color: #f5f5f5; border-bottom: 1px solid #ddd;">
                            <span style="font-size: 0.9rem; color: #555;">${language}</span>
                            <div>
                                <button onclick="document.getElementById('${blockId}').style.display = document.getElementById('${blockId}').style.display === 'none' ? 'block' : 'none'; this.textContent = this.textContent === '折叠 ▼' ? '展开 ▶' : '折叠 ▼';" style="background: #e9e9e9; border: none; border-radius: 4px; padding: 4px 8px; margin-right: 8px; cursor: pointer; font-size: 12px;">折叠 ▼</button>
                                <button onclick="navigator.clipboard.writeText(document.getElementById('${blockId}-code').textContent); this.textContent = '已复制 ✓'; setTimeout(() => { this.textContent = '复制 📋'; }, 2000);" style="background: #e9e9e9; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px;">复制 📋</button>
                            </div>
                        </div>
                        <div id="${blockId}" style="display: block;">
                            <pre style="margin: 0; padding: 12px; overflow-x: auto; background-color: #f8f8f8;"><code id="${blockId}-code" class="language-${language}">${escapedCode}</code></pre>
                        </div>
                    </div>
                `;
            });
            
            return processedContent;
        } catch (error) {
            console.error('格式化消息失败:', error);
            // 如果格式化失败，返回原始内容
            return content;
        }
    }

    // 禁用输入框和发送按钮
    disableInput() {
        this.userInput.disabled = true;
        this.sendButton.disabled = true;
        this.userInput.style.cursor = 'not-allowed';
        this.sendButton.style.cursor = 'not-allowed';
        this.userInput.style.opacity = '0.7';
        this.sendButton.style.opacity = '0.7';
        
        // 添加加载动画
        this.sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    // 启用输入框和发送按钮
    enableInput() {
        this.userInput.disabled = false;
        this.sendButton.disabled = false;
        this.userInput.style.cursor = 'text';
        this.sendButton.style.cursor = 'pointer';
        this.userInput.style.opacity = '1';
        this.sendButton.style.opacity = '1';
        
        // 恢复发送按钮图标
        this.sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
    }

    async startThinkingProcess(message) {
        // 禁用输入框
        this.disableInput();
        
        try {
            // 初始提问
            let userQuestion = message;
            
            // 创建一个包含所有思考轮次的消息容器
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message bot';
            
            const avatar = document.createElement('img');
            avatar.className = 'avatar';
            avatar.src = 'https://api.dicebear.com/7.x/adventurer/svg?seed=agent';
            avatar.alt = 'Agent头像';
            
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'message-content-wrapper';
            
            // 创建消息内容容器
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            
            // 添加到DOM
            contentWrapper.appendChild(messageContent);
            messageDiv.appendChild(avatar);
            messageDiv.appendChild(contentWrapper);
            
            this.chatMessages.appendChild(messageDiv);
            
            // 存储所有轮次的回答
            let allResponses = [];
            let finalResponse = '';
            
            // 执行多轮思考
            for (let round = 0; round < this.thinkingRounds; round++) {
                this.currentRound = round + 1;
                console.log(`开始第${this.currentRound}轮思考`);
                
                try {
                    // 获取Agent回复
                    const response = await this.getAgentResponse(userQuestion, round, messageContent, this.model_type);
                    
                    // 如果是最后一轮，显示最终答案
                    if (round === this.thinkingRounds - 1) {
                        finalResponse = response;
                        
                        // 清空消息内容
                        messageContent.innerHTML = '';
                        
                        // 创建最终答案容器
                        const finalAnswerDiv = document.createElement('div');
                        finalAnswerDiv.className = 'final-answer';
                        
                        // 设置最终答案内容
                        let formattedResponse = this.formatMessage(finalResponse);
                        
                        // 确保内容完整
                        if (finalResponse.includes('<think>') && !formattedResponse.endsWith('</div></div>')) {
                            formattedResponse += '</div></div>';
                        }
                        
                        finalAnswerDiv.innerHTML = formattedResponse;
                        messageContent.appendChild(finalAnswerDiv);
                        
                        // 如果有思考过程，添加切换按钮和思考过程
                        if (allResponses.length > 0) {
                            // 添加分隔符
                            messageContent.appendChild(document.createElement('br'));
                            
                            // 添加切换按钮
                            const toggleButton = document.createElement('button');
                            toggleButton.className = 'toggle-thinking-button';
                            toggleButton.innerHTML = '显示思考过程';
                            toggleButton.addEventListener('click', () => {
                                const thinkingProcessDiv = messageContent.querySelector('.thinking-process');
                                if (thinkingProcessDiv) {
                                    if (thinkingProcessDiv.style.display === 'none') {
                                        thinkingProcessDiv.style.display = 'block';
                                        toggleButton.innerHTML = '隐藏思考过程';
                                    } else {
                                        thinkingProcessDiv.style.display = 'none';
                                        toggleButton.innerHTML = '显示思考过程';
                                    }
                                }
                            });
                            messageContent.appendChild(toggleButton);
                            
                            // 添加思考过程容器
                            const thinkingProcessDiv = document.createElement('div');
                            thinkingProcessDiv.className = 'thinking-process';
                            thinkingProcessDiv.style.display = 'none'; // 默认隐藏思考过程
                            thinkingProcessDiv.innerHTML = allResponses.join('');
                            messageContent.appendChild(thinkingProcessDiv);
                        }
                        
                        // 保存Agent回复到当前会话
                        this.saveMessageToConversation(finalResponse, 'bot');
                    } else {
                        // 否则，将回答添加到思考过程中
                        let formattedResponse = this.formatMessage(response);
                        
                        // 确保内容完整
                        if (response.includes('<think>') && !formattedResponse.endsWith('</div></div>')) {
                            formattedResponse += '</div></div>';
                        }
                        
                        allResponses.push(`<div class="thinking-round">
                            <div class="round-header">思考轮次 ${round + 1}/${this.thinkingRounds}</div>
                            <div class="round-content">${formattedResponse}</div>
                        </div>`);
                        
                        // 更新用户问题，加入上一轮的回答
                        userQuestion = `我的问题是: ${message}\n\n你上一轮的回答是: ${response}\n\n请继续思考并改进你的回答。`;
                    }
                } catch (error) {
                    console.error(`第${this.currentRound}轮思考失败:`, error);
                    messageContent.innerHTML = `<div class="error-message">思考过程中出现错误: ${error.message}</div>`;
                    break;
                }
            }
            
            // 滚动到底部
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            
            // 初始化代码高亮
            setTimeout(() => {
                if (window.hljs) {
                    try {
                        // 查找所有代码块
                        const codeBlocks = messageDiv.querySelectorAll('pre code');
                        console.log(`找到${codeBlocks.length}个代码块`);
                        
                        // 应用高亮
                        codeBlocks.forEach(block => {
                            hljs.highlightElement(block);
                        });
                        
                        console.log('代码高亮应用成功');
                    } catch (error) {
                        console.error('应用代码高亮失败:', error);
                    }
                } else {
                    console.warn('highlight.js未加载，无法应用代码高亮');
                }
            }, 100);
        } catch (error) {
            console.error('思考过程出错:', error);
            await this.showInfoPage("思考过程出现错误，请重试");
        } finally {
            // 启用输入框
            this.enableInput();
        }
    }

    async getAgentResponse(message, round = 0, existingMessageContent = null, dify = false) {
        try {
            if (!this.apiKey) {
                return '请先在设置中配置OpenAI API密钥。';
            }

            // 构建消息历史
            let messagesForAPI = [];
            console.log(dify)
            // 第一轮直接使用用户问题
            if (round === 0) {
                messagesForAPI = [
                    {
                        role: 'system',
                        content: '你是一个深度思考的AI助手，能够提供全面、准确的回答。'
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ];
            } else {
                // 非第一轮，使用完整的提示词
                messagesForAPI = [
                    {
                        role: 'system',
                        content: '你是一个深度思考的AI助手，能够对自己的回答进行反思、修正和补充。请对上一轮的回答进行改进，使其更加全面、准确和有深度。'
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ];
            }

            console.log(`发送API请求: 轮次=${round}, 消息长度=${message.length}`);
            
            const response = dify ? await fetch(`${this.baseUrl}/chat-messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    query: messagesForAPI,
                    user: Math.random().toString(36).substring(2),
                    inputs: {},
                    response_mode: "streaming"
                })
            }) : await fetch(`${this.baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messagesForAPI,
                    max_tokens: this.maxTokens,
                    temperature: this.temperature,
                    stream: true
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || '请求失败');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = '';

            // 使用现有的消息内容元素或创建一个新的
            let messageContent;
            let tempMessageDiv = null;
            
            if (existingMessageContent && existingMessageContent instanceof HTMLElement) {
                messageContent = existingMessageContent;
                // 显示当前正在生成的轮次
                const roundLabel = round === 0 ? "生成初始回答中..." : `生成思考修正中 (第${round + 1}轮)...`;
                messageContent.innerHTML = `<div class="generating-message">${roundLabel}</div>`;
            } else {
                // 创建一个临时的消息div用于实时显示内容
                tempMessageDiv = document.createElement('div');
                tempMessageDiv.className = 'message bot';

                const avatar = document.createElement('img');
                avatar.className = 'avatar';
                avatar.src = 'https://api.dicebear.com/7.x/adventurer/svg?seed=agent';
                avatar.alt = 'Agent头像';

                const contentWrapper = document.createElement('div');
                contentWrapper.className = 'message-content-wrapper';

                messageContent = document.createElement('div');
                messageContent.className = 'message-content';

                contentWrapper.appendChild(messageContent);
                tempMessageDiv.appendChild(avatar);
                tempMessageDiv.appendChild(contentWrapper);

                this.chatMessages.appendChild(tempMessageDiv);
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

                // 添加显示动画
                setTimeout(() => tempMessageDiv.classList.add('show'), 10);
            }

            try {
                if(dify){
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');
                        
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.slice(6));
                                    switch (data.event) {
                                        case 'message':
                                            fullContent += data.answer;
                                            // 实时更新消息内容
                                            messageContent.innerHTML = this.formatMessage(fullContent);
                                            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
                                            break;
                                    }
                                } catch (e) {
                                    console.error('解析响应数据失败:', e);
                                    continue;
                                }
                            }
                        }
                    }
                }else{
                    while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
    
                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim() !== '');
    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;
    
                            try {
                                const json = JSON.parse(data);
                                const content = json.choices[0]?.delta?.content || '';
                                if (content) {
                                    fullContent += content;
                                    // 实时更新消息内容
                                    messageContent.innerHTML = this.formatMessage(fullContent);
                                    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
                                }
                            } catch (e) {
                                console.error('解析响应数据出错:', e);
                            }
                        }
                    }
                }
                }
            } catch (error) {
                console.error('读取流数据失败:', error);
                // 如果读取流失败，但已经有一些内容，仍然返回已收到的内容
                if (fullContent) {
                    console.log('返回部分内容:', fullContent.length);
                    return fullContent;
                }
                throw error;
            } finally {
                // 如果是临时消息div，在完成后移除
                if (tempMessageDiv) {
                    this.chatMessages.removeChild(tempMessageDiv);
                }
            }

            // 添加助手回复到对话历史
            this.messages.push({
                role: 'assistant',
                content: fullContent
            });

            console.log(`API响应完成: 内容长度=${fullContent.length}`);
            return fullContent;
        } catch (error) {
            console.error('API调用错误:', error);
            return `调用OpenAI API时出错: ${error.message}`;
        }
    }

    async loadConversations() {
        try {
            // 从localStorage获取会话列表
            const conversations = JSON.parse(localStorage.getItem('agent_conversations') || '[]');
            console.log(`加载了${conversations.length}个会话`);
            
            // 清空会话列表
            this.conversationItems.innerHTML = '';
            
            // 如果没有会话，显示提示信息
            if (conversations.length === 0) {
                const emptyMessage = document.createElement('div');
                emptyMessage.className = 'empty-conversations';
                emptyMessage.textContent = '暂无历史对话';
                this.conversationItems.appendChild(emptyMessage);
                return;
            }
            
            // 按时间倒序排列会话
            conversations.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            
            // 渲染会话列表
            conversations.forEach(conversation => {
                this.addConversationToList(conversation);
            });
            
            // 如果有当前会话ID，选中该会话
            if (this.currentConversationId) {
                const activeItem = this.conversationItems.querySelector(`.conversation-item[data-id="${this.currentConversationId}"]`);
                if (activeItem) {
                    activeItem.classList.add('active');
                }
            }
        } catch (error) {
            console.error('加载会话失败:', error);
            // 显示错误提示
            this.conversationItems.innerHTML = '<div class="error-message">加载会话失败</div>';
        }
    }
    
    // 将会话添加到列表中
    addConversationToList(conversation) {
        const item = document.createElement('div');
        item.className = 'conversation-item';
        item.dataset.id = conversation.id;
        
        // 如果是当前会话，添加active类
        if (conversation.id === this.currentConversationId) {
            item.classList.add('active');
        }
        
        // 创建会话标题
        const title = document.createElement('div');
        title.className = 'conversation-title';
        title.textContent = conversation.title || '新对话';
        
        // 创建会话时间
        const time = document.createElement('div');
        time.className = 'conversation-time';
        time.textContent = this.formatTime(conversation.updatedAt);
        
        // 创建删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-conversation-button';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.title = '删除对话';
        deleteBtn.onclick = (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            this.deleteConversation(conversation.id);
        };
        
        // 添加到item
        item.appendChild(title);
        item.appendChild(time);
        item.appendChild(deleteBtn);
        
        // 添加点击事件，切换到该会话
        item.addEventListener('click', () => {
            this.loadConversation(conversation.id);
        });
        
        // 添加到列表
        this.conversationItems.appendChild(item);
    }
    
    // 格式化时间
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // 如果是今天
        if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
            return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }
        
        // 如果是昨天
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear()) {
            return '昨天';
        }
        
        // 如果是今年
        if (date.getFullYear() === now.getFullYear()) {
            return `${date.getMonth() + 1}月${date.getDate()}日`;
        }
        
        // 其他情况
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    }
    
    // 加载指定会话
    async loadConversation(conversationId) {
        try {
            console.log(`加载会话: ${conversationId}`);
            
            // 从localStorage获取会话列表
            const conversations = JSON.parse(localStorage.getItem('agent_conversations') || '[]');
            
            // 查找指定会话
            const conversation = conversations.find(c => c.id === conversationId);
            if (!conversation) {
                console.error(`未找到会话: ${conversationId}`);
                return;
            }
            
            // 更新当前会话ID
            this.currentConversationId = conversationId;
            
            // 更新会话列表中的active状态
            const items = this.conversationItems.querySelectorAll('.conversation-item');
            items.forEach(item => {
                if (item.dataset.id === conversationId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
            
            // 清空聊天消息
            this.chatMessages.innerHTML = '';
            
            // 如果在欢迎页面，切换到聊天页面
            if (this.welcomePage.style.display === 'flex') {
                this.welcomePage.style.display = 'none';
                this.chatContainer.style.display = 'flex';
            }
            
            // 加载会话消息
            if (conversation.messages && conversation.messages.length > 0) {
                conversation.messages.forEach(message => {
                    this.addMessage(message.content, message.type);
                });
                
                // 滚动到底部
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            } else {
                console.log('会话没有消息');
            }
            
            // 更新会话时间
            conversation.updatedAt = Date.now();
            localStorage.setItem('agent_conversations', JSON.stringify(conversations));
            
            // 更新会话列表
            this.updateConversationList();
        } catch (error) {
            console.error('加载会话失败:', error);
        }
    }
    
    // 创建新会话
    startNewChat() {
        try {
            console.log('创建新会话');
            
            // 检查是否已经有一个空的新会话
            const conversations = JSON.parse(localStorage.getItem('agent_conversations') || '[]');
            const emptyConversation = conversations.find(c => 
                c.title === '新对话' && (!c.messages || c.messages.length === 0)
            );
            
            // 如果已经有一个空的新会话，直接使用它
            if (emptyConversation) {
                console.log(`使用已存在的空会话: ${emptyConversation.id}`);
                this.currentConversationId = emptyConversation.id;
                
                // 更新会话时间
                emptyConversation.updatedAt = Date.now();
                localStorage.setItem('agent_conversations', JSON.stringify(conversations));
                
                // 重新加载会话列表
                this.loadConversations();
                
                // 清空聊天消息
                this.chatMessages.innerHTML = '';
                
                // 如果在欢迎页面，切换到聊天页面
                if (this.welcomePage.style.display === 'flex') {
                    this.welcomePage.style.display = 'none';
                    this.chatContainer.style.display = 'flex';
                }
                
                return emptyConversation.id;
            }
            
            // 生成新会话ID
            const conversationId = 'conv-' + Date.now();
            
            // 创建新会话对象
            const newConversation = {
                id: conversationId,
                title: '新对话',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                messages: []
            };
            
            // 添加新会话
            conversations.push(newConversation);
            
            // 保存到localStorage
            localStorage.setItem('agent_conversations', JSON.stringify(conversations));
            
            // 更新当前会话ID
            this.currentConversationId = conversationId;
            
            // 重新加载会话列表
            this.loadConversations();
            
            // 清空聊天消息
            this.chatMessages.innerHTML = '';
            
            // 如果在欢迎页面，切换到聊天页面
            if (this.welcomePage.style.display === 'flex') {
                this.welcomePage.style.display = 'none';
                this.chatContainer.style.display = 'flex';
            }
            
            console.log(`新会话创建成功: ${conversationId}`);
            return conversationId;
        } catch (error) {
            console.error('创建新会话失败:', error);
            return null;
        }
    }
    
    // 删除会话
    deleteConversation(conversationId) {
        try {
            console.log(`删除会话: ${conversationId}`);
            
            // 确认删除
            if (!confirm('确定要删除这个对话吗？')) {
                return;
            }
            
            // 从localStorage获取会话列表
            const conversations = JSON.parse(localStorage.getItem('agent_conversations') || '[]');
            
            // 过滤掉要删除的会话
            const filteredConversations = conversations.filter(c => c.id !== conversationId);
            
            // 保存到localStorage
            localStorage.setItem('agent_conversations', JSON.stringify(filteredConversations));
            
            // 如果删除的是当前会话，清空当前会话ID
            if (this.currentConversationId === conversationId) {
                this.currentConversationId = '';
                
                // 清空聊天消息
                this.chatMessages.innerHTML = '';
                
                // 切换到欢迎页面
                this.welcomePage.style.display = 'flex';
                this.chatContainer.style.display = 'none';
            }
            
            // 重新加载会话列表
            this.loadConversations();
        } catch (error) {
            console.error('删除会话失败:', error);
        }
    }
    
    // 保存消息到当前会话
    saveMessageToConversation(content, type) {
        try {
            console.log(`保存${type}消息到会话: 长度=${content.length}`);
            
            // 如果没有当前会话ID，创建新会话
            if (!this.currentConversationId) {
                console.log('没有当前会话ID，创建新会话');
                const newConversationId = this.startNewChat();
                if (!newConversationId) {
                    console.error('创建新会话失败');
                    return;
                }
                console.log(`新会话创建成功: ${newConversationId}`);
            }
            
            // 从localStorage获取会话列表
            const conversations = JSON.parse(localStorage.getItem('agent_conversations') || '[]');
            console.log(`当前有${conversations.length}个会话`);
            
            // 查找当前会话
            const conversationIndex = conversations.findIndex(c => c.id === this.currentConversationId);
            if (conversationIndex === -1) {
                console.error(`未找到当前会话: ${this.currentConversationId}`);
                return;
            }
            
            // 添加消息
            const message = {
                id: 'msg-' + Date.now(),
                content,
                type,
                timestamp: Date.now()
            };
            
            // 确保messages数组存在
            if (!conversations[conversationIndex].messages) {
                conversations[conversationIndex].messages = [];
            }
            
            conversations[conversationIndex].messages.push(message);
            console.log(`消息已添加到会话，当前会话有${conversations[conversationIndex].messages.length}条消息`);
            
            // 更新会话标题（使用第一条用户消息作为标题）
            if (type === 'user' && conversations[conversationIndex].title === '新对话' && 
                conversations[conversationIndex].messages.filter(m => m.type === 'user').length === 1) {
                // 截取前20个字符作为标题
                const title = content.length > 20 ? content.substring(0, 20) + '...' : content;
                conversations[conversationIndex].title = title;
                console.log(`更新会话标题: ${title}`);
            }
            
            // 更新会话时间
            conversations[conversationIndex].updatedAt = Date.now();
            
            // 保存到localStorage
            localStorage.setItem('agent_conversations', JSON.stringify(conversations));
            
            // 重新加载会话列表，但不要重新创建DOM元素
            this.updateConversationList();
            
            console.log('消息保存成功');
        } catch (error) {
            console.error('保存消息失败:', error);
        }
    }
    
    // 更新会话列表，但不重新创建DOM元素
    updateConversationList() {
        try {
            // 从localStorage获取会话列表
            const conversations = JSON.parse(localStorage.getItem('agent_conversations') || '[]');
            
            // 按时间倒序排列会话
            conversations.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            
            // 更新现有会话项
            const items = this.conversationItems.querySelectorAll('.conversation-item');
            items.forEach(item => {
                const conversationId = item.dataset.id;
                const conversation = conversations.find(c => c.id === conversationId);
                
                if (conversation) {
                    // 更新标题
                    const titleElement = item.querySelector('.conversation-title');
                    if (titleElement) {
                        titleElement.textContent = conversation.title || '新对话';
                    }
                    
                    // 更新时间
                    const timeElement = item.querySelector('.conversation-time');
                    if (timeElement) {
                        timeElement.textContent = this.formatTime(conversation.updatedAt);
                    }
                    
                    // 更新active状态
                    if (conversationId === this.currentConversationId) {
                        item.classList.add('active');
                    } else {
                        item.classList.remove('active');
                    }
                }
            });
            
            // 检查是否有新会话需要添加
            const existingIds = Array.from(items).map(item => item.dataset.id);
            const newConversations = conversations.filter(c => !existingIds.includes(c.id));
            
            // 添加新会话
            newConversations.forEach(conversation => {
                this.addConversationToList(conversation);
            });
            
            // 检查是否有会话需要删除
            const currentIds = conversations.map(c => c.id);
            const itemsToRemove = Array.from(items).filter(item => !currentIds.includes(item.dataset.id));
            
            // 删除不存在的会话
            itemsToRemove.forEach(item => {
                this.conversationItems.removeChild(item);
            });
        } catch (error) {
            console.error('更新会话列表失败:', error);
        }
    }

    toggleSidebar() {
        this.sidebar.classList.toggle('collapsed');
        this.mainContent.classList.toggle('sidebar-collapsed');
        this.overlay.classList.toggle('active');
    }

    handleInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    showInfoPage(message, confirmBtn = "确定", cancelBtn = "取消") {
        return new Promise((resolve) => {
            this.tipPage.style.display = "flex";
            this.modalMessage.innerText = message;
            
            // 激活遮罩层
            this.overlay.classList.add('active');

            // 根据按钮文本决定是否显示按钮
            const showButtons = confirmBtn !== "" || cancelBtn !== "";
            const buttonContainer = this.tipPage.querySelector('.modal-buttons');
            buttonContainer.style.display = showButtons ? 'flex' : 'none';

            if (showButtons) {
                this.confirmBtn.value = confirmBtn;
                this.cancelBtn.value = cancelBtn;

                // 根据是否提供按钮文本来显示/隐藏按钮
                this.confirmBtn.style.display = confirmBtn ? 'block' : 'none';
                this.cancelBtn.style.display = cancelBtn ? 'block' : 'none';
            }

            // 清理函数，用于关闭提示并移除遮罩层
            const cleanup = () => {
                this.tipPage.style.display = "none";
                this.overlay.classList.remove('active');
            };

            const confirmHandler = () => {
                cleanup();
                this.confirmBtn.removeEventListener("click", confirmHandler);
                this.cancelBtn.removeEventListener("click", cancelHandler);
                resolve(true);
            };

            const cancelHandler = () => {
                cleanup();
                this.confirmBtn.removeEventListener("click", confirmHandler);
                this.cancelBtn.removeEventListener("click", cancelHandler);
                resolve(false);
            };

            this.confirmBtn.addEventListener("click", confirmHandler);
            this.cancelBtn.addEventListener("click", cancelHandler);

            // 如果没有按钮文本，3秒后自动关闭
            if (!showButtons) {
                setTimeout(() => {
                    cleanup();
                    resolve(true);
                }, 3000);
            }
        });
    }

    async getAppInfo(apiKey) {
        try {
            // 修改请求路径为正确的API endpoint
            const response = await fetch(`${this.baseUrl}/info`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch app info');
            }
            const data = await response.json();
            return data.name;
        } catch (error) {
            console.error('Error fetching app info:', error);
            // 发生错误时也设置一个默认值
            this.appNameForApiKey.set(apiKey, "未命名应用");
            return {
                name: "未命名应用"
            };
        }
    }

    // 获取所有应用信息
    async getAllApps() {
        const apps = [];
        this.appCount = localStorage.getItem('appCount') || 10;
        for (let i = 1; i <= this.appCount; i++) {
            const apiKey = localStorage.getItem(`apiKey_${i}`);
            const baseUrl = localStorage.getItem(`baseUrl_${i}`);
            if (apiKey && baseUrl) {
                apps.push({
                    name: this.getAppInfo(apiKey) || `应用 ${i}`,
                    apiKey,
                    baseUrl,
                    index: i
                });
            }
        }
        console.log(apps);
        return apps;
    }

    // 选择应用
    async selectApp(app) {
        try {
            this.apiKey = app.apiKey;
            this.baseUrl = app.baseUrl;
            // 不再显示成功提示，避免遮罩层问题
            // this.showInfoPage("应用切换成功")
            this.model_type = true;
        } catch (error) {
            console.error('Error selecting app:', error);
            await this.showInfoPage("切换应用失败，请重试");
        }
    }

    // 创建应用项
    createAppItem(app) {
        const div = document.createElement('div');
        div.className = 'app-item';
        if (app.isMain) {
            div.classList.add('main-app');
        }
        
        div.innerHTML = `
            <div class="app-item-content">
                <div class="app-icon">
                    ${app.isMain ? '<i class="fas fa-star"></i>' : '<i class="fas fa-square"></i>'}
                </div>
                <div class="app-info">
                    <div class="app-name">${app.name || '未命名应用'}</div>
                    <div class="app-url">
                        <i class="fas fa-link"></i> ${app.baseUrl || '默认URL'}
                    </div>
                </div>
                <div class="app-type">
                    <span class="app-badge ${app.isMain ? 'main' : 'sub'}">${app.isMain ? '主应用' : '子应用'}</span>
                </div>
                <div class="app-actions">
                    <button class="select-app-btn">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            </div>
        `;

        // 添加点击事件
        div.addEventListener('click', async () => {
            try {
                // 添加选中效果
                document.querySelectorAll('.app-item').forEach(item => {
                    item.classList.remove('selected');
                });
                div.classList.add('selected');
                
                // 只切换应用，不显示提示
                await this.selectApp(app);
                
                // 不再显示成功提示，避免遮罩层问题
                // await this.showInfoPage("应用切换成功");
            } catch (error) {
                console.error('Error selecting app:', error);
                // 错误时仍然显示提示
                await this.showInfoPage("切换应用失败，请重试");
            }
        });

        // 添加悬停效果
        div.addEventListener('mouseenter', () => {
            div.classList.add('hover');
        });
        div.addEventListener('mouseleave', () => {
            div.classList.remove('hover');
        });

        return div;
    }

    // 显示应用选择器
    async showAppSelector() {
        try {
            // 获取所有应用信息
            const apps = await this.getAllApps();
            
            // 如果没有主应用也没有其他应用，显示提示
            if (!this.apiKey && apps.length === 0) {
                await this.showInfoPage("请先在设置中添加应用");
                return;
            }

            const appList = document.getElementById('appList');
            appList.innerHTML = `
                <div class="app-list-header">
                    <h3><i class="fas fa-th-large"></i> 应用列表</h3>
                    <span class="app-count">${apps.length + 1} 个应用</span>
                </div>
                <div class="app-list-content"></div>
            `;
            
            const appListContent = appList.querySelector('.app-list-content');

            // 添加主应用（如果存在）
            const appName = await this.getAppInfo(this.apiKey);
            if (this.apiKey && this.baseUrl) {
                const mainAppItem = this.createAppItem({
                    name: appName,
                    apiKey: this.apiKey,
                    baseUrl: this.baseUrl,
                    isMain: true
                });
                appListContent.appendChild(mainAppItem);
            }

            // 添加其他应用
            for (const app of apps) {
                const appName = await this.getAppInfo(app.apiKey);
                const appItem = this.createAppItem({
                    name: appName,
                    apiKey: app.apiKey,
                    baseUrl: app.baseUrl,
                    isMain: false
                });
                appListContent.appendChild(appItem);
            }

        } catch (error) {
            console.error('Error showing app selector:', error);
            await this.showInfoPage("加载应用列表失败，请重试");
        }
    }

    showSettingsModal() {
        this.showAppSelector();
        // 检查是否已存在设置模态框，如果存在则先移除
        const existingModal = document.querySelector('.settings-modal');
        if (existingModal) {
            document.body.removeChild(existingModal);
        }
        
        // 创建设置面板
        const settingsModal = document.createElement('div');
        settingsModal.className = 'settings-modal';
        settingsModal.innerHTML = `
            <div class="settings-content">
                <div class="settings-header">
                    <h2>设置</h2>
                    <button class="close-button">&times;</button>
                </div>
                <div class="settings-body">
                    <div class="settings-section">
                        <h3>API设置</h3>
                        <div class="settings-item">
                            <label for="apiKey">API Key</label>
                            <input type="password" id="apiKey" value="${this.apiKey}">
                        </div>
                        <div class="settings-item">
                            <label for="baseUrl">API Base URL</label>
                            <input type="text" id="baseUrl" value="${this.baseUrl}">
                        </div>
                        <div class="settings-item">
                            <label for="model">模型</label>
                            <input type="text" id="model" value="${this.model}">
                        </div>
                        <div class="settings-item">
                            <label for="maxTokens">最大Token数</label>
                            <input type="number" id="maxTokens" value="${this.maxTokens}">
                        </div>
                        <div class="settings-item">
                            <label for="temperature">温度</label>
                            <input type="number" id="temperature" step="0.1" min="0" max="2" value="${this.temperature}">
                        </div>
                        <div class="settings-item">
                            <label for="thinkingRounds">思考轮数</label>
                            <input type="number" id="thinkingRounds" min="1" max="10" value="${this.thinkingRounds}">
                        </div>
                    </div>
                    <div class="settings-section">
                        <h3>界面设置</h3>
                        <div class="settings-item">
                            <label for="themeToggle">深色模式</label>
                            <label class="switch">
                                <input type="checkbox" id="themeToggle" ${localStorage.getItem('theme') === 'dark' ? 'checked' : ''}>
                                <span class="slider round"></span>
                            </label>
                            <span class="theme-tip" style="margin-left: 8px; font-size: 14px; color: #ff0000;">
                                请注意！API Key和Base URL会根据您填写的模型自动适配，如果您填写的是OpenAI格式的模型，就会优先使用Open AI的API Key和Base URL。
                                否则，默认使用Dify的API Key和Base URL。
                            </span>
                        </div>
                    </div>
                    <div id="appList" class="app-list">
                    </div>
                </div>
                <div class="settings-footer">
                    <button class="save-button">保存</button>
                    <button class="cancel-button">取消</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(settingsModal);
        
        // 激活遮罩层
        this.overlay.classList.add('active');
        
        // 添加事件监听
        const closeButton = settingsModal.querySelector('.close-button');
        const saveButton = settingsModal.querySelector('.save-button');
        const cancelButton = settingsModal.querySelector('.cancel-button');
        const themeToggle = settingsModal.querySelector('#themeToggle');
        const settingsContent = settingsModal.querySelector('.settings-content');

        // 清理函数
        const cleanup = () => {
            if (settingsModal && settingsModal.parentNode) {
                document.body.removeChild(settingsModal);
            }
            document.removeEventListener('keydown', handleKeyDown);
            
            // 确保遮罩层被移除
            this.overlay.classList.remove('active');
            
            // 重新启用页面交互
            document.body.style.overflow = 'auto';
        };
        
        // 点击模态框外部区域关闭设置面板
        settingsModal.addEventListener('click', (e) => {
            if (!settingsContent.contains(e.target)) {
                cleanup();
            }
        });
        
        // 按ESC键关闭设置面板
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                cleanup();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        
        closeButton.addEventListener('click', cleanup);
        
        saveButton.addEventListener('click', () => {
            // 保存API设置
            this.apiKey = settingsModal.querySelector('#apiKey').value;
            this.baseUrl = settingsModal.querySelector('#baseUrl').value;
            this.model = settingsModal.querySelector('#model').value;
            this.maxTokens = parseInt(settingsModal.querySelector('#maxTokens').value);
            this.temperature = parseFloat(settingsModal.querySelector('#temperature').value);
            this.thinkingRounds = parseInt(settingsModal.querySelector('#thinkingRounds').value);
            
            // 保存到localStorage
            localStorage.setItem('openai_api_key', this.apiKey);
            localStorage.setItem('openai_base_url', this.baseUrl);
            localStorage.setItem('openai_live', true);
            localStorage.setItem('openai_model', this.model);
            localStorage.setItem('openai_max_tokens', this.maxTokens);
            localStorage.setItem('openai_temperature', this.temperature);
            localStorage.setItem('thinking_rounds', this.thinkingRounds);
            this.model_type = false;
            
            // 保存主题设置
            const theme = themeToggle.checked ? 'dark' : 'light';
            localStorage.setItem('theme', theme);
            this.applyTheme();
            
            cleanup();
        });
        
        cancelButton.addEventListener('click', cleanup);
        
        // 主题切换事件
        themeToggle.addEventListener('change', () => {
            const theme = themeToggle.checked ? 'dark' : 'light';
            localStorage.setItem('theme', theme);
            this.applyTheme();
        });
    }

    // 添加自动调整输入框高度的方法
    autoResizeTextarea(e) {
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
        
        // 限制最大高度
        if (textarea.scrollHeight > 200) {
            textarea.style.overflowY = 'auto';
        } else {
            textarea.style.overflowY = 'hidden';
        }
    }

    // 添加初始化输入框高度的方法
    initTextareaHeight() {
        // 设置初始高度
        this.userInput.style.height = 'auto';
        this.welcomeUserInput.style.height = 'auto';
        
        // 确保输入框有一致的初始高度
        const initialHeight = '47px';
        this.userInput.style.height = initialHeight;
        this.welcomeUserInput.style.height = initialHeight;
    }

    // 应用主题
    applyTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add(`theme-${savedTheme}`);
    }
    
    // 切换主题
    toggleTheme() {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        this.applyTheme();
    }

    // 配置Marked库
    configureMarked() {
        console.log('配置Marked库...');
        
        if (!window.marked) {
            console.error('Marked库未加载!');
            return;
        }
        
        // 配置常量定义
        const MARKED_DEFAULTS = {
            breaks: true,
            gfm: true,
            headerIds: false,
            mangle: false,
            pedantic: false,
            sanitize: false,
            smartLists: true,
            smartypants: false,
            xhtml: false,
            highlight: function(code, lang) {
                if (window.hljs) {
                    try {
                        if (lang && hljs.getLanguage(lang)) {
                            return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
                        } else {
                            return hljs.highlightAuto(code).value;
                        }
                    } catch (e) {
                        console.error('代码高亮失败:', e);
                    }
                }
                return code;
            }
        };

        try {
            // 配置 marked 基础选项
            marked.setOptions(MARKED_DEFAULTS);
            console.log('Marked库配置成功!');
        } catch (error) {
            console.error('Marked配置失败:', error);
            // 使用基本配置
            marked.setOptions({
                breaks: true,
                gfm: true,
                sanitize: false
            });
        }
    }

    // 查找祖先元素
    findAncestor(element, selector) {
        while (element && element.parentElement) {
            element = element.parentElement;
            if (element.matches(selector)) return element;
        }
        return null;
    }
    
    // 创建可折叠代码块
    createCollapsibleCode(code, language) {
        try {
            console.log(`创建代码块: 语言=${language}`);
            
            // 确保代码是字符串
            if (typeof code !== 'string') {
                console.warn('代码不是字符串类型:', typeof code);
                code = String(code);
            }
            
            // 生成唯一ID
            const blockId = 'code-block-' + Math.random().toString(36).substr(2, 9);
            
            return `
                <div style="margin: 15px 0; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background-color: #f5f5f5; border-bottom: 1px solid #ddd;">
                        <span style="font-size: 0.9rem; color: #555;">${language}</span>
                        <div>
                            <button onclick="document.getElementById('${blockId}').style.display = document.getElementById('${blockId}').style.display === 'none' ? 'block' : 'none'; this.textContent = this.textContent === '折叠 ▼' ? '展开 ▶' : '折叠 ▼';" style="background: #e9e9e9; border: none; border-radius: 4px; padding: 4px 8px; margin-right: 8px; cursor: pointer; font-size: 12px;">折叠 ▼</button>
                            <button onclick="navigator.clipboard.writeText(document.getElementById('${blockId}-code').textContent); this.textContent = '已复制 ✓'; setTimeout(() => { this.textContent = '复制 📋'; }, 2000);" style="background: #e9e9e9; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 12px;">复制 📋</button>
                        </div>
                    </div>
                    <div id="${blockId}" style="display: block;">
                        <pre style="margin: 0; padding: 12px; overflow-x: auto; background-color: #f8f8f8;"><code id="${blockId}-code" class="language-${language}">${code}</code></pre>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('创建可折叠代码块失败:', error);
            return `<pre><code>${code}</code></pre>`;
        }
    }
    
    // 初始化代码高亮
    initializeCodeHighlighting() {
        if (window.hljs) {
            // 监听DOM变化，自动应用代码高亮
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        // 查找新添加的代码块
                        const codeBlocks = document.querySelectorAll('pre code:not(.hljs)');
                        if (codeBlocks.length > 0) {
                            console.log(`发现${codeBlocks.length}个未高亮的代码块，应用高亮...`);
                            codeBlocks.forEach(block => {
                                hljs.highlightElement(block);
                            });
                        }
                    }
                });
            });
            
            // 开始观察聊天消息容器
            observer.observe(this.chatMessages, {
                childList: true,
                subtree: true
            });
            
            console.log('代码高亮监听器已初始化');
        } else {
            console.warn('highlight.js未加载，无法初始化代码高亮');
        }
    }
}

// 初始化全局实例
window.onload = () => {
    window.agentChatInstance = new AgentChat();
};