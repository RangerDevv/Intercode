
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.19.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.19.1 */

    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let h10;
    	let t0;
    	let span;
    	let t2;
    	let main;
    	let div0;
    	let h11;
    	let t4;
    	let textarea0;
    	let t5;
    	let button;
    	let t7;
    	let div1;
    	let h12;
    	let t9;
    	let textarea1;
    	let t10;
    	let input;
    	let dispose;

    	const block = {
    		c: function create() {
    			h10 = element("h1");
    			t0 = text("Debu");
    			span = element("span");
    			span.textContent = "gPT";
    			t2 = space();
    			main = element("main");
    			div0 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Input";
    			t4 = space();
    			textarea0 = element("textarea");
    			t5 = space();
    			button = element("button");
    			button.textContent = "Submit";
    			t7 = space();
    			div1 = element("div");
    			h12 = element("h1");
    			h12.textContent = "AI Suggestions";
    			t9 = space();
    			textarea1 = element("textarea");
    			t10 = space();
    			input = element("input");
    			set_style(span, "color", "lime");
    			attr_dev(span, "class", "svelte-10hw021");
    			add_location(span, file, 26, 50, 801);
    			set_style(h10, "text-align", "center");
    			set_style(h10, "color", "white");
    			attr_dev(h10, "class", "svelte-10hw021");
    			add_location(h10, file, 26, 0, 751);
    			attr_dev(h11, "class", "svelte-10hw021");
    			add_location(h11, file, 30, 0, 1078);
    			attr_dev(textarea0, "placeholder", "Enter your code here");
    			attr_dev(textarea0, "class", "svelte-10hw021");
    			add_location(textarea0, file, 32, 0, 1157);
    			attr_dev(button, "class", "svelte-10hw021");
    			add_location(button, file, 35, 0, 1281);
    			set_style(div0, "display", "flex");
    			set_style(div0, "flex-direction", "column");
    			set_style(div0, "align-items", "center");
    			set_style(div0, "justify-content", "center");
    			set_style(div0, "margin-right", "4px");
    			attr_dev(div0, "class", "svelte-10hw021");
    			add_location(div0, file, 29, 0, 959);
    			attr_dev(h12, "class", "svelte-10hw021");
    			add_location(h12, file, 39, 0, 1441);
    			attr_dev(textarea1, "placeholder", "Output");
    			set_style(textarea1, "width", "30rem");
    			set_style(textarea1, "height", "60vh");
    			set_style(textarea1, "background-color", "rgb(31, 30, 30)");
    			set_style(textarea1, "color", "white");
    			set_style(textarea1, "outline-color", "white");
    			set_style(textarea1, "border", "0.5px solid white");
    			set_style(textarea1, "padding", "10px");
    			set_style(textarea1, "border-radius", "10px");
    			attr_dev(textarea1, "class", "svelte-10hw021");
    			add_location(textarea1, file, 41, 0, 1518);
    			set_style(div1, "display", "flex");
    			set_style(div1, "flex-direction", "column");
    			set_style(div1, "align-items", "center");
    			set_style(div1, "justify-content", "center");
    			attr_dev(div1, "class", "svelte-10hw021");
    			add_location(div1, file, 38, 0, 1341);
    			set_style(main, "display", "flex");
    			set_style(main, "flex-direction", "row");
    			set_style(main, "align-items", "center");
    			set_style(main, "justify-content", "center");
    			set_style(main, "row-gap", "2px");
    			attr_dev(main, "class", "svelte-10hw021");
    			add_location(main, file, 28, 0, 847);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Enter your API key here");
    			set_style(input, "width", "30rem");
    			set_style(input, "height", "2rem");
    			set_style(input, "background-color", "rgb(31, 30, 30)");
    			set_style(input, "color", "white");
    			set_style(input, "outline-color", "white");
    			set_style(input, "border", "0.5px solid white");
    			set_style(input, "padding", "10px");
    			set_style(input, "border-radius", "10px");
    			set_style(input, "margin-left", "4px");
    			attr_dev(input, "class", "svelte-10hw021");
    			add_location(input, file, 46, 0, 1773);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h10, anchor);
    			append_dev(h10, t0);
    			append_dev(h10, span);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(div0, h11);
    			append_dev(div0, t4);
    			append_dev(div0, textarea0);
    			set_input_value(textarea0, /*code*/ ctx[0]);
    			append_dev(div0, t5);
    			append_dev(div0, button);
    			append_dev(main, t7);
    			append_dev(main, div1);
    			append_dev(div1, h12);
    			append_dev(div1, t9);
    			append_dev(div1, textarea1);
    			set_input_value(textarea1, /*output*/ ctx[2]);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*key*/ ctx[1]);

    			dispose = [
    				listen_dev(textarea0, "input", /*textarea0_input_handler*/ ctx[4]),
    				listen_dev(button, "click", /*getSuggestion*/ ctx[3], false, false, false),
    				listen_dev(textarea1, "input", /*textarea1_input_handler*/ ctx[5]),
    				listen_dev(input, "input", /*input_input_handler*/ ctx[6])
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*code*/ 1) {
    				set_input_value(textarea0, /*code*/ ctx[0]);
    			}

    			if (dirty & /*output*/ 4) {
    				set_input_value(textarea1, /*output*/ ctx[2]);
    			}

    			if (dirty & /*key*/ 2 && input.value !== /*key*/ ctx[1]) {
    				set_input_value(input, /*key*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h10);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(main);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(input);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let code = "";
    	let key = "";
    	let output = "";

    	async function getSuggestion() {
    		const response = await fetch("https://api.openai.com/v1/engines/text-davinci-003/completions", {
    			method: "POST",
    			headers: {
    				"Content-Type": "application/json",
    				"Authorization": "Bearer " + key
    			},
    			body: JSON.stringify({
    				prompt: "detect common programming mistakes and provide suggestions for code optimization for the following code and fix any errors: " + code + " write it normally without any comments",
    				max_tokens: 2000,
    				temperature: 0.9,
    				top_p: 1
    			})
    		});

    		const data = await response.json();
    		$$invalidate(2, output = data.choices[0].text);
    	}

    	function textarea0_input_handler() {
    		code = this.value;
    		$$invalidate(0, code);
    	}

    	function textarea1_input_handler() {
    		output = this.value;
    		$$invalidate(2, output);
    	}

    	function input_input_handler() {
    		key = this.value;
    		$$invalidate(1, key);
    	}

    	$$self.$capture_state = () => ({
    		code,
    		key,
    		output,
    		getSuggestion,
    		fetch,
    		JSON
    	});

    	$$self.$inject_state = $$props => {
    		if ("code" in $$props) $$invalidate(0, code = $$props.code);
    		if ("key" in $$props) $$invalidate(1, key = $$props.key);
    		if ("output" in $$props) $$invalidate(2, output = $$props.output);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		code,
    		key,
    		output,
    		getSuggestion,
    		textarea0_input_handler,
    		textarea1_input_handler,
    		input_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
