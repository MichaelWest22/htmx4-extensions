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
            htmx.process(document.body);
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
        document.addEventListener('DOMContentLoaded', endPageLoad, { once: true });
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
            detail.ctx._streamSwapOccurred = true;
        },

        htmx_finally_request: (elt, detail) => {
            const task = detail.ctx?._streamAfterSwap;
            if (task) {
                delete detail.ctx._streamAfterSwap;
                task(detail.ctx._streamSwapOccurred === true).catch(() => {});
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
                else buffer += decoder.decode();

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

                    // Partials before <body> must be applied to the current page now,
                    // regardless of whether they arrived in the same chunk as <body>.
                    const bodyTagAt = shell.search(/<body[\s>]/i);
                    if (bodyTagAt > 0) {
                        const { buffer: preBodyCleaned } = await swapPartialsInBuffer(shell.slice(0, bodyTagAt), ctx);
                        shell = preBodyCleaned + shell.slice(bodyTagAt);
                    }

                    const { buffer: cleanedShell, partials: inlinePartials } = stripStreamNodes(shell);
                    shell = cleanedShell;
                    if (!done) {
                        ctx._streamAfterSwap = (swapOccurred) =>
                            processAfterSwap(reader, decoder, inlinePartials.join('') + tail, ctx, swapOccurred);
                    }
                    return shell;
                }
            }
        } catch (e) {
            reader.releaseLock();
            throw e;
        }

        // No <body> — partial-only response
        ({ buffer } = await swapPartialsInBuffer(buffer, ctx));
        reader.releaseLock();
        return buffer;
    }

    async function processAfterSwap(reader, decoder, tail, ctx, swapOccurred) {
        let buffer = tail;
        try {
            if (swapOccurred) ({ buffer } = await swapPartialsInBuffer(buffer, ctx));
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                if (swapOccurred) ({ buffer } = await swapPartialsInBuffer(buffer, ctx));
            }
        } finally {
            reader.releaseLock();
        }
    }

    // Extract and remove complete stream nodes from a buffer, handling arbitrary nesting.
    // Returns { buffer: string with nodes removed, partials: array of extracted HTML strings }.
    function stripStreamNodes(buffer) {
        // Pass 1: tokenise — one regex sweep, quoted attr values treated as atomic so > inside them is ignored.
        const tagRe = /<(\/?)(hx-[a-z][a-z0-9-]*|template)((?:\s(?:[^>"'\s]|"[^"]*"|'[^']*')*)*)\s*>/gi;
        const tokens = [];
        for (const m of buffer.matchAll(tagRe))
            tokens.push({ close: m[1] === '/', name: m[2].toLowerCase(), attrs: m[3], start: m.index, end: m.index + m[0].length });

        // Pass 2: for each stream root, depth-count forward for that tag name only until balanced.
        const partials = [];
        let out = '';
        let cursor = 0;
        let i = 0;
        while (i < tokens.length) {
            const tok = tokens[i];
            if (tok.close) { i++; continue; }
            if (tok.name === 'template' && !/\bhx\b/.test(tok.attrs)) { i++; continue; }

            const rootName = tok.name;
            let depth = 1, j = i + 1;
            while (j < tokens.length && depth > 0) {
                if (tokens[j].name === rootName) depth += tokens[j].close ? -1 : 1;
                j++;
            }
            if (depth !== 0) break; // incomplete — leave remainder in buffer for next chunk

            out += buffer.slice(cursor, tok.start); // non-partial text before this node
            partials.push(buffer.slice(tok.start, tokens[j - 1].end));
            cursor = tokens[j - 1].end;
            i = j;
        }

        return { buffer: out + buffer.slice(cursor), partials };
    }

    async function swapPartialsInBuffer(buffer, ctx) {
        const { buffer: cleaned, partials } = stripStreamNodes(buffer);
        for (const html of partials) {
            if (/<hx-ready/i.test(html)) continue;
            await htmx.swap({ text: html, sourceElement: document.body, swap: 'none' });
        }
        return { buffer: cleaned };
    }
})();
