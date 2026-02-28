(function() {
  function stringifyEvent(event) {
    var obj = {};
    for (var key in event) {
      obj[key] = event[key];
    }
    return JSON.stringify(obj, function(key, value) {
      if (value instanceof Node) {
        var nodeRep = value.tagName;
        if (nodeRep) {
          nodeRep = nodeRep.toLowerCase();
          if (value.id) nodeRep += '#' + value.id;
          if (value.classList?.length) nodeRep += '.' + value.classList.toString().replace(' ', '.');
          return nodeRep;
        }
        return 'Node';
      }
      if (value instanceof Window) return 'Window';
      return value;
    });
  }

  htmx.registerExtension('event-header', {
    htmx_config_request: function(elt, detail) {
      var evt = detail.ctx.sourceEvent;
      if (evt) {
        detail.ctx.request.headers['Triggering-Event'] = stringifyEvent(evt);
      }
    }
  });
})();
