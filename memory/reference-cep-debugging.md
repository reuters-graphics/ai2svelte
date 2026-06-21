---
name: cep-debugging
description: How to debug the CEP panel using Chrome DevTools Protocol (CDP) at localhost:8860
metadata:
  type: reference
---

The CEP panel exposes a CDP endpoint. `cep.config.ts` sets `startingDebugPort: 8860`.

**Get panel target ID:**
```bash
curl -s http://localhost:8860/json
```
Returns the WebSocket debugger URL: `ws://localhost:8860/devtools/page/<TARGET_ID>`.

**Run JS in the panel via Python:**
```python
import asyncio, json
import websockets  # pip install websockets

async def run():
    async with websockets.connect("ws://localhost:8860/devtools/page/<TARGET_ID>") as ws:
        await ws.send(json.dumps({"id": 1, "method": "Runtime.enable"}))
        await asyncio.sleep(0.3)
        await ws.recv()  # discard ack

        await ws.send(json.dumps({"id": 2, "method": "Runtime.evaluate",
            "params": {"expression": "document.title", "returnByValue": True}}))
        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=4))
        print(msg["result"]["result"]["value"])

asyncio.run(run())
```

**Send a real hardware-level mouse click (bypasses CEP's event bridge):**
```python
await ws.send(json.dumps({"id": 10, "method": "Input.dispatchMouseEvent",
    "params": {"type": "mousePressed", "x": X, "y": Y, "button": "left", "clickCount": 1}}))
await ws.send(json.dumps({"id": 11, "method": "Input.dispatchMouseEvent",
    "params": {"type": "mouseReleased", "x": X, "y": Y, "button": "left", "clickCount": 1}}))
```
`Input.dispatchMouseEvent` creates trusted events directly in Chromium — useful for testing component logic independently of CEP's broken event forwarding (see [[cep-pointerdown-bug]]).

**Intercept ALL events (diagnose what CEP actually dispatches):**
```js
window.__allEvents = [];
['click','mousedown','mouseup','pointerdown','pointerup','pointermove','keydown'].forEach(type => {
  document.addEventListener(type, e => {
    window.__allEvents.push({ type: e.type, trusted: e.isTrusted, tag: e.target.tagName });
  }, true); // capture=true catches before any handler can stopPropagation
});
// Then: JSON.stringify(window.__allEvents.slice(-30))
```

**Panel URL note:** When `pnpm dev` is NOT running, the panel loads from `file:///Users/.../Library/Application Support/Adobe/CEP/extensions/com.reuters-graphics.ai2svelte/main/index.html` (the symlinked `dist/cep/` build). When `pnpm dev` IS running, it loads from `http://localhost:3000/main/index.html`.
