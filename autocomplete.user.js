// ==UserScript==
// @name         AI Autocomplete
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Vertical list suggestions + Direct Answer mode. Smart intent detection in one shot.
// @author       c-jeremy
// @match        https://claude.ai/*
// @match        https://chatgpt.com/*
// @connect      generativelanguage.googleapis.com

// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ================= 配置区域 =================
    const CONFIG = {
        // !!! 务必在此填入你的 API KEY !!!
        apiKey: "AIzaSy...",

        endpoint: "https://generativeai.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent",
        debounceTime: 700,
    };

    // 状态管理
    let state = {
        enabled: GM_getValue('copilot_enabled', true),
        isThinking: false,
        candidates: [],
        activeInput: null,
        debounceTimer: null,
        isInternalChange: false,
        mode: 'completion' // 'completion' | 'answer'
    };

   // 样式定义 (垂直堆叠 + 简洁版 Answer)
    GM_addStyle(`
        #ai-copilot-float {
            position: fixed;
            z-index: 10000;
            padding: 8px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.85); /* 稍微不透明一点 */
            backdrop-filter: blur(20px) saturate(180%);
            -webkit-backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.6);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 13px;
            color: #333;
            pointer-events: none;
            transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
            opacity: 0;
            transform: translateY(10px) scale(0.98);

            display: flex;
            flex-direction: column;
            gap: 6px;
            min-width: 180px;
            max-width: 600px; /* <--- 修改 1：加宽，防止显示不全 */
            align-items: stretch;
        }

        @media (prefers-color-scheme: dark) {
            #ai-copilot-float {
                background: rgba(30, 30, 30, 0.85);
                border: 1px solid rgba(255, 255, 255, 0.15);
                color: #f0f0f0;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            }
        }

        #ai-copilot-float.visible {
            opacity: 1;
            transform: translateY(0) scale(1);
        }

        .copilot-item {
            display: flex;
            align-items: flex-start; /* 改为顶部对齐，适应多行文本 */
            gap: 8px;
            padding: 6px 8px;
            border-radius: 6px;
            background: rgba(0,0,0,0.02);
            line-height: 1.4;
        }

        .copilot-key {
            background: rgba(0,0,0,0.08);
            color: #555;
            border-radius: 4px;
            padding: 1px 6px;
            font-size: 11px;
            font-weight: 600;
            min-width: 18px;
            text-align: center;
            margin-top: 1px; /* 对齐微调 */
            flex-shrink: 0;
        }

        @media (prefers-color-scheme: dark) {
            .copilot-item { background: rgba(255,255,255,0.03); }
            .copilot-key { background: rgba(255,255,255,0.15); color: #ddd; }
        }

        /* 普通单行文本 */
        .copilot-text {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
        }

        /* <--- 修改 2：长文本自动换行模式 */
        .copilot-text-wrap {
            white-space: pre-wrap;
            word-break: break-word;
            flex: 1;
        }

        .copilot-status {
            padding: 4px;
            text-align: center;
            font-style: italic;
            opacity: 0.7;
            font-size: 12px;
        }
    `);
    // ================= UI 管理 =================
    const ui = {
        el: null,
        init() {
            this.el = document.createElement('div');
            this.el.id = 'ai-copilot-float';
            document.body.appendChild(this.el);
        },

        show(html) {
            if (!this.el) this.init();
            this.el.innerHTML = html;
            this.el.classList.add('visible');
            this.updatePosition();
        },

        hide() {
            if (this.el) this.el.classList.remove('visible');
            state.candidates = [];
            state.mode = 'completion';
        },

       renderCandidates(options, mode) {
            state.candidates = options;
            state.mode = mode;
            if (options.length === 0) return;

            let html = '';

            if (mode === 'answer') {
                // === 简洁版智能回答 ===
                const ans = options[0];
                html = `
                    <div class="copilot-item">


                        <span class="copilot-text-wrap">✦&nbsp;&nbsp; ${ans}</span>
                    </div>
                `;
            } else {
                // === 普通补全模式 ===
                html = options.map((opt, idx) => `
                    <div class="copilot-item">
                        <span class="copilot-key">${idx + 1}</span>
                        <span class="copilot-text">${opt}</span>
                    </div>
                `).join('');
            }

            this.show(html);
        },

        updatePosition() {
            if (!state.activeInput || !this.el) return;
            const rect = state.activeInput.getBoundingClientRect();
            if (rect.top === 0 && rect.left === 0) return;

            const floatHeight = this.el.offsetHeight || 100;
            // 垂直布局可能会高一点，所以稍微往上提一点
            let top = rect.top - floatHeight - 14;
            let left = rect.left;

            // 如果顶部空间不够，就放到输入框底部
            if (top < 10) top = rect.bottom + 10;

            // 防止右侧溢出
            if (left + 300 > window.innerWidth) left = window.innerWidth - 310;

            this.el.style.top = `${top}px`;
            this.el.style.left = `${left}px`;
        }
    };

    // ================= 逻辑处理 =================

    function getActiveInput() {
        const el = document.activeElement;
        if (el && el.getAttribute('contenteditable') === 'true') return el;
        if (el && el.tagName === 'TEXTAREA') return el;
        return document.querySelector('#prompt-textarea') || document.querySelector('div[contenteditable="true"]');
    }

    function insertText(text) {
        if (!state.activeInput) return;
        state.activeInput.focus();

        // 智能处理空格：
        // 如果是 Answer 模式，且看起来像是一个完整的替换（比如首都），前面最好加个换行或者冒号？
        // 暂定：如果不是以符号开头，加个空格
        let textToInsert = text;
        const needsSpace = !/^[\s.,;:!?]/.test(text);
        if (needsSpace) textToInsert = ' ' + text;

        document.execCommand('insertText', false, textToInsert);
        ui.hide();
    }

    function fetchSuggestions(userText) {
        if (!CONFIG.apiKey) return;

        const requestText = userText;

        //ui.show(`<div class="copilot-status">Thinking...</div>`);
        state.isThinking = true;

        const finalUrl = `${CONFIG.endpoint}?key=${CONFIG.apiKey}`;

        // === 核心 Prompt：一次性分类 + 生成 ===
        // 使用 JSON 模式强制结构化输出，大大降低解析难度
        const systemPrompt = `

        Determine if user is asking a factual question with a definite, short answer (Mode: ANSWER), or just typing that needs completion (Mode: COMPLETION).

        IS ANSWER MODE RULES:
        1. Query must be factual. NOT NECESSARILY COMPLETE.
        2. Answer must be certain and short. MAX=30words
        3. User input implies a question EVEN IF incomplete.

        ELSE is COMPLETION mode.
        1. Provide 3 diverse & concise continuations of the given text to build up QUESTIONS.
        2. NEVER repeat the Input. Output ONLY the remaining text (Suffix).

        Output ONLY JSON:
        {
          "mode": "ANSWER" or "COMPLETION",
          "candidates": ["string"]
        }
        (If ANSWER, 'candidates' has 1 string. If COMPLETION, 'candidates' has 3 strings).
        `;

        const payload = {
            "contents": [{
                "parts": [{
                    "text": `${systemPrompt}\n\nUser Input: "${userText}"\nJSON Response:`
                }]
            }],
            "generationConfig": {
                "maxOutputTokens": 100,
                "temperature": 0.3,
                "responseMimeType": "application/json" // 强开启 JSON 模式 (Gemini 特性)
            }
        };

        GM_xmlhttpRequest({
            method: "POST",
            url: finalUrl,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify(payload),
            onload: function(response) {
                state.isThinking = false;
                if (response.status === 200) {
                    try {
                        const el = getActiveInput();
                const currentText = el ? el.innerText.trim() : "";

                // 如果现在的文本 和 请求时的文本 不一致
                // 说明用户在请求期间又打字了，这个回复已经没用了，直接丢弃
                if (currentText !== requestText) {
                    // 保持 silent，不要 hide，因为可能新的请求正在路上
                    // 仅仅只是不处理这次过期的结果
                    return;
                }
                        const data = JSON.parse(response.responseText);
                        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;

                        if (rawJson) {
                            const result = JSON.parse(rawJson);
                            if (result.candidates && result.candidates.length > 0) {
                                ui.renderCandidates(result.candidates, result.mode?.toLowerCase() || 'completion');
                            } else {
                                ui.hide();
                            }
                        }
                    } catch (e) {
                        console.error("Copilot Parse Error:", e);
                        ui.hide();
                    }
                } else {
                    ui.hide();
                }
            },
            onerror: () => {
                state.isThinking = false;
                ui.hide();
            }
        });
    }

    // ================= 事件监听 (包含修复后的逻辑) =================

    setInterval(() => {
        if (state.activeInput && document.activeElement === state.activeInput) ui.updatePosition();
    }, 100);

    document.addEventListener('keydown', (e) => {
        const el = getActiveInput();
        if (!el) return;

        // 全局开关 Toggle
        if (e.key === '*' && el.innerText.trim().length < 2) {
            e.preventDefault();
            state.enabled = !state.enabled;
            GM_setValue('copilot_enabled', state.enabled);
            ui.show(state.enabled ? `<div class="copilot-status">Copilot On</div>` : `<div class="copilot-status">See you.</div>`);
            setTimeout(() => ui.hide(), 1500);
            return;
        }

        if (!state.enabled) return;

        // Esc 关闭
        if (e.key === 'Escape') ui.hide();
    }, true);

    // 输入监听 (包含移动端数字选择 + 递归锁)
    document.addEventListener('input', (e) => {
        if (state.isInternalChange) return;

        const el = getActiveInput();
        if (!el || !state.enabled) return;

        state.activeInput = el; // 确保 activeInput 更新
        const currentText = el.innerText;

        // === 选择逻辑 ===
        if (state.candidates.length > 0) {
            const lastChar = currentText.slice(-1);

            // 如果是 Answer 模式，只响应 '1'
            // 如果是 Completion 模式，响应 '1', '2', '3'
            const validKeys = state.mode === 'answer' ? ['1'] : ['1', '2', '3'];

            if (validKeys.includes(lastChar)) {
                const index = parseInt(lastChar) - 1;
                const targetText = state.candidates[index];

                if (targetText) {
                    state.isInternalChange = true;
                    try {
                        document.execCommand('delete'); // 删掉数字
                        insertText(targetText); // 填入内容
                    } finally {
                        setTimeout(() => { state.isInternalChange = false; }, 100);
                    }
                    return;
                }
            }
        }

        // === 防抖请求逻辑 ===
        clearTimeout(state.debounceTimer);
        ui.hide(); // 输入新内容时隐藏旧建议

        if (currentText.trim().length < 4) return;

        state.debounceTimer = setTimeout(() => {
            if (document.activeElement === el) {
                fetchSuggestions(el.innerText.trim());
            }
        }, CONFIG.debounceTime);
    }, true);

    document.addEventListener('focusin', (e) => {
        const el = getActiveInput();
        if (el && state.enabled) {
            state.activeInput = el;
            // 只有当完全没内容时才显示 Ready，避免烦人
            if (el.innerText.trim().length === 0) {
                ui.show(`<div class="copilot-status">Ready.</div>`);
                setTimeout(() => { if (!state.isThinking && state.candidates.length === 0) ui.hide(); }, 2000);
            }
        }
    }, true);

    document.addEventListener('focusout', (e) => {
        setTimeout(() => {
             if (document.activeElement !== state.activeInput) ui.hide();
        }, 200);
    });

    ui.init();
})();
