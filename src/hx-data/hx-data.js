// hx-data extension: collect and sync data-* attributes
// Handles:
//   hx-data attribute - collect data-* from element/ancestors, send with request
//   HX-Data response header - JSON object to update data-* attributes
//   <hx-data> element - same format, for SSE/WS/streaming responses
(() => {
    let api;

    // Collect data-* attributes from element and ancestors, with JSON parsing
    function collectData(elt) {
        let result = {};
        let seen = new Set();
        for (let node = elt; node && node.nodeType === 1; node = node.parentElement) {
            for (let key of Object.keys(node.dataset)) {
                if (key === 'htmxPowered') continue;
                if (seen.has(key)) continue;
                seen.add(key);
                let raw = node.dataset[key];
                try { result[key] = JSON.parse(raw); } catch { result[key] = raw; }
            }
        }
        return result;
    }

    // Collect data from elements matching selectors
    function collectDataFromSelectors(elt, selectors) {
        let result = {};
        for (let selector of selectors.split(',').map(s => s.trim()).filter(Boolean)) {
            for (let target of htmx.findAll(elt, selector)) {
                Object.assign(result, collectData(target));
            }
        }
        return result;
    }

    function applyDataUpdates(updates) {
        for (let [key, value] of Object.entries(updates)) {
            if (key.startsWith('data-')) {
                // Global update: find all elements with this data attribute
                let selector = `[${CSS.escape(key)}]`;
                for (let elt of document.querySelectorAll(selector)) {
                    elt.setAttribute(key, typeof value === 'string' ? value : JSON.stringify(value));
                }
            } else {
                // Selector lookup: find elements, set nested data-* attributes
                let targets = document.querySelectorAll(key);
                if (value && typeof value === 'object') {
                    for (let elt of targets) {
                        for (let [attr, val] of Object.entries(value)) {
                            if (attr.startsWith('data-')) {
                                elt.setAttribute(attr, typeof val === 'string' ? val : JSON.stringify(val));
                            }
                        }
                    }
                }
            }
        }
    }

    function processDataElement(templateElt) {
        // Process data-* attributes on the element itself (attribute form)
        for (let attr of templateElt.attributes) {
            if (attr.name.startsWith('data-')) {
                let selector = `[${CSS.escape(attr.name)}]`;
                for (let elt of document.querySelectorAll(selector)) {
                    elt.setAttribute(attr.name, attr.value);
                }
            }
        }

        // Process JSON body if present
        let text = templateElt.innerHTML.trim();
        if (text) {
            try {
                let updates = JSON.parse(text);
                applyDataUpdates(updates);
            } catch (e) {
                console.error('htmx: hx-data invalid JSON', e);
            }
        }
    }

    htmx.registerExtension('hx-data', {
        init: (internalAPI) => {
            api = internalAPI;
        },

        // Handle <hx-data> elements in responses (converted to <template hx type="data">)
        htmx_process_data: (templateElt) => {
            processDataElement(templateElt);
        },

        // Handle hx-data attribute - collect and add to request
        htmx_config_request: (elt, detail) => {
            let ctx = detail.ctx;
            let hxData = api.attributeValue(ctx.sourceElement, 'hx-data');
            if (hxData == null) return;

            let data;
            if (hxData === '' || hxData === 'true') {
                // Boolean form: collect from element and ancestors
                data = collectData(ctx.sourceElement);
            } else {
                // Selector form: collect from matched elements
                data = collectDataFromSelectors(ctx.sourceElement, hxData);
            }

            // Apply exclusions
            let exclude = htmx.config.data?.exclude || [];
            for (let key of exclude) {
                delete data[key];
            }

            // Add to request body
            if (Object.keys(data).length > 0) {
                let paramName = htmx.config.data?.paramName || 'hx-data';
                ctx.request.body.set(paramName, JSON.stringify(data));
            }
        },

        // Handle HX-Data response header
        htmx_before_swap: (elt, detail) => {
            let hx = detail?.ctx?.hx;
            if (hx?.data) {
                try {
                    let updates = JSON.parse(hx.data);
                    applyDataUpdates(updates);
                } catch (e) {
                    console.error('htmx: HX-Data header invalid JSON', e);
                }
            }
        }
    });
})();
