# AI-autocomplete

AIs shouldn't have worked that way; it should answer preemptively. 

## Overview

AI-autocomplete is a JavaScript-based project that explores a different approach to AI web app interactions. Rather than waiting for complete user queries, this project focuses on AI systems that proactively anticipate and respond to user needs before being explicitly asked.

The script automatically works on many major AI web apps: `[ChatGPT, Claude, Qwen, DeepSeek]`, without any configurations needed. (apart from API key settings)

We use the Gemini 2.5 Flash Lite model for instant response.

## Features

- **Preemptive Intelligence**: AI that anticipates user needs and provides answers ahead of time
- **Proactive Responses**: Shift from reactive to proactive AI interactions
- **Decide when you want to activate**: Press the asterisk (`*`) to toggle the whole script.
- **2 response styles** - Completion & Direct answering, Auto by default, and can be manually set using `/ans` or `/com` at the end of prompt.

## Getting Started

### Prerequisites

- A modern browser, with Tampermonkey installed

### Installation

0. Star this repo.
1. Make sure you have Tampermonkey installed on your browser, and install the script in this repo.
2. Remember to edit the API Key in the code.
3. Open up an AI website and wait till it is fully loaded. Enjoy!
