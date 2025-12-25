# GM Script Verification Harness

This directory contains a test harness for the `autocomplete.user.js` Greasemonkey script.

## Files

*   `index.html`: A minimal HTML page with a `contenteditable` div to simulate a chat input (e.g., Claude, ChatGPT).
*   `verify_script.py`: A Python Playwright script that:
    1.  Loads `index.html`.
    2.  Injects polyfills for GM APIs (`GM_xmlhttpRequest`, `GM_getValue`, `GM_setValue`, `GM_addStyle`).
    3.  Injects the `autocomplete.user.js` script (read from the project root).
    4.  Simulates user typing.
    5.  Verifies that the AI Autocomplete UI appears and shows mocked suggestions.
    6.  Takes a screenshot (`verification_result.png`).

## Usage

To run the verification, execute the script from the repository root:

```bash
python3 test/verify_script.py
```

Or from the `test/` directory:

```bash
cd test && python3 verify_script.py
```

## How it works

Since we cannot easily automate the real ChatGPT/Claude websites due to auth/bot protections, we use a local "mock" environment. The `verify_script.py` defines a mock `GM_xmlhttpRequest` that intercepts the API call to Gemini and returns a predefined JSON response. This allows us to verify the *logic* of the userscript (UI rendering, debounce, insertion, etc.) without hitting external APIs.
