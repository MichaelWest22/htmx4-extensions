(function() {
  htmx.registerExtension('multi-swap', {
    htmx_before_swap: function(elt, detail) {
      var ctx = detail.ctx;
      if (!ctx.swap?.startsWith('multi:')) return;
      var spec = ctx.swap.replace(/^multi\s*:\s*/, '');

      var tasks = detail.tasks;
      var mainTask = tasks.find(t => t.type === 'main');
      if (!mainTask) return;

      var fragment = mainTask.fragment;
      var newTasks = [];

      spec.split(/\s*,\s*/).forEach(function(part) {
        var split = part.split(/\s*:\s*/);
        var selector = split[0].trim();
        var swapStyle = split[1] || 'innerHTML';

        if (selector.charAt(0) !== '#') {
          console.error("multi-swap: only ID selectors supported, got '" + selector + "'");
          return;
        }

        var newElt = fragment.querySelector(selector);
        var target = document.querySelector(selector);
        if (!newElt || !target) {
          console.warn("multi-swap: selector '" + selector + "' not found.");
          return;
        }

        var taskFragment = document.createDocumentFragment();
        taskFragment.append(newElt.cloneNode(true));

        var isPositional = ['beforebegin','afterbegin','beforeend','afterend'].includes(swapStyle);
        newTasks.push({
          type: 'multi',
          fragment: taskFragment,
          target: selector,
          swapSpec: { style: swapStyle, strip: swapStyle !== 'outerHTML' && swapStyle !== 'delete' },
          sourceElement: mainTask.sourceElement
        });
      });

      // Replace main task with individual tasks
      var idx = tasks.indexOf(mainTask);
      tasks.splice(idx, 1, ...newTasks);
    }
  });
})();
