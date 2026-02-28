//==========================================================
// attribute.js
//
// Swap style that copies attributes from response to target
//
// Modifiers:
//   add - only add/update attributes (don't remove), adds classes instead of replacing
//   remove - only remove attributes not in response
//==========================================================
(() => {
    htmx.registerExtension('attribute', {
        handle_swap: (style, target, fragment, swapSpec) => {
            if (style === 'attribute') {
                let source = fragment.firstElementChild;
                if (!source) return true;
                
                if (!swapSpec.remove) {
                    for (let attr of source.attributes) {
                        if (attr.name === 'class' && swapSpec.add) {
                            target.classList.add(...source.classList);
                        } else {
                            target.setAttribute(attr.name, attr.value);
                        }
                    }
                }
                
                if (!swapSpec.add) {
                    for (let i = target.attributes.length - 1; i >= 0; i--) {
                        let attr = target.attributes[i];
                        if (!source.hasAttribute(attr.name)) {
                            target.removeAttribute(attr.name);
                        }
                    }
                }
                
                return true;
            }
            return false;
        }
    });
})();
