(function() {
  htmx.registerExtension('path-params', {
    htmx_config_request: function(elt, detail) {
      var body = detail.ctx.request.body;
      detail.ctx.request.action = detail.ctx.request.action.replace(/{([^}]+)}/g, function(_, param) {
        var val = body instanceof FormData ? body.get(param) : undefined;
        if (val !== null && val !== undefined) body.delete(param);
        return val != null ? encodeURIComponent(val) : '{' + param + '}';
      });
    }
  });
})();
