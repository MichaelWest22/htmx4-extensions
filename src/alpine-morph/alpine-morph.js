(function() {
  htmx.registerExtension('alpine-morph', {
    handle_swap: function(swapStyle, target, fragment) {
      if (swapStyle !== 'morph') return false;

      Alpine.morph(target, fragment.firstElementChild);
      return [target];
    }
  });
})();
