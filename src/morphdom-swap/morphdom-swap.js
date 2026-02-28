(function() {
  htmx.registerExtension('morphdom-swap', {
    handle_swap: function(swapStyle, target, fragment) {
      if (swapStyle !== 'morphdom') return false;
      morphdom(target, fragment.firstElementChild || fragment.firstChild);
      return [target];
    }
  });
})();
