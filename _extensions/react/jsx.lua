-- ```jsx fences: real JSX in post markdown.
--
--   ```jsx
--   <ArrowDemo items={["arrows", "JSX"]} />
--   ```
--
-- At render time the cell is compiled by the repo's own esbuild
-- (node_modules/.bin/esbuild — present because `make render` depends on the
-- react target) with --jsx-factory=glr.createElement, and replaced by a
-- placeholder div plus a module script that imports /assets/gl-react.js and
-- renders the compiled element. No OJS involvement, no runtime compiler.
--
-- v1 contract: a cell is ONE JSX expression. Capitalised tags are resolved
-- from the bundle's `components` registry; lowercase tags are intrinsic
-- HTML. For reactive props driven by OJS values, use glr.mount() in an
-- {ojs} cell instead.

local counter = 0

local function esbuild(code)
  local bin = quarto.project.directory .. "/node_modules/.bin/esbuild"
  local ok, out = pcall(pandoc.pipe, bin, {
    "--loader=jsx",
    "--jsx=transform",
    "--jsx-factory=glr.createElement",
    "--jsx-fragment=glr.Fragment",
  }, code)
  return ok, out
end

local function error_box(msg)
  return string.format(
    '<div style="font: 12.5px monospace; color: #b4443c; border: 1px dashed #b4443c;'
      .. ' border-radius: 8px; padding: .6rem .8rem; white-space: pre-wrap;">'
      .. "[jsx cell] compile failed:\n%s</div>",
    msg:gsub("&", "&amp;"):gsub("<", "&lt;")
  )
end

function CodeBlock(el)
  if not el.classes:includes("jsx") then
    return nil
  end
  if not quarto.doc.is_format("html") then
    return pandoc.Null()
  end

  -- Compile `__jsx_cell__ = ( <cell> )` so the JSX arrives as an assignment
  -- expression we can hand to renderInto.
  local ok, compiled = esbuild("__jsx_cell__ = (\n" .. el.text .. "\n)")
  if not ok then
    return pandoc.RawBlock("html", error_box(tostring(compiled)))
  end

  -- Capitalised JSX tags come from the bundle's component registry.
  local names, seen = {}, {}
  for name in el.text:gmatch("<%s*([A-Z][%w]*)") do
    if not seen[name] then
      seen[name] = true
      names[#names + 1] = name
    end
  end
  local destructure = ""
  if #names > 0 then
    destructure = "const { " .. table.concat(names, ", ") .. " } = glr.components;\n"
  end

  counter = counter + 1
  local id = "gl-jsx-" .. counter
  local script = string.format(
    '<div id="%s"></div>\n<script type="module">\n'
      .. 'import * as glr from "/assets/gl-react.js";\n'
      .. "%slet __jsx_cell__;\n%s"
      .. 'glr.renderInto(document.getElementById("%s"), __jsx_cell__);\n'
      .. "</script>",
    id,
    destructure,
    compiled,
    id
  )
  return pandoc.RawBlock("html", script)
end
