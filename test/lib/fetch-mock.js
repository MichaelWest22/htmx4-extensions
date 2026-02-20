/**
 * Mock implementation of the Fetch API for testing
 */

class MockResponse {
    constructor(body, init = {}) {
        this.body = body;
        this.status = init.status || 200;
        this.ok = this.status >= 200 && this.status < 300;
        this.statusText = init.statusText || '';
        this.headers = new Map(Object.entries(init.headers || {}));
        this.url = init.url || '';
        this.type = init.type || 'basic';
    }

    async json() {
        if (typeof this.body === 'string') {
            return JSON.parse(this.body);
        }
        return this.body;
    }

    async text() {
        if (typeof this.body === 'string') {
            return this.body;
        }
        return JSON.stringify(this.body);
    }

    async blob() {
        return new Blob([await this.text()]);
    }

    async arrayBuffer() {
        const text = await this.text();
        const encoder = new TextEncoder();
        return encoder.encode(text).buffer;
    }

    clone() {
        return new MockResponse(this.body, {
            status: this.status,
            statusText: this.statusText,
            headers: Object.fromEntries(this.headers),
            url: this.url,
            type: this.type
        });
    }
}

class FetchMock {
    constructor() {
        this.reset();
    }

    reset() {
        if (this.pendingRequests) {
            this.pendingRequests.forEach(({ controller }) => {
                if (controller && !controller.signal.aborted) {
                    controller.abort();
                }
            });
        }
        this.calls = [];
        this.responses = [];
        this.pendingRequests = [];
    }

    recordCall(url, options) {
        this.calls.push({ url, request: options });
    }

    getCalls() {
        return this.calls;
    }

    getLastCall() {
        return this.calls[this.calls.length - 1];
    }

    mockResponse(method, urlPattern, response, options = {}) {
        let upperCasedMethod = method.toUpperCase();
        if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].indexOf(upperCasedMethod) < 0) {
            throw Error("Invalid HTTP method: " + method)
        }
        if (typeof response === 'string') {
            let str = response;
            response = new MockResponse(str, options);
        }
        this.responses.push({
            method: upperCasedMethod,
            urlPattern: typeof urlPattern === 'string' ? new RegExp(urlPattern) : urlPattern,
            response,
            request: options,
            once: options.once || false,
            used: false
        });
    }

    mockFailure(method, urlPattern, message = 'Network failure') {
        this.mockResponse(method, urlPattern, Promise.reject(new Error(message)));
    }

    mockSequentialResponses(method, urlPattern, response, options = {}) {
        const pendingQueue = [];
        const waiters = [];

        this.mockResponse(method, urlPattern, () => {
            return new Promise(resolve => {
                const responseBody = typeof response === 'string'
                    ? new MockResponse(response, options)
                    : response;

                if (waiters.length > 0) {
                    const waiter = waiters.shift();
                    resolve(responseBody);
                    setTimeout(() => waiter(), 0);
                } else {
                    pendingQueue.push({ resolve, responseBody });
                }
            });
        });

        return {
            next() {
                return new Promise(resolve => {
                    if (pendingQueue.length > 0) {
                        const item = pendingQueue.shift();
                        item.resolve(item.responseBody);
                        setTimeout(resolve, 0);
                    } else {
                        waiters.push(resolve);
                    }
                });
            },
            get pendingCount() {
                return pendingQueue.length;
            }
        };
    }

    findResponse(method, url) {
        for (let i = this.responses.length - 1; i >= 0; i--) {
            const mock = this.responses[i];
            if (mock.method === method && mock.urlPattern.test(url)) {
                if (mock.once) {
                    if (!mock.used) {
                        mock.used = true;
                        return typeof mock.response === 'function' ? mock.response() : mock.response;
                    }
                } else {
                    return typeof mock.response === 'function' ? mock.response() : mock.response;
                }
            }
        }
        console.error("no response configured for ", url, " available responses: ", this.responses);
        return "NO RESPONSE CONFIGURED FOR " + url;
    }

    fetch(url, options = {}) {
        this.recordCall(url, options);
        options.method = options.method.toUpperCase()
        const response = this.findResponse(options.method, url);

        const controller = new AbortController();
        const pendingRequest = { controller, promise: null };

        const requestPromise = new Promise((resolve, reject) => {
            if (controller.signal.aborted) {
                reject(new DOMException('The operation was aborted', 'AbortError'));
                return;
            }

            controller.signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted', 'AbortError'));
            });

            Promise.resolve(response instanceof Promise ? response : response)
                .then(result => {
                    if (!controller.signal.aborted) {
                        resolve(result);
                    }
                })
                .catch(error => {
                    if (!controller.signal.aborted) {
                        reject(error);
                    }
                });
        })
        .finally(() => {
            const index = this.pendingRequests.indexOf(pendingRequest);
            if (index > -1) {
                this.pendingRequests.splice(index, 1);
            }
        });

        pendingRequest.promise = requestPromise;
        this.pendingRequests.push(pendingRequest);

        return requestPromise;
    }
}

const fetchMock = new FetchMock();

function installFetchMock() {
    globalThis.fetch = fetchMock.fetch.bind(fetchMock);
}

let originalFetch;
function uninstallFetchMock() {
    if (originalFetch) {
        globalThis.fetch = originalFetch;
    }
}

if (typeof globalThis.fetch !== 'undefined') {
    originalFetch = globalThis.fetch;
}
