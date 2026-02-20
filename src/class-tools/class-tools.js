(function() {
  function parseClassOperation(value) {
    var split = value.trim().split(/\s+/);
    if (split.length < 2) return null;
    var operation = split[0];
    var classDef = split[1];
    var cssClass, delay;
    if (classDef.indexOf(':') > 0) {
      var parts = classDef.split(':');
      cssClass = parts[0];
      delay = htmx.parseInterval(parts[1]);
    } else {
      cssClass = classDef;
      delay = 100;
    }
    return { operation, cssClass, delay };
  }

  function processClassList(elt, classList) {
    for (var run of classList.split('&')) {
      var currentRunTime = 0;
      for (var value of run.split(',')) {
        var op = parseClassOperation(value);
        if (!op) continue;
        if (op.operation === 'toggle') {
          setTimeout(function(o) {
            setInterval(function() {
              elt.classList.toggle(o.cssClass);
            }, o.delay);
          }.bind(null, op), currentRunTime);
          currentRunTime += op.delay;
        } else {
          currentRunTime += op.delay;
          setTimeout(function(o) {
            elt.classList[o.operation](o.cssClass);
          }.bind(null, op), currentRunTime);
        }
      }
    }
  }

  function maybeProcessClasses(elt) {
    if (!elt.getAttribute) return;
    var classList = elt.getAttribute('classes') || elt.getAttribute('data-classes');
    if (classList) processClassList(elt, classList);
  }

  htmx.registerExtension('class-tools', {
    htmx_after_process: function(elt) {
      maybeProcessClasses(elt);
      if (elt.querySelectorAll) {
        for (var child of elt.querySelectorAll('[classes], [data-classes]')) {
          maybeProcessClasses(child);
        }
        for (var child of elt.querySelectorAll('[apply-parent-classes], [data-apply-parent-classes]')) {
          var classList = child.getAttribute('apply-parent-classes') || child.getAttribute('data-apply-parent-classes');
          var parent = child.parentElement;
          parent.removeChild(child);
          processClassList(parent, classList);
        }
      }
    }
  });
})();
