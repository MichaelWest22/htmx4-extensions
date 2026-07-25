describe('hello world', function() {

    beforeEach(function() {
        setupTest();
    });

    afterEach(function() {
        cleanupTest();
    });

    it('test framework is working', function() {
        assert.equal(1 + 1, 2);
    });

    it('htmx is loaded', function() {
        assert.isDefined(window.htmx);
        assert.isDefined(htmx.version);
    });

    it('playground is available', function() {
        assert.isNotNull(playground());
    });

    it('fetch mock is working', async function() {
        mockResponse('GET', '/hello', 'world');
        let div = createProcessedHTML('<div hx-get="/hello" hx-swap="innerHTML">original</div>');
        div.click();
        await forRequest();
        assertTextContentIs('div', 'world');
    });
});
