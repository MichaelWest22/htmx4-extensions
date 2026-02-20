(function() {
  htmx.registerExtension('ajax-header', {
    htmx_config_request: function(elt, detail) {
      detail.ctx.request.headers['X-Requested-With'] = 'XMLHttpRequest';
    }
  });
})();
