(function() {
  var api;
  var attrPrefix = 'hx-target-';

  function getRespCodeTarget(elt, status) {
    if (!elt || !status) return null;
    var s = status.toString();
    var candidates = [
      s,
      s.slice(0, 2) + '*', s.slice(0, 2) + 'x',
      s[0] + '*',          s[0] + 'x',
      s[0] + '**',         s[0] + 'xx',
      '*', 'x', '***', 'xxx'
    ];
    if (s[0] === '4' || s[0] === '5') candidates.push('error');

    for (var i = 0; i < candidates.length; i++) {
      var val = api.attributeValue(elt, attrPrefix + candidates[i]);
      if (val) {
        return val === 'this' ? elt.closest('[' + attrPrefix + candidates[i] + ']') : htmx.find(elt, val);
      }
    }
    return null;
  }

  htmx.registerExtension('response-targets', {
    init: function(internalAPI) {
      api = internalAPI;
      htmx.config.responseTargetUnsetsError          ??= true;
      htmx.config.responseTargetSetsError            ??= false;
      htmx.config.responseTargetPrefersExisting      ??= false;
      htmx.config.responseTargetPrefersRetargetHeader ??= true;
    },

    htmx_after_request: function(elt, detail) {
      var ctx = detail.ctx;
      var status = ctx.response?.status;
      if (!status || status === 200) return;

      if (htmx.config.responseTargetPrefersRetargetHeader && ctx.hx?.retarget) return;
      if (htmx.config.responseTargetPrefersExisting && ctx.target) return;

      var target = getRespCodeTarget(ctx.sourceElement, status);
      if (target) {
        ctx._responseTarget = target;
        htmx.config.noSwap = (htmx.config.noSwap || []).filter(function(c) { return c != status; });
      }
    },

    htmx_before_swap: function(elt, detail) {
      var ctx = detail.ctx;
      if (!ctx._responseTarget) return;
      var mainTask = detail.tasks.find(function(t) { return t.type === 'main'; });
      if (mainTask) {
        mainTask.target = ctx._responseTarget;
      }
    }
  });
})();
