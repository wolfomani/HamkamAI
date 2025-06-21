class HamkamAI {
  constructor() {
    this.currentModel = "gpt-4-turbo"
    this.messages = []
    this.isTyping = false
    this.chatHistory = JSON.parse(localStorage.getItem("hamkamai_history") || "[]")
    this.currentChatId = null
    this.settings = {
      temperature: 0.7,
      maxTokens: 2000,
      conversationMode: "balanced",
    }

    this.init()
  }

  init() {
    this.bindEvents()
    this.loadChatHistory()
    this.setupModelSelector()
    this.setupSettings()
    this.autoResizeTextarea()
  }

  bindEvents() {
    // Send message events
    document.getElementById("sendButton").addEventListener("click", () => this.sendMessage())
    document.getElementById("messageInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        this.sendMessage()
      }
    })

    // Input events
    document.getElementById("messageInput").addEventListener("input", (e) => {
      this.updateCharCount()
      this.toggleSendButton()
    })

    // Sidebar events
    document.getElementById("sidebarToggle").addEventListener("click", () => this.toggleSidebar())
    document.getElementById("newChatBtn").addEventListener("click", () => this.newChat())

    // Model selector
    document.getElementById("modelSelect").addEventListener("change", (e) => {
      this.currentModel = e.target.value
      this.updateModelDisplay()
    })

    // Action buttons
    document.getElementById("clearChat").addEventListener("click", () => this.clearChat())
    document.getElementById("exportChat").addEventListener("click", () => this.exportChat())
    document.getElementById("settingsBtn").addEventListener("click", () => this.openSettings())

    // Settings modal
    document.getElementById("closeSettings").addEventListener("click", () => this.closeSettings())
    document.getElementById("settingsModal").addEventListener("click", (e) => {
      if (e.target.id === "settingsModal") this.closeSettings()
    })

    // Settings controls
    document.getElementById("temperatureSlider").addEventListener("input", (e) => {
      this.settings.temperature = Number.parseFloat(e.target.value)
      document.getElementById("temperatureValue").textContent = e.target.value
    })

    document.getElementById("maxTokensSlider").addEventListener("input", (e) => {
      this.settings.maxTokens = Number.parseInt(e.target.value)
      document.getElementById("maxTokensValue").textContent = e.target.value
    })

    document.getElementById("conversationMode").addEventListener("change", (e) => {
      this.settings.conversationMode = e.target.value
    })
  }

  async sendMessage() {
    const input = document.getElementById("messageInput")
    const message = input.value.trim()

    if (!message || this.isTyping) return

    // Add user message
    this.addMessage("user", message)
    input.value = ""
    this.updateCharCount()
    this.toggleSendButton()

    // Show typing indicator
    this.showTyping()

    try {
      const response = await this.callAPI(message)
      this.hideTyping()
      this.addMessage("assistant", response)
      this.saveChatHistory()
    } catch (error) {
      this.hideTyping()
      this.addMessage("assistant", "عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.")
      console.error("API Error:", error)
    }
  }

  async callAPI(message) {
    const apiEndpoints = {
      "gpt-4-turbo": "/api/openai",
      "claude-3-sonnet": "/api/anthropic",
      "gemini-pro": "/api/google",
      "llama-3-70b": "/api/together",
      "mistral-large": "/api/mistral",
      "grok-beta": "/api/xai",
    }

    const endpoint = apiEndpoints[this.currentModel] || "/api/together"

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
        messages: this.messages.slice(-10), // آخر 10 رسائل للسياق
        model: this.currentModel,
        settings: this.settings,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Handle streaming response
    if (response.headers.get("content-type")?.includes("text/event-stream")) {
      return await this.handleStreamingResponse(response)
    } else {
      const data = await response.json()
      return data.response || data.message || "لم أتمكن من الحصول على رد مناسب."
    }
  }

  async handleStreamingResponse(response) {
    const reader = response.body.getReader()
    let accumulatedResponse = ""

    // Add empty assistant message for streaming
    const messageElement = this.addMessage("assistant", "", true)
    const contentElement = messageElement.querySelector(".message-text")

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split("\n").filter((line) => line.trim())

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content || parsed.content
              if (content) {
                accumulatedResponse += content
                contentElement.textContent = accumulatedResponse
                this.scrollToBottom()
              }
            } catch (e) {
              console.error("Error parsing streaming data:", e)
            }
          }
        }
      }
    } catch (error) {
      console.error("Streaming error:", error)
      contentElement.textContent = "حدث خطأ أثناء استقبال الرد."
    }

    return accumulatedResponse
  }

  addMessage(role, content, isStreaming = false) {
    const messagesContainer = document.getElementById("chatMessages")
    const messageId = Date.now().toString()

    const messageElement = document.createElement("div")
    messageElement.className = `message ${role}`
    messageElement.dataset.messageId = messageId

    const avatar = role === "user" ? "👤" : "🧠"
    const time = new Date().toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    })

    messageElement.innerHTML = `
            <div class="${role === "user" ? "user-avatar" : "ai-avatar"}">${avatar}</div>
            <div class="message-bubble">
                <div class="message-text">${content}</div>
                <div class="message-time">${time}</div>
                ${
                  role === "assistant"
                    ? `
                    <div class="message-actions">
                        <button class="action-btn copy-btn" title="نسخ">📋</button>
                        <button class="action-btn like-btn" title="إعجاب">👍</button>
                        <button class="action-btn dislike-btn" title="عدم إعجاب">👎</button>
                    </div>
                `
                    : ""
                }
            </div>
        `

    // Remove welcome message if exists
    const welcomeMessage = messagesContainer.querySelector(".welcome-message")
    if (welcomeMessage) {
      welcomeMessage.remove()
    }

    messagesContainer.appendChild(messageElement)

    // Add message to history
    if (!isStreaming) {
      this.messages.push({
        id: messageId,
        role: role,
        content: content,
        timestamp: new Date().toISOString(),
      })
    }

    // Bind action events
    if (role === "assistant") {
      this.bindMessageActions(messageElement)
    }

    this.scrollToBottom()
    return messageElement
  }

  bindMessageActions(messageElement) {
    const copyBtn = messageElement.querySelector(".copy-btn")
    const likeBtn = messageElement.querySelector(".like-btn")
    const dislikeBtn = messageElement.querySelector(".dislike-btn")

    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const text = messageElement.querySelector(".message-text").textContent
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = "✅"
          setTimeout(() => (copyBtn.textContent = "📋"), 2000)
        })
      })
    }

    if (likeBtn) {
      likeBtn.addEventListener("click", () => {
        likeBtn.classList.toggle("active")
        dislikeBtn.classList.remove("active")
      })
    }

    if (dislikeBtn) {
      dislikeBtn.addEventListener("click", () => {
        dislikeBtn.classList.toggle("active")
        likeBtn.classList.remove("active")
      })
    }
  }

  showTyping() {
    this.isTyping = true
    document.getElementById("typingIndicator").style.display = "flex"
    document.getElementById("sendButton").disabled = true
  }

  hideTyping() {
    this.isTyping = false
    document.getElementById("typingIndicator").style.display = "none"
    document.getElementById("sendButton").disabled = false
    this.toggleSendButton()
  }

  updateCharCount() {
    const input = document.getElementById("messageInput")
    const charCount = document.getElementById("charCount")
    charCount.textContent = input.value.length
  }

  toggleSendButton() {
    const input = document.getElementById("messageInput")
    const sendButton = document.getElementById("sendButton")
    sendButton.disabled = !input.value.trim() || this.isTyping
  }

  updateModelDisplay() {
    const modelName = this.getModelDisplayName(this.currentModel)
    document.getElementById("currentModel").textContent = modelName
    document.getElementById("currentModelFooter").textContent = modelName
  }

  getModelDisplayName(modelId) {
    const modelNames = {
      "gpt-4-turbo": "GPT-4 Turbo",
      "claude-3-sonnet": "Claude 3.5 Sonnet",
      "gemini-pro": "Gemini Pro",
      "llama-3-70b": "Llama 3 70B",
      "mistral-large": "Mistral Large",
      "grok-beta": "Grok Beta",
    }
    return modelNames[modelId] || modelId
  }

  newChat() {
    this.messages = []
    this.currentChatId = null
    document.getElementById("chatMessages").innerHTML = `
            <div class="welcome-message">
                <div class="ai-avatar">🧠</div>
                <div class="message-content">
                    <h2>مرحباً بك في HamkamAI! 👋</h2>
                    <p>أنا مساعدك الذكي المتقدم. يمكنني مساعدتك في:</p>
                    <ul>
                        <li>🤔 الإجابة على الأسئلة المعقدة</li>
                        <li>✍️ الكتابة والتحرير</li>
                        <li>💡 العصف الذهني والإبداع</li>
                        <li>📊 تحليل البيانات</li>
                        <li>🔍 البحث والتلخيص</li>
                        <li>💻 البرمجة والتطوير</li>
                    </ul>
                    <p>ما الذي تود مناقشته اليوم؟</p>
                </div>
            </div>
        `
  }

  clearChat() {
    if (confirm("هل أنت متأكد من مسح المحادثة الحالية؟")) {
      this.newChat()
    }
  }

  exportChat() {
    if (this.messages.length === 0) {
      alert("لا توجد رسائل للتصدير")
      return
    }

    const chatData = {
      timestamp: new Date().toISOString(),
      model: this.currentModel,
      messages: this.messages,
    }

    const blob = new Blob([JSON.stringify(chatData, null, 2)], {
      type: "application/json",
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `hamkamai-chat-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  saveChatHistory() {
    if (this.messages.length === 0) return

    const chatTitle = this.messages[0]?.content?.substring(0, 50) + "..." || "محادثة جديدة"
    const chatData = {
      id: this.currentChatId || Date.now().toString(),
      title: chatTitle,
      timestamp: new Date().toISOString(),
      model: this.currentModel,
      messages: this.messages,
    }

    if (!this.currentChatId) {
      this.currentChatId = chatData.id
      this.chatHistory.unshift(chatData)
    } else {
      const index = this.chatHistory.findIndex((chat) => chat.id === this.currentChatId)
      if (index !== -1) {
        this.chatHistory[index] = chatData
      }
    }

    // Keep only last 50 chats
    this.chatHistory = this.chatHistory.slice(0, 50)
    localStorage.setItem("hamkamai_history", JSON.stringify(this.chatHistory))
    this.loadChatHistory()
  }

  loadChatHistory() {
    const historyList = document.getElementById("historyList")
    historyList.innerHTML = ""

    if (this.chatHistory.length === 0) {
      historyList.innerHTML = '<p class="no-history">لا توجد محادثات سابقة</p>'
      return
    }

    this.chatHistory.forEach((chat) => {
      const historyItem = document.createElement("div")
      historyItem.className = "history-item"
      if (chat.id === this.currentChatId) {
        historyItem.classList.add("active")
      }

      const date = new Date(chat.timestamp).toLocaleDateString("ar-SA")
      historyItem.innerHTML = `
                <div class="history-title">${chat.title}</div>
                <div class="history-time">${date}</div>
            `

      historyItem.addEventListener("click", () => this.loadChat(chat))
      historyList.appendChild(historyItem)
    })
  }

  loadChat(chatData) {
    this.currentChatId = chatData.id
    this.messages = chatData.messages || []
    this.currentModel = chatData.model || "gpt-4-turbo"

    // Update UI
    document.getElementById("modelSelect").value = this.currentModel
    this.updateModelDisplay()

    // Clear and reload messages
    const messagesContainer = document.getElementById("chatMessages")
    messagesContainer.innerHTML = ""

    this.messages.forEach((message) => {
      this.addMessage(message.role, message.content)
    })

    // Update active history item
    document.querySelectorAll(".history-item").forEach((item) => {
      item.classList.remove("active")
    })
    event.currentTarget.classList.add("active")
  }

  toggleSidebar() {
    const sidebar = document.getElementById("chatSidebar")
    sidebar.classList.toggle("active")
  }

  openSettings() {
    document.getElementById("settingsModal").classList.add("active")
  }

  closeSettings() {
    document.getElementById("settingsModal").classList.remove("active")
  }

  setupModelSelector() {
    this.updateModelDisplay()
  }

  setupSettings() {
    document.getElementById("temperatureSlider").value = this.settings.temperature
    document.getElementById("temperatureValue").textContent = this.settings.temperature
    document.getElementById("maxTokensSlider").value = this.settings.maxTokens
    document.getElementById("maxTokensValue").textContent = this.settings.maxTokens
    document.getElementById("conversationMode").value = this.settings.conversationMode
  }

  autoResizeTextarea() {
    const textarea = document.getElementById("messageInput")
    textarea.addEventListener("input", function () {
      this.style.height = "auto"
      this.style.height = Math.min(this.scrollHeight, 120) + "px"
    })
  }

  scrollToBottom() {
    const messagesContainer = document.getElementById("chatMessages")
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  new HamkamAI()
})

// Handle page visibility for better performance
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // Pause any ongoing operations
  } else {
    // Resume operations
  }
})
