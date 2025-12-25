import asyncio
import json
import os
from pathlib import Path
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Enable console logging
        page.on("console", lambda msg: print(f"PAGE CONSOLE: {msg.text}"))

        # Resolve paths relative to this script file
        script_dir = Path(__file__).parent.resolve()
        repo_root = script_dir.parent

        index_html_path = script_dir / "index.html"
        gm_script_path = repo_root / "autocomplete.user.js"
        screenshot_path = script_dir / "verification_result.png"

        file_url = f"file://{index_html_path}"
        await page.goto(file_url)

        gm_polyfill = """
        window.gm_store = {};

        window.GM_getValue = function(key, defaultVal) {
            // console.log('GM_getValue called for', key);
            return window.gm_store[key] !== undefined ? window.gm_store[key] : defaultVal;
        };

        window.GM_setValue = function(key, val) {
            // console.log('GM_setValue called for', key, val);
            window.gm_store[key] = val;
        };

        window.GM_addStyle = function(css) {
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        };

        window.GM_xmlhttpRequest = function(details) {
            if (!details) {
                console.error("GM_xmlhttpRequest called with null/undefined details!");
                return;
            }
            console.log("GM_xmlhttpRequest called for URL:", details.url);

            const rawInnerJson = JSON.stringify({
                mode: "COMPLETION",
                candidates: [
                    " is the capital of France?",
                    " is a beautiful city.",
                    " is where the Eiffel Tower is."
                ]
            });

            const mockResponseData = {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    text: rawInnerJson
                                }
                            ]
                        }
                    }
                ]
            };

            console.log("Sending mock response in 500ms...");

            setTimeout(() => {
                if (details.onload) {
                    details.onload({
                        status: 200,
                        responseText: JSON.stringify(mockResponseData)
                    });
                }
            }, 500);
        };
        """

        print("Injecting polyfill...")
        await page.evaluate(gm_polyfill)
        print("Polyfill injected.")

        if not gm_script_path.exists():
            print(f"Error: Could not find {gm_script_path}")
            await browser.close()
            return

        with open(gm_script_path, 'r') as f:
            gm_script_content = f.read()

        print("Injecting GM script...")
        await page.evaluate(gm_script_content)
        print("GM Script injected.")

        await page.click('#prompt-textarea')

        input_text = "Paris"
        await page.keyboard.type(input_text, delay=100)

        print(f"Typed '{input_text}'. Waiting...")

        # Give enough time for debounce (700ms) + network delay (500ms) + processing
        await page.wait_for_timeout(3000)

        try:
            copilot = page.locator('#ai-copilot-float')
            if await copilot.is_visible():
                content = await copilot.inner_text()
                print("Copilot Content (Initial):", content)

                if "Ready" in content:
                    print("Still 'Ready.', waiting longer...")
                    await page.wait_for_timeout(2000)
                    content = await copilot.inner_text()
                    print("Copilot Content (After Wait):", content)
            else:
                print("Copilot UI not visible.")

            if "capital of France" in content:
                print("SUCCESS: Mock suggestion found.")
            else:
                print("FAILURE: Mock suggestion not found.")

        except Exception as e:
            print("Error:", e)

        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
