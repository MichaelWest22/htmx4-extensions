(function() {
  function dependsOn(pathSpec, url) {
    if (pathSpec === 'ignore') return false;
    var depParts = pathSpec.replace(/\/$/, '').split('/');
    var urlParts = url.split('/');
    for (var i = 0; i < urlParts.length; i++) {
      var dep = depParts.shift();
      if (dep !== urlParts[i] && dep !== '*') return false;
      if (depParts.length === 0 || (depParts.length === 1 && depParts[0] === '')) return true;
    }
    return false;
  }

  function refreshPath(path) {
    for (var elt of htmx.findAll('[path-deps]')) {
      if (dependsOn(elt.getAttribute('path-deps'), path)) {
        htmx.trigger(elt, 'path-deps');
      }
    }
  }

  htmx.registerExtension('path-deps', {
    htmx_after_request: function(elt, detail) {
      var ctx = detail.ctx;
      if (ctx.request.method.toUpperCase() !== 'GET') {
        refreshPath(ctx.request.action);
      }
    }
  });

  window.PathDeps = {
    refresh: refreshPath
  };
})();
