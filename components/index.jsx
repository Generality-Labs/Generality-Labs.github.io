// House React components for posts, compiled by `make react` into the
// committed static module /assets/gl-react.js (react + react-dom bundled in,
// so the artifact is self-contained).
//
// Two ways to use a component in a post:
//
//   1. Shortcode, for static props — plain markdown, no OJS cell:
//        {{< react HelloWorld start=3 >}}
//      (the _extensions/react shortcode emits a placeholder div and injects
//      this bundle; `automount` below hydrates every placeholder on load)
//
//   2. OJS, for props driven by reactive cells:
//        glr = import("/assets/gl-react.js")
//        glr.mount(glr.HelloWorld, { start: someOjsValue })
//
// New components: create the .jsx here, export it from this file AND add it
// to `components` below (that map is what the shortcode resolves against),
// then `make react`.
import { createElement, Fragment } from "react";
import { createRoot } from "react-dom/client";

// Used by the ```jsx fence filter (_extensions/react/jsx.lua): cells are
// compiled with --jsx-factory=glr.createElement / --jsx-fragment=glr.Fragment
// and rendered into their placeholder via renderInto.
export { createElement, Fragment };
export function renderInto(node, element) {
  createRoot(node).render(element);
}

import { ArrowDemo } from "./ArrowDemo.jsx";
import { HelloWorld } from "./HelloWorld.jsx";

export { ArrowDemo, HelloWorld };

/** Everything reachable from the {{< react … >}} shortcode. */
export const components = { ArrowDemo, HelloWorld };

/** Render a component into a fresh detached <div> and return it — the shape
    OJS cells expect (a cell whose value is an HTMLElement displays itself). */
export function mount(Component, props = {}) {
  const node = document.createElement("div");
  createRoot(node).render(createElement(Component, props));
  return node;
}

/* ------------------------------------------------------------- automount */

// Shortcode props arrive as strings; make `start=3`, `flag=true`,
// `items=[1,2]` typed, leave anything unparsable as the raw string.
const coerce = (v) => {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

const fail = (node, msg) => {
  node.style.cssText =
    'font: 12.5px "Geist Mono", monospace; color: #b4443c; ' +
    "border: 1px dashed #b4443c; border-radius: 8px; padding: .6rem .8rem;";
  node.textContent = `[gl-react] ${msg}`;
  console.warn(`[gl-react] ${msg}`);
};

/** Hydrate every {{< react … >}} placeholder under `root` (idempotent). */
export function automount(root = document) {
  for (const node of root.querySelectorAll(
    "[data-gl-react]:not([data-gl-mounted])",
  )) {
    node.setAttribute("data-gl-mounted", "");
    const name = node.getAttribute("data-gl-react");
    const Component = components[name];
    if (!Component) {
      fail(
        node,
        `unknown component "${name}" — available: ${Object.keys(components).join(", ")}`,
      );
      continue;
    }
    let props = {};
    try {
      const raw = JSON.parse(node.getAttribute("data-props") || "{}");
      for (const k of Object.keys(raw)) props[k] = coerce(raw[k]);
    } catch (e) {
      fail(node, `bad props for "${name}": ${e.message}`);
      continue;
    }
    createRoot(node).render(createElement(Component, props));
  }
}

// Hydrate on load (and leave `automount` exported for anything that adds
// placeholders later). Guarded so the module also imports cleanly in Node.
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => automount(), {
      once: true,
    });
  } else {
    automount();
  }
}
