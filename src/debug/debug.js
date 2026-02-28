(function() {
  function log(elt, detail) {
    console.debug ? console.debug(elt, detail) : console.log('DEBUG:', elt, detail);
  }

  var hooks = {};
  [
    'htmx_before_init', 'htmx_after_init',
    'htmx_before_process', 'htmx_after_process',
    'htmx_before_cleanup', 'htmx_after_cleanup',
    'htmx_config_request', 'htmx_before_request', 'htmx_after_request', 'htmx_finally_request', 'htmx_error',
    'htmx_before_swap', 'htmx_after_swap', 'htmx_before_settle', 'htmx_after_settle',
    'htmx_before_history_update', 'htmx_after_history_update', 'htmx_before_restore_history',
    'htmx_before_sse_reconnect', 'htmx_before_sse_stream', 'htmx_after_sse_stream',
    'htmx_before_sse_message', 'htmx_after_sse_message',
    'htmx_before_viewTransition', 'htmx_after_viewTransition'
  ].forEach(function(name) { hooks[name] = log; });

  htmx.registerExtension('debug', hooks);
})();
