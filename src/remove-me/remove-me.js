(function() {
  function maybeRemoveMe(elt) {
    var timing = elt.getAttribute('remove-me') || elt.getAttribute('data-remove-me');
    if (timing) {
      setTimeout(function() { elt.remove(); }, htmx.parseInterval(timing));
    }
  }

  htmx.registerExtension('remove-me', {
    htmx_after_process: function(elt) {
      maybeRemoveMe(elt);
      for (var child of elt.querySelectorAll('[remove-me], [data-remove-me]')) {
        maybeRemoveMe(child);
      }
    }
  });
})();
