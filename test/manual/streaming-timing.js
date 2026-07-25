/**
 * Streaming timing test server
 *
 * Run:  node test/manual/streaming-timing.js
 * Open: http://localhost:3000
 *
 * Streams a page in chunks with delays, logging timestamps in the browser
 * console so we can see exactly when DOMContentLoaded fires relative to
 * when each chunk arrives and when htmx initialises.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const CHUNK_DELAY = 800;
const BODY_CLOSE_DELAY = 500;

const htmxJs       = fs.readFileSync(path.join(__dirname, '../../test/lib/htmx.js'), 'utf8');
const hxStreamingJs = fs.readFileSync(path.join(__dirname, '../../src/hx-streaming/hx-streaming.js'), 'utf8');

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function streamPage(res) {
    const write = (chunk) => new Promise((resolve, reject) => {
        res.write(chunk, err => err ? reject(err) : resolve());
    });

    // --- Chunk 1: head + htmx + opening body with placeholders ---
    await write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Streaming timing test</title>
    <script>
        window.__t0 = performance.now();
        console.log('[0ms] Script in <head> executing');

        document.addEventListener('DOMContentLoaded', (e) => {
            const ms = (performance.now() - window.__t0).toFixed(1);
            console.log('[' + ms + 'ms] DOMContentLoaded fired' + (e.synthetic ? ' (synthetic)' : ' (real)'));
        });

        window.addEventListener('load', () => {
            const ms = (performance.now() - window.__t0).toFixed(1);
            console.log('[' + ms + 'ms] window load fired');
        });
    </script>
    <script src="/vendor/htmx.js"></script>
    <script>
        // Patch htmx.process to log when it runs
        const _origProcess = htmx.process.bind(htmx);
        htmx.process = function(root, force) {
            const ms = (performance.now() - window.__t0).toFixed(1);
            console.log('[' + ms + 'ms] htmx.process() called on', root?.tagName || root);
            return _origProcess(root, force);
        };
    </script>
    <script src="/hx-streaming.js"></script>
</head>
<body>
    <h1>Streaming timing test</h1>
    <p>Watch the console. Each chunk arrives ${CHUNK_DELAY}ms apart.</p>
    <a href="/page-2" hx-boost="true">Navigate to page 2 (click during streaming to test orphaned stream)</a>
    <button onclick="const ms=(performance.now()-window.__t0).toFixed(1);console.log('['+ms+'ms] window.stop() called manually');window.stop();">Test window.stop()</button>

    <button id="test-btn" hx-get="/button-response" hx-swap="outerHTML">
        Click me (hx-get test)
    </button>

    <div id="widget-a" style="padding:8px;border:1px solid #ccc;margin:8px 0">
        Widget A: <em>waiting...</em>
    </div>
    <div id="widget-b" style="padding:8px;border:1px solid #ccc;margin:8px 0">
        Widget B: <em>waiting...</em>
    </div>
    <div id="widget-c" style="padding:8px;border:1px solid #ccc;margin:8px 0">
        Widget C: <em>waiting...</em>
    </div>
    <hx-ready></hx-ready>

    <script>
        { const ms = (performance.now() - window.__t0).toFixed(1);
        console.log('[' + ms + 'ms] Chunk 1 script executed (head + body open + placeholders)'); }
    </script>
`);

    console.log('Server: sent chunk 1 (head + body open)');
    await delay(BODY_CLOSE_DELAY);

    // --- Chunk 2: closing </body></html> with detection experiments ---
    await write(`
    <script>
        { const ms = (performance.now() - window.__t0).toFixed(1);
        console.log('[' + ms + 'ms] Chunk 2 script executed (inside </body> close chunk)'); }
    </script>
</body>
</html>
<script>
    { const ms = (performance.now() - window.__t0).toFixed(1);
    console.log('[' + ms + 'ms] Script AFTER </html> executed — document.readyState:', document.readyState);
    console.log('  document.body exists:', !!document.body);
    console.log('  document.documentElement exists:', !!document.documentElement); }
</script>
`);
    console.log('Server: sent chunk 2 (</body></html> + post-html script)');
    await delay(CHUNK_DELAY);

    // --- Chunk 3: hx-partial for widget-a — trailing space triggers nextSibling immediately ---
    await write(`<hx-partial hx-target="#widget-a" hx-swap="innerHTML">Widget A: <strong>streamed chunk 3</strong></hx-partial> `);
    console.log('Server: sent chunk 3 (widget-a partial)');
    await delay(CHUNK_DELAY);

    // --- Chunk 4: hx-partial for widget-b ---
    await write(`<hx-partial hx-target="#widget-b" hx-swap="innerHTML">Widget B: <strong>streamed chunk 4</strong></hx-partial> `);
    console.log('Server: sent chunk 4 (widget-b partial)');
    await delay(CHUNK_DELAY);

    // --- Chunk 5: template hx for widget-c (last node — trailing space still good practice) ---
    await write(`<template hx type="partial" hx-target="#widget-c" hx-swap="innerHTML">Widget C: <strong>streamed chunk 5 via template</strong></template> `);
    console.log('Server: sent chunk 5 (widget-c template partial)');

    res.end();
    console.log('Server: stream closed');
}

async function streamPage2(res) {
    const write = (chunk) => new Promise((resolve, reject) => {
        res.write(chunk, err => err ? reject(err) : resolve());
    });

    // head only — no body yet
    await write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Page 2 — Streaming</title>
    <script src="/vendor/htmx.js"></script>
    <script src="/hx-streaming.js"></script>
</head>
`);
    await delay(CHUNK_DELAY);

    // Phase 1: pre-body partial — applied to current page before the main swap
    await write(`<hx-partial hx-target="#widget-a" hx-swap="innerHTML">Widget A: <strong>updated from page 2 pre-body</strong></hx-partial>
`);
    await delay(CHUNK_DELAY);

    // Phase 2: body — htmx unwraps and swaps this as the main content
    await write(`<body>
    <h1>Page 2</h1>
    <a href="/" hx-boost="true">Back to page 1</a>
    <div id="widget-d" style="padding:8px;border:1px solid #ccc;margin:8px 0">
        Widget D: <em>waiting...</em>
    </div>
    <div id="widget-e" style="padding:8px;border:1px solid #ccc;margin:8px 0">
        Widget E: <em>waiting...</em>
    </div>
    <div id="widget-f" style="padding:8px;border:1px solid #ccc;margin:8px 0">
        Widget F: <em>waiting...</em>
    </div>
</body>
</html>
`);
    await delay(CHUNK_DELAY);

    // Phase 3: post-body partials — applied to the new page after the main swap
    await write(`<hx-partial hx-target="#widget-e" hx-swap="innerHTML">Widget E: <strong>post-body streamed</strong></hx-partial> `);
    await delay(CHUNK_DELAY);

    await write(`<template hx type="partial" hx-target="#widget-f" hx-swap="innerHTML">Widget F: <strong>post-body streamed via template</strong></template> `);

    res.end();
}


const server = http.createServer(async (req, res) => {
    if (req.url === '/vendor/htmx.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(htmxJs);
        return;
    }

    if (req.url === '/hx-streaming.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(hxStreamingJs);
        return;
    }

    if (req.url === '/page-2') {
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'HX-Stream-Partials': 'true',
            'X-Accel-Buffering': 'no',
            'Cache-Control': 'no-cache',
        });
        streamPage2(res).catch(e => {
            if (!e.message.includes('destroyed') && !e.message.includes('write after end')) {
                console.error('Stream error (page-2):', e.message);
            }
            res.end();
        });
        return;
    }

    if (req.url === '/button-response') {
        const ms = Date.now();
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<div id="test-btn" style="padding:8px;background:#d4edda;border:1px solid #28a745">
    ✓ hx-get worked! Response at ${ms}
</div>`);
        return;
    }

    if (req.url !== '/') {
        res.writeHead(404);
        res.end();
        return;
    }

    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'HX-Stream-Partials': 'true',
        'X-Content-Type-Options': 'nosniff',
        'X-Accel-Buffering': 'no',
        'Cache-Control': 'no-cache',
    });

    try {
        await streamPage(res);
    } catch (e) {
        if (!e.message.includes('destroyed') && !e.message.includes('write after end')) {
            console.error('Stream error:', e.message);
        }
        res.end();
    }
});

server.listen(PORT, () => {
    console.log(`Streaming timing test running at http://localhost:${PORT}`);
    console.log(`Each chunk is delayed by ${CHUNK_DELAY}ms`);
    console.log(`Open the URL and watch both this console and the browser console`);
});
