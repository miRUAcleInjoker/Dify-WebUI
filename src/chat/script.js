class ChatApp {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        this.apiKey = '';
        this.baseUrl = '';
        this.fileInput = document.getElementById('fileInput');
        this.uploadButton = document.getElementById('uploadButton');
        this.attachmentPreview = document.getElementById('attachmentPreview');
        this.currentUploadedFile = null;
        this.lastMessageId = null; 
        this.conversationItems = document.getElementById('conversationItems');
        this.currentConversationId = '';
        this.firstMessageId = null;
        this.hasMore = true;
        this.isLoadingHistory = false;
        this.welcomePage = document.getElementById('welcomePage');
        this.chatContainer = document.getElementById('chatContainer');
        this.newChatButton = document.getElementById('newChatButton');
        this.toggleSidebarButton = document.getElementById('toggleSidebarButton');
        this.sidebar = document.querySelector('.sidebar');
        this.menuButton = document.getElementById('menuButton');
        this.overlay = document.getElementById('overlay');
        this.mainContent = document.querySelector('.main-content');
        this.isMobile = window.innerWidth <= 768;
        this.showSidebarButton = document.getElementById('showSidebarButton');
        this.welcomeUserInput = document.getElementById('welcomeUserInput');
        this.welcomeSendButton = document.getElementById('welcomeSendButton');
        this.welcomeUploadButton = document.getElementById('welcomeUploadButton');
        this.welcomeFileInput = document.getElementById('welcomeFileInput');
        this.welcomeAttachmentPreview = document.getElementById('welcomeAttachmentPreview');
        this.initialized = false;
        this.user = 'web-user';
        this.settingsButton = document.getElementById('settingsButton');
        this.settingsPage = document.getElementById('settingsPage');
        this.settingsForm = document.getElementById('settingsForm');
        this.currentTheme = localStorage.getItem('theme') || 'default';
        this.userName = localStorage.getItem('userName') || '未设置用户名';
        this.userAvatar = document.getElementById('userAvatar');
        this.userNameDisplay = document.getElementById('userName');
        this.toggleSettingsStates = null;
        this.toggleVoiceStates = null;
        this.micButton = document.getElementById('micButton');
        this.waveContainer = document.getElementById('waveContainer');
        this.statusText = document.getElementById('statusText');
        this.chatBody = document.getElementById('chatBody');
        this.isRecording = false;
        this.isBotReplying = false;
        this.voiceContainer = document.getElementById('voiceContainer');
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.currentAudioFile = null; 
        this.audioStatus = false;
        this.appName = 'DifyWebUI';
        //弹窗
        this.confirmBtn = document.getElementById("confirmBtn");
        this.cancelBtn = document.getElementById("cancelBtn");
        this.tipPage = document.getElementById("tipPage");
        // 获取消息元素
        this.modalMessage = document.getElementById("modal-message");
        this.loadSettings();
        this.initSettingsHandlers();
        // 配置 marked
        this.initialize();
        this.init();
        this.loadWelcomeMessage();


    }

    showInfoPage(message, confirmBtn = "", cancelBtn = "") {
        return new Promise((resolve) => {
            this.tipPage.style.display = "flex";
            this.modalMessage.innerText = message;
            this.confirmBtn.value = confirmBtn;
            this.cancelBtn.value = cancelBtn;
            const confirmHandler = () => {
                this.tipPage.style.display = "none";
                this.confirmBtn.removeEventListener("click", confirmHandler);
                this.cancelBtn.removeEventListener("click", cancelHandler);
                resolve(true);  // 用户点击确认
            };
    
            const cancelHandler = () => {
                this.tipPage.style.display = "none";
                this.confirmBtn.removeEventListener("click", confirmHandler);
                this.cancelBtn.removeEventListener("click", cancelHandler);
                resolve(false);  // 用户点击取消
            };
            
            this.confirmBtn.addEventListener("click", confirmHandler);
            this.cancelBtn.addEventListener("click", cancelHandler);

            if(cancelBtn == "" && cancelBtn == ""){
                this.confirmBtn.style.display = "none";
                this.cancelBtn.style.display = "none";
                //  倒计时3s后关闭
                setTimeout(() => {
                    this.tipPage.style.display = "none";
                    this.confirmBtn.removeEventListener("click", confirmHandler);
                    this.cancelBtn.removeEventListener("click", cancelHandler);
                    resolve(true);  // 用户点击确认
                }, 3000);
            }
        });
    }

    async startRecording() {
        try {
            this.waveContainer.style.display = 'flex';
            this.chatBody.classList.add('recording');
            this.statusText.textContent = '正在对话...';

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('浏览器不支持对话功能');
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            document.querySelectorAll('.wave').forEach((wave, index) => {
                wave.style.animationDuration = `${2 + Math.random() * 0.5}s`;
                wave.style.animationDelay = `${index * 0.8}s`;
            });
        } catch (error) {
            console.error('对话启动失败:', error);
            this.statusText.textContent = '对话失败: ' + error.message;
            this.isRecording = false;
        }
    }

    async stopRecording() {
        try {
            this.waveContainer.style.display = 'none';
            this.chatBody.classList.remove('recording');
            this.statusText.textContent = '正在处理...';
            return new Promise((resolve) => {
                this.mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                    this.audioChunks = [];
                    const fileName = `recording-${new Date().getTime()}.wav`;
                    this.currentAudioFile = new File([audioBlob], fileName, { type: 'audio/wav' });
                    await this.uploadAudioFile(this.currentAudioFile);
                    this.statusText.textContent = '等待回复';
                    setTimeout(() => {
                        this.statusText.textContent = '点击麦克风开始说话';
                    }, 2000);
                    resolve();
                };

                this.mediaRecorder.stop();
                this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            });
        } catch (error) {
            console.error('停止对话失败:', error);
            this.statusText.textContent = '对话失败: ' + error.message;
        }
    }

    async uploadAudioFile(file) {
        // 创建FormData对象
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user', this.user);
        try {
            const response = await fetch(`${this.baseUrl}/audio-to-text`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: formData
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.userInput.value = data.text;
            this.sendMessage();
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    simulateBotReply() {
        this.isBotReplying = true;
        this.waveContainer.style.display = 'flex';
        this.chatBody.classList.add('bot-replying');
        this.statusText.innerHTML = '正在回复中<div class="typing-dots"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
    }

    updateWaveHeights() {
        if (isRecording) {
            document.querySelectorAll('.wave').forEach(wave => {
                // 每次变化幅度更小，使动画更平滑
                const height = 25 + Math.random() * 30;  // 调整波形高度范围
                wave.style.height = `${height}px`;
            });
        }
        setTimeout(() => requestAnimationFrame(updateWaveHeights), 50);
    }


    initialize() {
        this.configureMarked();
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    document.querySelectorAll('.code-block:not(.initialized)').forEach(block => {
                        const toggleBtn = block.querySelector('.toggle-button');
                        const copyBtn = block.querySelector('.copy-button');
                        if (toggleBtn) {
                            toggleBtn.addEventListener('click', this.toggleCode);
                        }
                        if (copyBtn) {
                            copyBtn.addEventListener('click', this.copyCode);
                        }
                        block.classList.add('initialized');
                    });
                }
            });
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

    }

    toggleVoiceInterface() {
        const show = this.voiceContainer.style.display === 'none';
        if (show) {
            console.log('voice interface');
            this.toggleVoiceStates = {
                welcomePage: this.welcomePage.style.display,
                chatContainer: this.chatContainer.style.display,
            }
            this.voiceContainer.style.display = 'flex';
            this.welcomePage.style.display = 'none';
            this.chatContainer.style.display = 'flex';
            this.audioStatus = true;
            this.welcomePage.style.display = 'none';
        } else {
            console.log('Hiding voice interface');
            this.voiceContainer.style.display = 'none';
            this.welcomePage.style.display = this.toggleVoiceStates.welcomePage;
            this.chatContainer.style.display = this.toggleVoiceStates.chatContainer;
            this.audioStatus = false;
        }
    }

        configureMarked() {
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
                xhtml: false
            };
        
            // 高亮处理函数
            const highlightCode = (code, lang = 'plaintext') => {
                try {
                    const validLang = hljs.getLanguage(lang) ? lang : null;
                    return validLang 
                        ? hljs.highlight(code, { language: validLang, ignoreIllegals: true }).value
                        : hljs.highlightAuto(code).value;
                } catch (error) {
                    console.warn('Code highlighting failed:', error);
                    return hljs.highlightAuto(code).value || code;
                }
            };
        
            try {
                // 配置 marked 基础选项
                marked.setOptions(MARKED_DEFAULTS);
        
                // 自定义渲染器
                const renderer = new marked.Renderer();
                
                // 保留原始代码块处理逻辑
                renderer.code = (code, lang) => {
                    const highlighted = highlightCode(code, lang);
                    const numbered = this.addLineNumbers(highlighted);
                    return this.createCollapsibleCode(numbered, lang);
                };
        
                                const preprocess = (text) => {
                    return text.replace(/<think>([\s\S]*?)<\/think>/g, (match, content) => {
                        if (!content.trim()) return '';
                        const tableContent = content.trim();
                
                        return `
                            <details style="border: 1px solid #ddd; padding: 10px; border-radius: 8px; background-color: #f9f9f9; margin-bottom: 10px;">
                                <summary style="font-size: 1.2em; font-weight: bold; color: #333; cursor: pointer;">
                                    🧠 思考过程
                                </summary>
                                <div style="color: #555; font-style: italic; padding: 10px; background-color: #f4f4f4; border-radius: 5px; line-height: 1.5;">
                                    ${tableContent}
                                </div>
                            </details>
                            <div style="border: 1px solid #ddd; padding: 10px; border-radius: 8px; background-color: #f9f9f9; margin-bottom: 10px;">
                            <span style="font-size: 1.2em; font-weight: bold; color: #333; cursor: pointer;">
                                📌 正式回答
                            </span>
                            <div style="color: #000; padding: 10px; background-color: #f4f4f4; border-radius: 5px; line-height: 1.5;">`.trim();
                                });
                            };
                       
                
                
        
                // 重写 marked 的解析方法
                const originalParse = marked.parse;
                marked.parse = (text, options) => {
                    const preprocessed = preprocess(text);
                    return originalParse.call(marked, preprocessed, {
                        ...options,
                        // 确保不会重复处理已转换的内容
                        sanitize: false,
                        silent: true
                    });
                };
        
                // 应用配置
                marked.use({ renderer });
        
            } catch (error) {
                console.error('Marked configuration failed:', error);
                marked.setOptions({
                    breaks: true,
                    gfm: true,
                    sanitize: true
                });
            }
        }
    addLineNumbers(code) {
        try {
            const lines = code.split('\n');
            return lines.map((line, index) =>
                `<div class="line">
                    <span class="line-number">${index + 1}</span>
                    <span class="line-content">${line}</span>
                 </div>`
            ).join('');
        } catch (error) {
            console.error('Error adding line numbers:', error);
            return code;
        }
    }

    createCollapsibleCode(code, language) {
        try {
            // 创建代码块的 HTML 结构
            const template = ` 
                <div class="code-block collapsible">
                    <div class="code-header">
                        <span class="language-badge">${language || 'plaintext'}</span>
                        <div class="code-actions">
                            <button class="toggle-button">
                                <i class="fas fa-chevron-down"></i>
                            </button>
                            <button class="copy-button">
                                <i class="fas fa-copy"></i> 复制
                            </button>
                        </div>
                    </div>
                    <div class="code-content">
                        <pre><code class="language-${language || 'plaintext'}">${code}</code></pre>
                    </div>
                </div>`;

            // 创建一个函数来初始化事件监听器
            const initializeCodeBlock = () => {
                // 查找所有没有初始化的代码块
                document.querySelectorAll('.code-block:not(.initialized)').forEach(block => {
                    // 添加事件监听器
                    const toggleBtn = block.querySelector('.toggle-button');
                    const copyBtn = block.querySelector('.copy-button');
                    const viewBtn = block.querySelector('.view-button');
                    if (toggleBtn) {
                        toggleBtn.addEventListener('click', this.toggleCode);
                    }
                    if (copyBtn) {
                        copyBtn.addEventListener('click', this.copyCode);
                    }
                    // 标记为已初始化
                    block.classList.add('initialized');
                });
            };
            // 添加到 DOM 后初始化事件监听器
            setTimeout(initializeCodeBlock, 0);
            return template;
        } catch (error) {
            console.error('Error creating collapsible code:', error);
            return code;
        }
    }
    findAncestor(element, selector) {
        while (element && element.parentElement) {
            element = element.parentElement;
            if (element.matches(selector)) return element;
        }
        return null;
    }

    toggleCode(event) {
        try {
            console.log('Toggle button clicked');
            const button = event.currentTarget;
            const codeBlock = button.closest ? button.closest('.code-block') :
                this.findAncestor(button, '.code-block');

            if (!codeBlock) {
                console.error('Code block not found');
                return;
            }
            const content = codeBlock.querySelector('.code-content');
            if (!content) {
                console.error('Code content not found');
                return;
            }
            const isVisible = content.style.display !== 'none';
            content.style.display = isVisible ? 'none' : 'block';

            const icon = button.querySelector('i');
            if (icon) {
                icon.className = isVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
            }
        } catch (error) {
            console.error('Error in toggleCode:', error);
        }
    }

    findParentWithClass(element, className) {
        let current = element;
        while (current && current !== document) {
            if (current.classList && current.classList.contains(className)) {
                return current;
            }
            current = current.parentNode;
        }
        return null;
    }

    copyCode(event) {
        try {
            const button = event.currentTarget;
            const codeBlock = button.closest('.code-block');
            if (!codeBlock) return;

            // 获取所有代码内容元素（排除行号）
            const codeLines = codeBlock.querySelectorAll('.line-content');
            if (!codeLines.length) return;
            // 将所有代码行内容合并，并去除可能的首尾空格
            const codeText = Array.from(codeLines)
                .map(line => line.textContent)
                .join('\n')
                .trim();
            navigator.clipboard.writeText(codeText).then(() => {
                button.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    button.innerHTML = '<i class="fas fa-copy"></i> Copy';
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
                button.innerHTML = '<i class="fas fa-times"></i> Error!';
            });
        } catch (error) {
            console.error('Error in copyCode:', error);
        }
    }

    async init() {
        // 先绑定事件监听器
        this.bindEventListeners();
        // 立即加载历史对话
        await this.loadConversations();
        // 标记初始化完成
        this.initialized = true;
        //检查apikey
        if (!this.apiKey) {
            const apiState = await this.showInfoPage("请输入apikey","确实","取消").then(result => {
                if (result) {
                    this.toggleSettingsPage();
                }else{
                    return;
                }
            });
        } 
    }

    bindEventListeners() {
        // 将原来init中的事件绑定移到这个新方法中
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.uploadButton.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        this.userInput.addEventListener('input', () => this.adjustTextareaHeight(this.userInput));
        this.welcomeUserInput.addEventListener('input', () => this.adjustTextareaHeight(this.welcomeUserInput));

        // 添加新对话按钮事件
        this.newChatButton.addEventListener('click', () => this.startNewChat());

        // 添加侧边栏切换按钮事件
        this.toggleSidebarButton.addEventListener('click', () => this.toggleSidebar());

        // 添加示例建议点击事件
        document.querySelectorAll('.welcome-suggestion-items button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.startNewChat(e.target.textContent.replace(/["]/g, ''));
            });
        });

        // 添加移动端侧边栏控制
        this.menuButton.addEventListener('click', () => this.toggleMobileSidebar());
        this.overlay.addEventListener('click', () => this.toggleMobileSidebar());

        // 添加窗口大小变化监听
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
            this.updateSidebarState();
        });

        // 在移动端点击对话项后自动隐藏侧边栏
        this.conversationItems.addEventListener('click', () => {
            if (this.isMobile) {
                this.toggleMobileSidebar();
            }
        });

        // 添加显示侧边栏按钮事件
        this.showSidebarButton.addEventListener('click', () => this.showSidebar());

        // 欢迎页面输入框事件
        this.welcomeSendButton.addEventListener('click', () => this.sendWelcomeMessage());
        this.welcomeUserInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendWelcomeMessage();
            }
        });
        this.welcomeUploadButton.addEventListener('click', () => this.welcomeFileInput.click());
        this.welcomeFileInput.addEventListener('change', (e) => this.handleWelcomeFileSelect(e));

        const micButtons = document.getElementsByClassName('mic-p-button');
        Array.from(micButtons).forEach(button => {
            button.addEventListener('click', () => {
                this.toggleVoiceInterface();
            });
        });


        this.micButton.addEventListener('click', async () => {
            if (this.isBotReplying) return;
            if (!this.isRecording) {
                await this.startRecording();
                
            } else {
                await this.stopRecording();
                this.simulateBotReply();
                this.isRecording = false;
            }
        });
    }

    adjustTextareaHeight(textarea) {
        textarea.style.height = 'auto'; // 重置高度
        textarea.style.height = `${textarea.scrollHeight}px`; // 根据内容调整高度
    }

    appendMessage(content, isUser = false, parent = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'bot'} new`;

        // 添加头像
        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        if (isUser) {
            setTimeout(() => {
                messageDiv.classList.add('show');
            }, 10);
            avatar.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${this.userName}`;  // 用户默认头像
            messageDiv.setAttribute('data-user', this.userName);
        } else {
            avatar.src = '../../rebot.svg';  // 机器人默认头像
        }
        messageDiv.appendChild(avatar);

        // 创建一个包装器来包含消息内容和建议
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'message-content-wrapper';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        // 处理消息内容
        if (isUser) {
            // 用户消息直接显示
            messageContent.innerHTML = marked.parse(content);
            messageContent.classList.add('show-content');
        } else {
            // 机器人消息需要分割并添加 span
            const p = document.createElement('p');
            if (content) {
                const words = content.split('');
                words.forEach(word => {
                    const span = document.createElement('span');
                    span.textContent = word;
                    p.appendChild(span);
                });
            }
            messageContent.appendChild(p);
            messageContent.innerHTML = marked.parse(messageContent.innerHTML);

            //  逐字显示机器人消息
            this.showContent(messageContent);
            messageContent.addEventListener("mouseenter",()=>{
                console.log("mouseenter")
            })
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }

        contentWrapper.appendChild(messageContent);

        // 为机器人消息添加建议容器
        if (!isUser) {
            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'suggestions-container';
            contentWrapper.appendChild(suggestionsContainer);
        }

        messageDiv.appendChild(contentWrapper);

        if (parent) {
            parent.appendChild(messageDiv);
        } else {
            this.chatMessages.appendChild(messageDiv);
            this.scrollToBottom();
        }

        setTimeout(() => {
            messageDiv.classList.remove('new');
        }, 500);

        setTimeout(() => {
            messageDiv.classList.add('show');
        }, 10);

        return messageDiv;
    }

    showContent(messageContent) {
        const spans = messageContent.querySelectorAll('p span');
        let delay = 0;
        spans.forEach((span) => {
            setTimeout(() => {
                span.style.opacity = 1;
            }, delay);
            delay += 20; // 调整延迟时间，控制文字出现速度
        });
        // 所有文字显示完毕，添加 show-content class
        setTimeout(() => {
            messageContent.classList.add('show-content');
        }, delay);
    }

    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('user', this.user);

            const response = await fetch(`${this.baseUrl}/files/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: formData
            });

            const result = await response.json();
            if (result.id) {
                this.currentUploadedFile = {
                    id: result.id,
                    name: result.name
                };
                this.showPreview(file);
            }
        } catch (error) {
            console.error('上传文件失败:', error);
            this.showInfoPage("文件上传失败，请重试!")
                .then(userConfirmed => {
                    if (userConfirmed) {
                        console.log("用户确认了操作");
                    } else {
                        console.log("用户取消了操作");
                    }
                })
        }
    }

    showPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.attachmentPreview.innerHTML = `
                <div class="preview-image">
                    <img src="${e.target.result}" alt="预览">
                    <button class="remove-button" onclick="chatApp.removeAttachment()">×</button>
                </div>
            `;
            this.attachmentPreview.style.display = 'block'; // 显示预览
        };
        reader.readAsDataURL(file);
    }

    removeAttachment() {
        this.attachmentPreview.innerHTML = '';
        this.attachmentPreview.style.display = 'none'; // 隐藏预览
        this.currentUploadedFile = null;
        this.fileInput.value = '';
    }

    async loadSuggestions(messageDiv) {
        if (!this.lastMessageId) return;

        try {
            const response = await fetch(
                `${this.baseUrl}/messages/${this.lastMessageId}/suggested?user=${this.user}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const data = await response.json();
            if (data.result === 'success' && data.data) {
                const suggestionsContainer = messageDiv.querySelector('.suggestions-container');
                suggestionsContainer.innerHTML = ''; // 清除现有建议

                data.data.forEach(suggestion => {
                    const btn = document.createElement('button');
                    btn.className = 'suggestion-item';
                    btn.textContent = suggestion;
                    btn.addEventListener('click', () => {
                        this.userInput.value = suggestion;
                        this.sendMessage();
                    });
                    suggestionsContainer.appendChild(btn);
                });
                // 滚动到建议列表可见
                messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } catch (error) {
            console.error('获取建议失败:', error);
        }
    }
    clearAllSuggestions() {
        const allSuggestions = document.querySelectorAll('.suggestions-container');
        allSuggestions.forEach(container => {
            container.innerHTML = '';
        });
    }

    scrollToBottom() {
        const scrollOptions = {
            top: this.chatMessages.scrollHeight,
            behavior: 'smooth'
        };
        this.chatMessages.scrollTo(scrollOptions);
    }

    async sendMessage() {
        // 隐藏欢迎页面，显示聊天界面
        this.welcomePage.style.display = 'none';
        this.chatContainer.style.display = 'flex';
        if (!this.initialized) return;
        // 清除所有现有建议
        this.clearAllSuggestions();
        let message = this.userInput.value.trim();
        if (!message && !this.currentUploadedFile) return;
        // 显示用户消息
        this.appendMessage(message, true);
        this.userInput.value = '';
        this.userInput.style.height = 'auto'; // 发送消息后重置高度
        this.welcomeUserInput.style.height = 'auto'; // 发送消息后重置高度
        this.removeAttachment(); // 发送消息后移除附件预览
        if (this.audioStatus) {
            message = `你好GPT，我正在进行语音对话。请以友善的态度简要回答我的问题，并保持回答精炼。
                        以下是我的问题：${message}`;
        }
        const sendData = {
            query: message,
            response_mode: 'streaming',
            conversation_id: this.currentConversationId,
            user: this.user,
            inputs: {}
        };
        // 如果有附件，添加到发送数据中
        if (this.currentUploadedFile) {
            sendData.files = [{
                type: 'image',
                transfer_method: 'local_file',
                upload_file_id: this.currentUploadedFile.id
            }];
            this.removeAttachment();
        }
        // 创建机器人响应的消息容器
        const botMessageDiv = this.appendMessage('', false);
        // 添加加载状态，但保持位置固定
        botMessageDiv.classList.add('loading');
        botMessageDiv.style.alignSelf = 'flex-start';
        let fullResponse = '';

        try {
            const response = await fetch(`${this.baseUrl}/chat-messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sendData)
            });
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let messageFiles = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    // 移除加载状态，保持位置
                    botMessageDiv.classList.remove('loading');
                    const finalContent = marked.parse(fullResponse);
                    botMessageDiv.querySelector('.message-content').innerHTML = finalContent;
                    await this.loadSuggestions(botMessageDiv);
                    break;
                }
                botMessageDiv.classList.add('show');
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            switch (data.event) {
                                case 'message':
                                    fullResponse += data.answer;
                                    const formattedContent = marked.parse(fullResponse);
                                    botMessageDiv.querySelector('.message-content').innerHTML = formattedContent;
                                    this.lastMessageId = data.message_id;
                                    this.currentConversationId = data.conversation_id;
                                    this.scrollToBottom();
                                    break;
        
                                case 'agent_thought':
                                    if (data.thought) {
                                        thought = data.thought;
                                    }
                                    if (data.tool && data.tool_input) {
                                        const toolContent = `\n\n**Using ${data.tool}:**\n\`\`\`json\n${data.tool_input}\n\`\`\`\n\n`;
                                        fullResponse += toolContent;
                                    }
                                    if (data.observation) {
                                        fullResponse += `\n\n**Observation:** ${data.observation}\n\n`;
                                    }
                                    if (data.message_files) {
                                        messageFiles = messageFiles.concat(data.message_files);
                                    }
                                    break;
        
                                case 'message_file':
                                    if (data.type === 'image') {
                                        const imageHtml = `\n\n![Generated Image](${data.url})\n\n`;
                                        fullResponse += imageHtml;
                                    }
                                    break;
        
                                case 'tts_message':
                                    if (data.audio) {
                                        // 处理文本转语音
                                        this.playAudio(data.audio);
                                    }
                                    break;
                                case 'message_end':
                                     // 移除加载状态，保持位置
                                    console.log('message_end');
                                    botMessageDiv.classList.remove('loading');
                                    const finalContent = marked.parse(fullResponse);
                                    botMessageDiv.querySelector('.message-content').innerHTML = finalContent;
                                    await this.loadSuggestions(botMessageDiv);
                                    break;
                            }
                            // 更新消息内容
                            const formattedContent = marked.parse(fullResponse);
                            botMessageDiv.querySelector('.message-content').innerHTML = formattedContent;
                            this.scrollToBottom();
                        } catch (e) {
                            console.error('解析响应数据失败:', e);
                            continue;
                        }
                    }
                }
            }
        } catch (error) {
            botMessageDiv.classList.remove('loading');
            console.error('发送消息失败:', error);
            botMessageDiv.querySelector('.message-content').textContent = '抱歉，发生了错误。请稍后重试。';
        }        
        if(this.audioStatus){
            this.textToAudio(this.lastMessageId);
        }
        await this.loadConversations();
        // 在消息发送时隐藏欢迎页面
        this.welcomePage.style.display = 'none';
        this.chatContainer.style.display = 'flex';
    }

    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    async getAppInfo(){
        const response = await fetch(
            `${this.baseUrl}/info?user=${this.user}`,
            {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        const data = await response.json();
        console.log(data.name);
        if (data) {
            this.appName = data.name;
        }
    }

    async loadConversations() {
        try {
            // 显示加载状态
            this.conversationItems.innerHTML = '<div class="loading">加载中...</div>';
            const response = await fetch(
                `${this.baseUrl}/conversations?user=${this.user}&limit=20`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            const data = await response.json();
            // 清除加载状态
            this.conversationItems.innerHTML = '';
            if (data.data && data.data.length > 0) {
                this.renderConversations(data.data);
                this.hasMore = data.has_more;
            } else {
                // 没有历史对话时显示提示
                this.conversationItems.innerHTML = '<div class="no-conversations">暂无历史对话</div>';
            }
        } catch (error) {
            console.error('加载对话列表失败:', error);
            this.conversationItems.innerHTML = '<div class="error">加载失败，请刷新重试</div>';
        }
    }

    renderConversations(messages) {
        messages.sort((a, b) => b.created_at - a.created_at);
        this.conversationItems.innerHTML = ''; // 清除现有列表
        messages.forEach(message => {
            const item = document.createElement('div');
            item.className = 'conversation-item';
            item.dataset.conversationId = message.id;
            const time = new Date(message.created_at * 1000).toLocaleString();
            item.innerHTML = `
                <div class="conversation-content">
                    <div>${message.name}</div>
                    <div class="time">${time}</div>
                </div>
                <button class="delete-btn" title="删除会话">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            // 给删除按钮添加事件监听
            const deleteBtn = item.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                this.deleteConversation(message.id);
            });
            // 给会话项添加点击事件
            item.querySelector('.conversation-content').addEventListener('click', () => {
                this.switchConversation(message.id);
            });
            if (message.id === this.currentConversationId) {
                item.classList.add('active');
            }
            this.conversationItems.appendChild(item);
        });
    }

    async deleteConversation(conversationId) {
        if (!confirm('确定要删除这个会话吗？')) return;
        try {
            const response = await fetch(
                `${this.baseUrl}/conversations/${conversationId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ user: this.user })
                }
            );
            const data = await response.json();
            if (data.result === 'success') {
                // 如果删除的是当前会话，重置状态并显示欢迎页面
                if (conversationId === this.currentConversationId) {
                    this.currentConversationId = '';
                    this.firstMessageId = null;
                    this.lastMessageId = null;
                    this.chatMessages.innerHTML = '';
                    this.welcomePage.style.display = 'flex';
                    this.chatContainer.style.display = 'none';
                }
                // 重新加载会话列表
                await this.loadConversations();
            }
        } catch (error) {
            console.error('删除会话失败:', error);
            const userConfirmed = await this.showInfoPage('删除会话失败，请重试')
            
        }
    }

    async audioToText(file) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('user', this.user);
            const response = await fetch(`${this.baseUrl}/audio-to-text`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: formData
            });
            const result = await response.json();
            if (result.result === 'success') {
                this.userInput.value = result.text;
                this.sendMessage();
            } else {
                throw new Error('Audio to text conversion failed');
            }
        } catch (error) {
            console.error('音频转文字失败:', error);
            throw error;
        }
    }

    async textToAudio(messageId) {
        try {
            const requestBody = {
                user: this.user, 
                message_id: messageId
            };
            const response = await fetch(
                `${this.baseUrl}/text-to-audio`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            // 创建 MediaSource 实例
            const mediaSource = new MediaSource();
            const audio = new Audio();
            audio.src = URL.createObjectURL(mediaSource);

            mediaSource.addEventListener('sourceopen', async () => {
                // 创建 SourceBuffer
                const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
                const reader = response.body.getReader();
                // 读取流数据
                while (true) {
                    const {done, value} = await reader.read();
                    if (done) break;
                    // 等待前一个数据添加完成
                    if (sourceBuffer.updating) {
                        await new Promise(resolve => {
                            sourceBuffer.addEventListener('updateend', resolve, {once: true});
                        });
                    }
                    // 添加新的音频数据
                    sourceBuffer.appendBuffer(value);
                }
                mediaSource.endOfStream();
            });
            // 播放音频
            await audio.play();
            //回复完成
            this.waveContainer.style.display = 'none';
            this.chatBody.classList.remove('bot-replying');
            this.statusText.textContent = '点击麦克风开始对话';
            this.isBotReplying = false;
        } catch (error) {
            console.error('文字转语音失败:', error);
        }
    }

    playAudio(audioData) {
        try {
            // 如果是ArrayBuffer直接创建blob
            if(audioData instanceof ArrayBuffer) {
                const blob = new Blob([audioData], {type: 'audio/mpeg'});
                const audio = new Audio(URL.createObjectURL(blob));
                return audio.play();
            }
            
            // 保留base64处理逻辑作为备用
            const base64String = this.arrayBufferToBase64(audioData);
            const audio = new Audio();
            audio.src = `data:audio/mpeg;base64,${base64String}`;
            audio.addEventListener('error', (e) => {
                console.error('音频加载失败:', e.target.error);
            });
            return audio.play().catch((error) => {
                console.error('播放音频失败:', error);
                audio.src = `data:audio/wav;base64,${base64String}`;
                return audio.play();
            });
        } catch (error) {
            console.error('音频初始化失败:', error);
        }
    }

    async switchConversation(conversationId) {
        if (conversationId === this.currentConversationId) return;

        this.currentConversationId = conversationId;
        this.firstMessageId = null;
        this.hasMore = true;
        this.chatMessages.innerHTML = '';
        await this.loadMoreMessages();

        // 更新选中状态
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.conversationId === conversationId) {
                item.classList.add('active');
            }
        });

        // 确保切换到聊天界面
        this.welcomePage.style.display = 'none';
        this.chatContainer.style.display = 'flex';
    }

    async loadWelcomeMessage(){
        await this.getAppInfo();
        const welcomeMessage = document.getElementsByTagName('h1')[0];
        welcomeMessage.innerText = '';
        this.typeWriter(`Hi, ${this.userName}, I'm ${this.appName}. How can I help you?`,welcomeMessage);
        
    }

    async loadMoreMessages() {
        if (this.isLoadingHistory) return;
        this.isLoadingHistory = true;

        try {
            const url = new URL(`${this.baseUrl}/messages`);
            const params = {
                user: this.user,
                conversation_id: this.currentConversationId,
                limit: '100'
            };
            if (this.firstMessageId) {
                params.first_id = this.firstMessageId;
            }
            url.search = new URLSearchParams(params).toString();

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            this.hasMore = data.has_more;

            if (data.data.length > 0) {
                this.firstMessageId = data.data[0].id;
                this.renderHistoryMessages(data.data);
                this.scrollToBottom();
            }
        } catch (error) {
            console.error('加载历史消息失败:', error);
        } finally {
            this.isLoadingHistory = false;
        }
    }

    renderHistoryMessages(messages) {
        const fragment = document.createDocumentFragment();
        messages.forEach(message => {
            // 创建AI响应消息并使用 Markdown 渲染
            if (message.answer) {
                const userMessageDiv = this.appendMessage('', true);
                userMessageDiv.querySelector('.message-content').innerHTML = marked.parse(message.query);
                const botMessageDiv = this.appendMessage('', false);
                botMessageDiv.querySelector('.message-content').innerHTML = marked.parse(message.answer);
            }
        });

        // 在现有消息前插入历史消息
        this.chatMessages.insertBefore(fragment, this.chatMessages.firstChild);
    }

    async startNewChat(initialMessage = '') {
        this.currentConversationId = '';
        this.firstMessageId = null;
        this.lastMessageId = null;
        this.chatMessages.innerHTML = '';

        this.welcomePage.style.display = 'flex';
        this.chatContainer.style.display = 'none';
        this.loadWelcomeMessage();

        // 异步执行 loadConversations
        if (initialMessage) {
            this.userInput.value = initialMessage;
            await this.sendMessage(); // 等待消息发送完成
            this.loadConversations(); // 异步加载会话列表
        } else {
            this.loadConversations(); // 直接异步加载会话列表
        }
    }

    toggleMobileSidebar() {
        this.sidebar.classList.toggle('mobile-visible');
        this.overlay.classList.toggle('visible');
    }

    toggleSidebar() {
        if (this.isMobile) {
            this.toggleMobileSidebar();
        } else {
            this.sidebar.classList.toggle('collapsed');
            this.mainContent.classList.toggle('sidebar-collapsed');
            this.showSidebarButton.classList.toggle('visible');
        }
    }

    showSidebar() {
        this.sidebar.classList.remove('collapsed');
        this.mainContent.classList.remove('sidebar-collapsed');
        this.showSidebarButton.classList.remove('visible');
    }

    updateSidebarState() {
        if (!this.isMobile) {
            this.sidebar.classList.remove('mobile-visible');
            this.overlay.classList.remove('visible');
        }
    }

    sendWelcomeMessage() {
        const message = this.welcomeUserInput.value.trim();
        if (!message && !this.currentUploadedFile) return;
        this.welcomeUserInput.value = '';
        this.startNewChat();
        this.userInput.value = message;
        this.sendMessage();
    }

    handleWelcomeFileSelect(event) {
        // 复用现有的文件处理逻辑
        this.handleFileSelect(event);
        // 更新预览容器
        this.attachmentPreview = this.welcomeAttachmentPreview;
    }

    loadSettings() {
        // 从 localStorage 加载配置，如果没有则使用默认值
        this.apiKey = localStorage.getItem('apiKey') || '';
        this.baseUrl = localStorage.getItem('baseUrl') || 'https://api.dify.ai';
        this.user = localStorage.getItem('userId') || '';
        document.getElementById('userNameInput').value = this.userName;
        this.applyTheme(this.currentTheme);
        this.updateUserInfo();

        // 更新表单值
        document.getElementById('apiKey').value = this.apiKey;
        document.getElementById('baseUrl').value = this.baseUrl;
        document.getElementById('userId').value = this.user;

        // 确保主题选择器正确显示当前主题
        const savedTheme = localStorage.getItem('theme') || 'default';
        this.applyTheme(savedTheme);
    }

    initSettingsHandlers() {
        // 设置按钮点击事件
        this.settingsButton.addEventListener('click', () => {
            this.toggleSettingsPage();
        });

        // 设置表单提交事件
        this.settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
            this.loadConversations();
        });

        // 添加主题选择器事件监听
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.target.dataset.theme;
                document.querySelectorAll('.theme-option').forEach(opt => {
                    opt.classList.remove('active');
                });
                e.target.classList.add('active');
                this.applyTheme(theme);
            });
        });

        // 更新主题选择器事件监听
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const theme = e.target.dataset.theme;
                this.applyTheme(theme);
            });
        });
    }

    applyTheme(theme) {
        const root = document.documentElement;
        const themeColors = {
            default: 'var(--theme-color-default)',
            blue: 'var(--theme-color-blue)',
            purple: 'var(--theme-color-purple)',
            red: 'var(--theme-color-red)',
            orange: 'var(--theme-color-orange)',
            green: 'var(--theme-color-green)',
            pink: 'var(--theme-color-pink)',
            yellow: 'var(--theme-color-yellow)',
            indigo: 'var(--theme-color-indigo)',
            cyan: 'var(--theme-color-cyan)',
            sky: 'var(--theme-color-sky)',
            lime: 'var(--theme-color-lime)',
            amber: 'var(--theme-color-amber)',
            emerald: 'var(--theme-color-emerald)',
            rose: 'var(--theme-color-rose)',
            fuchsia: 'var(--theme-color-fuchsia)'
        };

        root.style.setProperty('--primary-color', themeColors[theme]);

        // 更新主题选择器的激活状态
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === theme);
        });

        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
    }

    updateUserInfo() {
        this.userNameDisplay.textContent = this.userName;
        this.userAvatar.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${this.userName}`;
    }

    async saveSettings() {
        const userConfirmed = this.showInfoPage("设置已保存")
        const newUserName = document.getElementById('userNameInput').value.trim();

        if (newUserName) {
            this.userName = newUserName;
            localStorage.setItem('userName', newUserName);
            this.updateUserInfo();
        }

        // 保存主题设置
        localStorage.setItem('theme', this.currentTheme);

        const newApiKey = document.getElementById('apiKey').value.trim();
        const newBaseUrl = document.getElementById('baseUrl').value.trim();
        const newUserId = document.getElementById('userId').value.trim();

        if (!newApiKey || !newBaseUrl || !newUserId) {
            const userConfirmed = await this.showInfoPage("所有字段都必须填写")
            return;
        }

        // 保存到 localStorage
        localStorage.setItem('apiKey', newApiKey);
        localStorage.setItem('baseUrl', newBaseUrl);
        localStorage.setItem('userId', newUserId);

        // 更新实例变量
        this.apiKey = newApiKey;
        this.baseUrl = newBaseUrl;
        this.user = newUserId;

        this.settingsPage.style.display = 'none';
        if (this.toggleSettingsStates) {
            if (this.toggleSettingsStates.chatContainer.wasVisible) {
                this.chatContainer.style.display = 'flex';
            } else {
                this.welcomePage.style.display = 'flex';
            }
        } else {
            this.welcomePage.style.display = 'flex';
        }
        this.settingsPage.style.display = 'none';
    }

    typeWriter(text, element, speed = 50) {
        let i = 0;
        function type() {
          if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
          }
        }
        type();
      }

    toggleSettingsPage() {
        // 获取当前显示状态
        const isSettingsVisible = this.settingsPage.style.display === 'flex';
        if (!isSettingsVisible) {
            // 保存当前状态
            this.toggleSettingsStates = {
                chatContainer: {
                    display: this.chatContainer.style.display,
                    wasVisible: this.chatContainer.style.display === 'flex'
                },
                welcomePage: {
                    display: this.welcomePage.style.display,
                    wasVisible: this.welcomePage.style.display === 'flex'
                }
            };
            // 隐藏其他页面
            this.chatContainer.style.display = 'none';
            this.welcomePage.style.display = 'none';
            // 显示设置页面
            this.settingsPage.style.display = 'flex';
            // 加载设置
            this.loadSettings();
            // 更新主题选择器的激活状态
            document.querySelectorAll('.theme-option').forEach(option => {
                option.classList.toggle('active', option.dataset.theme === this.currentTheme);
            });
        } else {
            // 隐藏设置页面
            this.settingsPage.style.display = 'none';
            // 恢复之前的状态
            if (this.toggleSettingsStates) {
                if (this.toggleSettingsStates.chatContainer.wasVisible) {
                    this.chatContainer.style.display = 'flex';
                } else {
                    this.welcomePage.style.display = 'flex';
                }
            }
        }
    }
}

let chatApp;
document.addEventListener('DOMContentLoaded', () => {
    chatApp = new ChatApp();
});

