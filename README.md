# AI-autocomplete

AIs shouldn't have worked that way; it should answer preemptively. 
<p align="center">
  <img src="https://img.shields.io/badge/Userscript-Tampermonkey-blue.svg" alt="Userscript">
  <img src="https://img.shields.io/github/license/c-jeremy/AI-autocomplete" alt="License">
  <img src="https://img.shields.io/github/stars/c-jeremy/AI-autocomplete?style=social" alt="Stars">
  <img src="https://img.shields.io/github/forks/c-jeremy/AI-autocomplete?style=social" alt="Forks">
</p>


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
- A [Google AI Studio](https://ai.studio) API Key

### Installation

0. Star this repo.
1. Make sure you have Tampermonkey installed on your browser, and install the script in this repo.
2. Remember to edit [the API Key in the code](https://github.com/c-jeremy/AI-autocomplete/blob/2bdb885cc41ccba3daf83028d00499470ab9e715/autocomplete.user.js#L25).
3. Open up an AI website and wait till it is fully loaded. Enjoy!


## Usage

1. Make sure you have your API key configured in the script.
2. Fire up a web page of an AI chatbot. Input some words.
3. Wait for 1-2 secs; the AI shall either: Complete your prompt, OR offer a quick and concise Answer. The mode it uses is per request and is Auto decided by default.
   ![Screenshot_20251130_000625](https://github.com/user-attachments/assets/326dc08c-c878-4200-859d-9af1cc41b38c)
   ![Screenshot_20251130_000816](https://github.com/user-attachments/assets/a28384c8-fc55-4b03-975a-9962b86ccca5)
4. If it does not meet your needs, (e.g. the model attempts to complete your prompt when you want it to directly answer it, or vice versa) add `/ans` or `/com` to the very end of your prompt to manually nudge the AI into your desired mode.

   
