(function() {
  htmx.registerExtension('client-side-templates', {
    htmx_after_request: function(elt, detail) {
      var ctx = detail.ctx;
      var text = ctx.text;
      if (!text) return;

      var mustacheTemplate = elt.closest('[mustache-template]');
      if (mustacheTemplate) {
        var tmpl = document.getElementById(mustacheTemplate.getAttribute('mustache-template'));
        if (!tmpl) throw new Error('Unknown mustache template: ' + mustacheTemplate.getAttribute('mustache-template'));
        ctx.text = Mustache.render(tmpl.innerHTML, JSON.parse(text));
        return;
      }

      var mustacheArrayTemplate = elt.closest('[mustache-array-template]');
      if (mustacheArrayTemplate) {
        var tmpl = document.getElementById(mustacheArrayTemplate.getAttribute('mustache-array-template'));
        if (!tmpl) throw new Error('Unknown mustache template: ' + mustacheArrayTemplate.getAttribute('mustache-array-template'));
        ctx.text = Mustache.render(tmpl.innerHTML, { data: JSON.parse(text) });
        return;
      }

      var handlebarsTemplate = elt.closest('[handlebars-template]');
      if (handlebarsTemplate) {
        var tmpl = document.getElementById(handlebarsTemplate.getAttribute('handlebars-template'));
        if (!tmpl) throw new Error('Unknown handlebars template: ' + handlebarsTemplate.getAttribute('handlebars-template'));
        ctx.text = Handlebars.compile(tmpl.innerHTML)(JSON.parse(text));
        return;
      }

      var handlebarsArrayTemplate = elt.closest('[handlebars-array-template]');
      if (handlebarsArrayTemplate) {
        var tmpl = document.getElementById(handlebarsArrayTemplate.getAttribute('handlebars-array-template'));
        if (!tmpl) throw new Error('Unknown handlebars template: ' + handlebarsArrayTemplate.getAttribute('handlebars-array-template'));
        ctx.text = Handlebars.compile(tmpl.innerHTML)(JSON.parse(text));
        return;
      }

      var nunjucksTemplate = elt.closest('[nunjucks-template]');
      if (nunjucksTemplate) {
        var templateName = nunjucksTemplate.getAttribute('nunjucks-template');
        var tmpl = document.getElementById(templateName);
        ctx.text = tmpl
          ? nunjucks.renderString(tmpl.innerHTML, JSON.parse(text))
          : nunjucks.render(templateName, JSON.parse(text));
        return;
      }

      var nunjucksArrayTemplate = elt.closest('[nunjucks-array-template]');
      if (nunjucksArrayTemplate) {
        var templateName = nunjucksArrayTemplate.getAttribute('nunjucks-array-template');
        var tmpl = document.getElementById(templateName);
        ctx.text = tmpl
          ? nunjucks.renderString(tmpl.innerHTML, { data: JSON.parse(text) })
          : nunjucks.render(templateName, { data: JSON.parse(text) });
        return;
      }

      var xsltTemplate = elt.closest('[xslt-template]');
      if (xsltTemplate) {
        var tmpl = document.getElementById(xsltTemplate.getAttribute('xslt-template'));
        if (!tmpl) throw new Error('Unknown XSLT template: ' + xsltTemplate.getAttribute('xslt-template'));
        var content = tmpl.innerHTML
          ? new DOMParser().parseFromString(tmpl.innerHTML, 'application/xml')
          : tmpl.contentDocument;
        var processor = new XSLTProcessor();
        processor.importStylesheet(content);
        var frag = processor.transformToFragment(new DOMParser().parseFromString(text, 'application/xml'), document);
        ctx.text = new XMLSerializer().serializeToString(frag);
      }
    }
  });
})();
