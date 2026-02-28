(function() {
  htmx.registerExtension('restored', {
    init: function() {
      document.addEventListener('htmx:before:restore:history', function() {
        htmx.findAll('[hx-trigger="restored"],[data-hx-trigger="restored"]').forEach(function(el) {
          htmx.trigger(el, 'restored');
        });
      });
    }
  });
})();
