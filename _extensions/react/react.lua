-- {{< react ComponentName prop=value … >}}
--
-- Emits a mount placeholder that assets/gl-react.js (built by `make react`)
-- hydrates on load: the automount scan in components/index.jsx looks up
-- ComponentName among the bundle's exports and renders it with the given
-- props. Prop values are passed as strings and coerced JS-side (JSON.parse
-- per value, falling back to string), so `start=3`, `flag=true`, and
-- `items=[1,2]` all arrive typed.
--
-- The bundle <script> is injected into the page header once, only for
-- documents that actually use the shortcode. Props that must react to OJS
-- values can't go through a static shortcode — use the OJS path instead:
--   glr = import("/assets/gl-react.js")
--   glr.mount(glr.Component, { value: someOjsCell })

local function attr_escape(s)
  s = s:gsub("&", "&amp;"):gsub('"', "&quot;"):gsub("<", "&lt;")
  return s
end

local injected = false

return {
  ["react"] = function(args, kwargs, meta, raw_args, context)
    if not quarto.doc.is_format("html") then
      return pandoc.Null()
    end

    local name = pandoc.utils.stringify(args[1] or "")
    if name == "" then
      quarto.log.warning("{{< react >}}: missing component name")
      return pandoc.RawBlock("html", "<!-- react shortcode: missing component name -->")
    end

    local props = {}
    for k, v in pairs(kwargs) do
      props[k] = pandoc.utils.stringify(v)
    end
    local json = quarto.json.encode(props)
    -- quarto.json encodes {} as [] for empty tables; normalise
    if json == "[]" then json = "{}" end

    if not injected then
      injected = true
      quarto.doc.include_text(
        "in-header",
        '<script type="module" src="/assets/gl-react.js"></script>'
      )
    end

    local html = string.format(
      '<div class="gl-react-mount" data-gl-react="%s" data-props="%s"></div>',
      attr_escape(name),
      attr_escape(json)
    )
    if context == "inline" then
      return pandoc.RawInline("html", html)
    end
    return pandoc.RawBlock("html", html)
  end,
}
