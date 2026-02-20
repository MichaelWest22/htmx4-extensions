(function() {
  let api;
  
  htmx.registerExtension('json-enc', {
    init: function(internalAPI) {
      api = internalAPI;
    },
    
    htmx_before_request: function(elt, detail) {
      const value = api.attributeValue(elt, 'hx-json-enc');
      if (value == null || value === 'false') return;
      
      detail.ctx.request.headers['Content-Type'] = 'application/json';
      
      const object = {};
      for (let [key, value] of detail.ctx.request.body) {
        if (key in object) {
          object[key] = [].concat(object[key], value);
        } else {
          object[key] = value;
        }
      }
      
      // Restore original types from hx-vals
      if (detail.ctx.vals) {
        Object.assign(object, detail.ctx.vals);
      }
      
      detail.ctx.request.body = JSON.stringify(object);
    }
  });
})();
