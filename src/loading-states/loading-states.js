(function() {
  const undoQueue = [];

  function loadingStateContainer(elt) {
    return elt.closest('[data-loading-states]') || document.body;
  }

  function matchesPath(elt, requestPath) {
    const pathElt = elt.closest('[data-loading-path]');
    if (!pathElt) return true;
    const expected = pathElt.getAttribute('data-loading-path');
    try {
      const url = new URL(requestPath, location.href);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        requestPath = url.pathname;
      }
    } catch(e) {}
    return requestPath === expected || requestPath.endsWith(expected);
  }

  function getTargets(elt) {
    const selector = elt.getAttribute('data-loading-target');
    return selector ? Array.from(document.querySelectorAll(selector)) : [elt];
  }

  function queue(sourceElt, targetElt, doFn, undoFn) {
    const delayElt = sourceElt.closest('[data-loading-delay]');
    if (delayElt) {
      const delay = htmx.parseInterval(delayElt.getAttribute('data-loading-delay')) || 200;
      let fired = false;
      const timeout = setTimeout(() => {
        fired = true;
        doFn();
      }, delay);
      undoQueue.push(() => {
        if (!fired) {
          clearTimeout(timeout);
        } else if (document.body.contains(targetElt)) {
          undoFn();
        }
      });
    } else {
      doFn();
      undoQueue.push(() => { if (document.body.contains(targetElt)) undoFn(); });
    }
  }

  function getElts(container, attr, path) {
    return Array.from(container.querySelectorAll('[' + attr + ']')).filter(e => matchesPath(e, path));
  }

  htmx.registerExtension('loading-states', {
    htmx_before_request: function(elt, detail) {
      const container = loadingStateContainer(elt);
      const path = detail.ctx.request.action;

      getElts(container, 'data-loading', path).forEach(src => {
        getTargets(src).forEach(tgt => queue(src, tgt,
          () => { tgt.style.display = src.getAttribute('data-loading') || 'inline-block'; },
          () => { tgt.style.display = 'none'; }
        ));
      });

      getElts(container, 'data-loading-class', path).forEach(src => {
        const classes = src.getAttribute('data-loading-class').split(' ');
        getTargets(src).forEach(tgt => queue(src, tgt,
          () => classes.forEach(c => tgt.classList.add(c)),
          () => classes.forEach(c => tgt.classList.remove(c))
        ));
      });

      getElts(container, 'data-loading-class-remove', path).forEach(src => {
        const classes = src.getAttribute('data-loading-class-remove').split(' ');
        getTargets(src).forEach(tgt => queue(src, tgt,
          () => classes.forEach(c => tgt.classList.remove(c)),
          () => classes.forEach(c => tgt.classList.add(c))
        ));
      });

      getElts(container, 'data-loading-disable', path).forEach(src => {
        getTargets(src).forEach(tgt => queue(src, tgt,
          () => { tgt.disabled = true; },
          () => { tgt.disabled = false; }
        ));
      });

      getElts(container, 'data-loading-aria-busy', path).forEach(src => {
        getTargets(src).forEach(tgt => queue(src, tgt,
          () => tgt.setAttribute('aria-busy', 'true'),
          () => tgt.removeAttribute('aria-busy')
        ));
      });
    },

    htmx_before_swap: function() {
      while (undoQueue.length > 0) undoQueue.shift()();
    }
  });
})();
