// model-colors: THE canonical Generality resource for model-provider identity.
// Every figure on the site colors models through this module — one hex per
// provider, one display-name rule, everywhere.
//
// Sources: official brand colors where published (OpenAI green via
// mobbin.com/colors/brand/openai; Anthropic's Claude terracotta; DeepSeek,
// Qwen, Zhipu, MiniMax per lobehub/lobe-icons brand registry). Where a
// provider's official mark is black/white (xAI, Moonshot), we keep black for
// xAI and assign Moonshot a documented substitute for legend separability.

export const providerColors = {
  Anthropic: "#D97757",   // Claude terracotta
  OpenAI:    "#10A37F",   // OpenAI green
  Google:    "#1C69FF",   // Gemini blue
  xAI:       "#1A1919",   // official black
  Qwen:      "#615CED",   // Qwen violet
  DeepSeek:  "#4D6BFE",   // DeepSeek blue
  Moonshot:  "#845EC2",   // substitute (official mark is black)
  Zhipu:     "#3859FF",   // Zhipu blue
  MiniMax:   "#F23F5D",   // MiniMax red
  Meta:      "#1D65C1",   // Meta blue
  Mistral:   "#FA520F",   // Mistral orange
  Other:     "#898781",
};

export function provider(name) {
  const n = String(name).toLowerCase();
  if (/claude|fable|anthropic|sonnet|opus|haiku/.test(n)) return "Anthropic";
  if (/gpt|^o[134]\b|o[134]-|openai|oss/.test(n)) return "OpenAI";
  if (/gemini|gemma|google/.test(n)) return "Google";
  if (/grok|xai/.test(n)) return "xAI";
  if (/qwen/.test(n)) return "Qwen";
  if (/deepseek/.test(n)) return "DeepSeek";
  if (/kimi|moonshot/.test(n)) return "Moonshot";
  if (/glm|zhipu/.test(n)) return "Zhipu";
  if (/minimax/.test(n)) return "MiniMax";
  if (/llama|meta/.test(n)) return "Meta";
  if (/mistral|magistral|devstral/.test(n)) return "Mistral";
  return "Other";
}

// Scale helper: stable domain/range for the providers present in `names`.
export function scaleFor(names) {
  const present = [...new Set(names.map(provider))];
  const domain = Object.keys(providerColors).filter((p) => present.includes(p));
  return { domain, range: domain.map((p) => providerColors[p]) };
}

// Base model key: strips run-config suffixes and date stamps, for dedup.
export function baseKey(name) {
  return String(name)
    .replace(/_(\d+K|max|high|xhigh|medium|low|minimal|none|\d+)$/i, "")
    .replace(/-20\d{6,8}/g, "")
    .replace(/-20\d\d-\d\d-\d\d/g, "")
    .toLowerCase();
}

// Pretty display name: "claude-sonnet-4-5-20250929_59K" -> "Claude Sonnet 4.5"
export function displayName(name) {
  let n = baseKey(name);
  n = n.replace(/(\d)-(\d)/g, "$1.$2");            // 4-5 -> 4.5
  n = n.replace(/[-_]/g, " ").trim();
  const fixes = [
    [/\bgpt\b/g, "GPT"], [/\bglm\b/g, "GLM"], [/\bo([134])\b/g, "o$1"],
    [/\bdeepseek\b/g, "DeepSeek"], [/\bminimax\b/g, "MiniMax"], [/\bxai\b/g, "xAI"],
    [/\boss\b/g, "OSS"], [/\bai\b/g, "AI"],
  ];
  n = n.split(" ").map((w) => /^(gpt|glm|o[134]|deepseek|minimax|xai|oss|ai)$/i.test(w)
    ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  for (const [re, to] of fixes) n = n.replace(re, to);
  n = n.replace(/\bPre.release\b/i, "pre-release").replace(/\bPreview\b/, "Preview");
  return n;
}

// Deduplicate leaderboard rows to one per base model, keeping the row that
// maximises `key` (e.g. best-scoring run configuration).
export function dedupMax(rows, key) {
  const best = new Map();
  for (const r of rows) {
    const k = baseKey(r.model);
    if (!best.has(k) || r[key] > best.get(k)[key]) best.set(k, r);
  }
  return [...best.values()];
}
