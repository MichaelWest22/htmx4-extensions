(function() {
  htmx.registerExtension('method-override', {
    htmx_config_request: function(elt, detail) {
      var method = detail.ctx.request.method.toLowerCase();
      if (method !== 'get' && method !== 'post') {
        detail.ctx.request.headers['X-HTTP-Method-Override'] = method.toUpperCase();
        detail.ctx.request.method = 'POST';
      }
    }
  });
})();
