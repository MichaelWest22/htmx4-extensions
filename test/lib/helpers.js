if (typeof installFetchMock !== 'undefined') {
  installFetchMock()
}

const savedUrl = window.location.href;
let testDebugging = false;

function setupTest(test) {
  if (test) {
    console.log("RUNNING TEST: ", test.title);
  }
}

function cleanupTest() {
    let pg = playground()
    if (pg && !testDebugging) {
        pg.innerHTML = ''
    }
    testDebugging = false;
    if (typeof fetchMock !== 'undefined' && fetchMock.reset) {
        if (fetchMock.pendingRequests && fetchMock.pendingRequests.length > 0) {
            console.warn(`WARNING: Test is leaving ${fetchMock.pendingRequests.length} request(s) in flight.`);
        }
        fetchMock.reset()
    }
    history.replaceState(null, '', savedUrl);
}

function backupExtensions() {
    return {
        extMethods: new Map(htmx.__extMethods),
        registeredExt: new Set(htmx.__registeredExt),
        approvedExt: htmx.__approvedExt
    };
}

function restoreExtensions(backup) {
    htmx.__extMethods = backup.extMethods;
    htmx.__registeredExt = backup.registeredExt;
    htmx.__approvedExt = backup.approvedExt;
}

function clearExtensions() {
    htmx.__extMethods.clear();
    htmx.__registeredExt.clear();
}

function createProcessedHTML(innerHTML) {
  let pg = playground();
  if (pg) {
    pg.innerHTML = innerHTML
    htmx.process(pg)
  }
  return pg.firstElementChild
}

function mockResponse(action, pattern, response, options = {}) {
  fetchMock.mockResponse(action, pattern, response, options);
}

function mockFailure(action, pattern, message = 'Network failure') {
  fetchMock.mockFailure(action, pattern, message);
}

function lastFetch() {
    let lastCall = fetchMock.getLastCall();
    assert.isNotNull(lastCall, "No fetch call was made!")
    return lastCall;
}

function waitForEvent(eventName, timeout = 200) {
  return htmx.forEvent(eventName, testDebugging ? 0 : timeout);
}

function forRequest(timeout = 200) {
  return waitForEvent("htmx:finally:request", timeout);
}

function playground() {
  return htmx.find("#test-playground");
}

function find(selector) {
  return htmx.find(playground(), selector)
}
