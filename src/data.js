// Content for the six value pools of the Infosys AI-First Value Framework.
// Order matters: index 0 sits on the right-hand edge of the hexagon and the
// rest run counter-clockwise, matching the framework artwork.

export const BRAND = {
  eyebrow: 'Infosys Topaz™ · AI-First Value Framework',
  event: 'Confluence US 2026',
  centerTitle: ['UNLOCK', 'AI VALUE'],
  intro: {
    headline: 'Unlock AI value.',
    sub: 'Six interconnected value pools. One disciplined path from experimentation to enterprise scale.',
    cta: 'Begin',
  },
  // Fact labels are capped at two lines in the layout — keep them short.
  facts: [
    { value: '$300–400B', label: 'AI-first services opportunity by 2030' },
    { value: '90%', label: 'of our top 200 clients on an AI journey' },
    { value: '6', label: 'interconnected value pools, one path' },
  ],
  // One entry per line — the break is deliberate, not left to the measure.
  headline: ['Six value pools.', 'Deeply interconnected.'],
  subhead: 'Beyond experimentation, into scale.',

  guidebook: {
    cta: 'Download the guidebook',
    title: 'Take it with you',
    sub: 'Scan to get the AI-First Value Framework guidebook sent to your inbox.',
    // ---------------------------------------------------------------------
    // TODO: replace with the real Infosys lead-capture landing page. This is
    // the ONLY line that needs changing — the QR re-encodes automatically.
    // ---------------------------------------------------------------------
    url: 'https://www.infosys.com/navigate-your-next/unlock-ai-value.html',
    isPlaceholder: true,
    footnote: 'Or visit infosys.com/unlock-ai-value',
  },
};

export const POOLS = [
  {
    id: 'data-for-ai',
    verb: 'INSIGHT',
    title: 'Data for AI',
    hook: 'Raw data becomes a trusted, model-ready asset.',
    bullets: [
      'AI-ready data platforms',
      'Fingerprinting & synthetic data',
      'Real-time, predictive decisions',
    ],
    proof: 'Structured and unstructured data, made model-ready.',
    accent: 0x35d0f5,
    viz: 'lattice',
  },
  {
    id: 'ai-strategy-engineering',
    verb: 'ORCHESTRATE',
    title: 'AI Strategy & Engineering',
    hook: 'One AI operating model, not a hundred pilots.',
    bullets: [
      'Agents, platforms & tools in concert',
      'Purpose-built AI infrastructure',
      'Architecture tailored to the business',
    ],
    proof: 'Past experimentation, into an enterprise operating model.',
    accent: 0x4f9dff,
    viz: 'orbit',
  },
  {
    id: 'ai-trust',
    verb: 'ASSURE',
    title: 'AI Trust',
    hook: 'Responsible, secure AI across the lifecycle.',
    bullets: [
      'Risk assessment & policy design',
      'Security testing for agents',
      'Governance that meets regulation',
    ],
    proof: 'Responsible, secure and ethical AI, by construction.',
    accent: 0x7ee0c0,
    viz: 'shield',
  },
  {
    id: 'physical-ai',
    verb: 'INNOVATE',
    title: 'Physical AI',
    hook: 'Digital meets physical, acting in real time.',
    bullets: [
      'Sensor signal to real-world action',
      'Digital twins, robotics, autonomy',
      'Edge intelligence inside products',
    ],
    proof: 'Reimagined products where digital and physical converge.',
    accent: 0xffb454,
    viz: 'pulse',
  },
  {
    id: 'agentic-legacy-modernization',
    verb: 'MODERNIZE',
    title: 'Agentic Legacy Modernization',
    hook: 'Agents read your legacy estate and rebuild it.',
    bullets: [
      'Reverse-engineer legacy systems',
      'Progressive, zero-disruption change',
      'Less technical debt, more agility',
    ],
    proof: 'Modernize without a big-bang rewrite.',
    accent: 0xb08bff,
    viz: 'rebuild',
  },
  {
    id: 'process-ai',
    verb: 'TRANSFORM',
    title: 'Process AI',
    hook: 'Workflows redesigned around agents and people.',
    bullets: [
      'Domain-aware agents',
      'Human expertise in the loop',
      'Step-change in efficiency & experience',
    ],
    proof: 'Business outcomes across every function and industry.',
    accent: 0xff7ab0,
    viz: 'flow',
  },
];

// Shared palette, tuned against the framework artwork.
export const PALETTE = {
  outer: 0x1e9cd7,
  outerDim: 0x0d4f70,
  inner: 0x1b2a63,
  innerDim: 0x111a3d,
  core: 0x0c1330,
  bg: 0x04060e,
  edge: 0x6fe4ff,
};
