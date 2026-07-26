(() => {
    const cfg = () => htmx.config.hxStreaming ?? {};
    const moEnabled  = () => cfg().moEnabled  ?? true;
    const fetchMode  = () => cfg().fetchMode  ?? 'header';  // 'header' | 'always'
    const debounceMs = () => cfg().debounceMs ?? 500;

    // --- Stylesheet: hide hx-partial elements until processed ---
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('hx-partial,hx-ready{display:none}');
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

    // --- Node classification ---
    function isStreamNode(node) {
        return node.nodeType === 1 && (
            (node.tagName === 'TEMPLATE' && node.hasAttribute('hx')) ||
            /^HX-[A-Z]/i.test(node.tagName)
        );
    }

    //=========================================================================
    // PAGE LOAD — MutationObserver
    // Handles the initial full-page streaming response only.
    // Ends on real DOMContentLoaded (TCP close).
    //=========================================================================

    const watching = new WeakSet();
    let pageLoadActive = moEnabled();
    let fetchActive = false;

    function processNode(node) {
        if (node.tagName === 'HX-READY') {
            node.remove();
            const evt = new Event('DOMContentLoaded');
            evt.synthetic = true;
            document.dispatchEvent(evt);
            return;
        }

        htmx.swap({ text: node.outerHTML, sourceElement: document.body, swap: 'none' });
        node.remove();
    }

    function watchNode(node) {
        if (watching.has(node)) return;
        watching.add(node);

        if (node.nextSibling || node.tagName === 'HX-READY') {
            processNode(node);
            return;
        }

        let debounceTimer;
        let contentObs;
        let siblingObs;

        function finish() {
            clearTimeout(debounceTimer);
            contentObs?.disconnect();
            siblingObs?.disconnect();
            processNode(node);
        }

        contentObs = new MutationObserver(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(finish, debounceMs());
        });
        contentObs.observe(node.content ?? node, { childList: true, subtree: true });

        siblingObs = new MutationObserver(() => {
            if (node.nextSibling) finish();
        });
        if (node.parentNode) {
            siblingObs.observe(node.parentNode, { childList: true });
        }

        debounceTimer = setTimeout(finish, debounceMs());
    }

    const pageLoadObserver = new MutationObserver(mutations => {
        for (const m of mutations)
            for (const node of m.addedNodes)
                if (isStreamNode(node)) watchNode(node);
    });

    function endPageLoad() {
        pageLoadActive = false;
        pageLoadObserver.disconnect();
    }

    if (moEnabled()) {
        pageLoadObserver.observe(document.documentElement, { childList: true, subtree: true });
        document.addEventListener('DOMContentLoaded', e => {
            if (!e.synthetic) endPageLoad();
        }, { once: true });
        document.querySelectorAll('template[hx]').forEach(watchNode);
        document.querySelectorAll('*').forEach(n => /^HX-[A-Z]/i.test(n.tagName) && watchNode(n));
    }

    //=========================================================================
    // FETCH INTERCEPT — htmx extension
    // Handles all htmx requests (hx-get, hx-post, boost, etc.).
    //
    // Three phases:
    //   1. Pre-body partials  — swap into current page before <body> arrives
    //   2. Main body swap     — return shell HTML to htmx for normal swap
    //   3. Post-body partials — swap into new page after htmx:after:swap
    //=========================================================================

    // Matches <hx-*>, <template hx>, <hx-ready>
    const partialRe = /(<hx-[a-z][^>]*>[\s\S]*?<\/hx-[a-z]+>|<template\s[^>]*\bhx\b[^>]*>[\s\S]*?<\/template>|<hx-ready[^>]*>\s*<\/hx-ready>)/gi;

    // Pending post-swap tasks stored on ctx directly — sourceElement may be detached after body swap

    htmx.registerExtension('hx-streaming', {
        htmx_before_response: (elt, detail) => {
            fetchActive = true;
            const ctx = detail.ctx;
            if (fetchMode() === 'header' && !ctx.response.headers.has('HX-Stream-Partials')) return;
            const realText = ctx.response.raw.text.bind(ctx.response.raw);
            ctx.response.raw.text = async () => {
                const response = { body: ctx.response.raw.body, text: realText };
                return streamPartials(response, ctx, elt);
            };
        },

        htmx_after_swap: (elt, detail) => {
            const task = detail.ctx?._streamAfterSwap;
            if (task) {
                delete detail.ctx._streamAfterSwap;
                task();
            }
        },

        htmx_after_history_push: () => {
            if (pageLoadActive && !fetchActive) { endPageLoad(); window.stop(); }
            else if (pageLoadActive) { endPageLoad(); }
        },

        htmx_after_history_replace: () => {
            if (pageLoadActive && !fetchActive) { endPageLoad(); window.stop(); }
            else if (pageLoadActive) { endPageLoad(); }
        }
    });

    async function streamPartials(response, ctx, elt) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (!done) buffer += decoder.decode(value, { stream: true });

                // Phase 1: swap partials that arrive before <body> into current page
                if (buffer.search(/<body[\s>]/i) === -1) {
                    if (done) break; // no <body> at all — partial-only response
                    ({ buffer } = await swapPartialsInBuffer(buffer, ctx));
                    continue;
                }

                // Phase 2: split at </body>, </html>, or stream end — whichever comes first
                const bodyEnd = buffer.search(/<\/body>/i);
                const htmlEnd = buffer.search(/<\/html>/i);
                const splitAt = bodyEnd !== -1 ? bodyEnd + 7
                              : htmlEnd !== -1 ? htmlEnd + 7
                              : done          ? buffer.length
                              : -1;
                if (splitAt !== -1) {
                    let shell = buffer.slice(0, splitAt);
                    const tail = buffer.slice(splitAt);
                    shell = shell.replace(/<hx-ready[^>]*>\s*<\/hx-ready>/gi, '');
                    const inlinePartials = [];
                    shell = shell.replace(partialRe, m => { inlinePartials.push(m); return ''; });
                    if (!done) {
                        ctx._streamAfterSwap = () =>
                            processAfterSwap(reader, decoder, inlinePartials.join('') + tail, ctx);
                    }
                    return shell;
                }
            }
        } catch (e) {
            reader.releaseLock();
            throw e;
        }

        // No <body> — partial-only response
        buffer += decoder.decode();
        ({ buffer } = await swapPartialsInBuffer(buffer, ctx));
        reader.releaseLock();
        return buffer;
    }

    async function processAfterSwap(reader, decoder, tail, ctx) {
        let buffer = tail;
        try {
            ({ buffer } = await swapPartialsInBuffer(buffer, ctx));
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                ({ buffer } = await swapPartialsInBuffer(buffer, ctx));
            }
        } finally {
            reader.releaseLock();
        }
    }

    async function swapPartialsInBuffer(buffer, ctx) {
        const matches = [];
        let m;
        partialRe.lastIndex = 0;
        while ((m = partialRe.exec(buffer)) !== null) {
            matches.push({ html: m[0], start: m.index, end: partialRe.lastIndex });
        }

        for (const match of matches) {
            if (/<hx-ready/i.test(match.html)) { continue; }
            await htmx.swap({ text: match.html, sourceElement: document.body, swap: 'none' });
        }

        for (let i = matches.length - 1; i >= 0; i--) {
            buffer = buffer.slice(0, matches[i].start) + buffer.slice(matches[i].end);
        }

        return { buffer };
    }
})();
