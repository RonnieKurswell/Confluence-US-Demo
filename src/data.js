// Content for the six value pools of the Infosys AI-First Value Framework.
// Order matters: index 0 sits on the right-hand edge of the hexagon and the
// rest run counter-clockwise, matching the framework artwork.

export const BRAND = {
  // Top-left lockup: the Infosys mark, a rule, then this line.
  brandLine: 'Unlock AI value',
  centerTitle: ['UNLOCK', 'AI VALUE'],
  intro: {
    headline: 'Unlock AI value.',
    sub: 'Six value pools, one path to transformation.',
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
  continueCta: 'Explore the framework',

  // Case studies below are invented stand-ins for the 403 client-masked studies
  // Infosys is tagging. Flip to false once real ones are wired in — it drives
  // the "placeholder" badge in the UI so nothing reads as a real client claim.
  casesArePlaceholder: true,

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
    cases: [
      {
        id: 'data-for-ai-1',
        client: 'Global insurer',
        title: 'Claims data unified for model readiness',
        challenge: 'Policy and claims data sat in twelve systems with no shared definitions.',
        action: 'Built an AI-ready data platform with lineage, fingerprinting and synthetic augmentation for sparse claim types.',
        outcome: 'One trusted claims record feeding underwriting and fraud models.',
        metric: { value: '40%', label: 'faster model onboarding' },
      },
      {
        id: 'data-for-ai-2',
        client: 'North American retailer',
        title: 'Unstructured product data made usable',
        challenge: 'Two million product descriptions and images carried no consistent structure.',
        action: 'Applied AI-grade data engineering to extract, normalise and enrich attributes at scale.',
        outcome: 'Search and recommendation models trained on a single catalogue.',
        metric: { value: '3x', label: 'attribute coverage' },
      },
      {
        id: 'data-for-ai-3',
        client: 'European bank',
        title: 'Synthetic data unlocked restricted training',
        challenge: 'Privacy rules blocked the use of real customer records in model development.',
        action: 'Generated statistically faithful synthetic datasets with fingerprinting to prove provenance.',
        outcome: 'Model development continued without exposing customer data.',
        metric: { value: '0', label: 'records exposed' },
      },
    ],
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
    cases: [
      {
        id: 'ai-strategy-engineering-1',
        client: 'Global manufacturer',
        title: 'From ninety pilots to one operating model',
        challenge: 'Business units were each running their own disconnected AI experiments.',
        action: 'Defined a single enterprise AI operating model and stood up shared platform and agent orchestration.',
        outcome: 'One governed route from idea to production for every unit.',
        metric: { value: '90', label: 'pilots consolidated' },
      },
      {
        id: 'ai-strategy-engineering-2',
        client: 'Telecommunications group',
        title: 'Purpose-built infrastructure for scale',
        challenge: 'General-purpose cloud could not carry inference cost or latency targets.',
        action: 'Designed and built dedicated AI infrastructure with workload-aware routing across models.',
        outcome: 'Inference costs brought under control at production volume.',
        metric: { value: '55%', label: 'lower cost per call' },
      },
      {
        id: 'ai-strategy-engineering-3',
        client: 'Energy utility',
        title: 'Agents, platforms and third-party tools in concert',
        challenge: 'Vendor tools and in-house agents could not interoperate or share context.',
        action: 'Built an orchestration layer so agents, proprietary platforms and third-party tools work as one estate.',
        outcome: 'New capability plugs in without a rebuild.',
        metric: { value: '6', label: 'weeks to onboard a tool' },
      },
    ],
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
    cases: [
      {
        id: 'ai-trust-1',
        client: 'Global bank',
        title: 'Agents governed across the lifecycle',
        challenge: 'Agents were reaching production faster than risk assessment could review them.',
        action: 'Embedded risk assessment and policy design into the delivery path rather than after it.',
        outcome: 'Every agent carries an assessment before it ships.',
        metric: { value: '100%', label: 'agents assessed' },
      },
      {
        id: 'ai-trust-2',
        client: 'Pharmaceutical company',
        title: 'Security testing built for agents',
        challenge: 'Conventional application testing did not cover prompt injection or tool misuse.',
        action: 'Established agent-specific red teaming and continuous security testing.',
        outcome: 'Agent-specific failure modes found before release.',
        metric: { value: '200+', label: 'attack paths tested' },
      },
      {
        id: 'ai-trust-3',
        client: 'Telecommunications provider',
        title: 'Regulatory readiness, evidenced',
        challenge: 'New AI regulation demanded evidence the organisation could not produce.',
        action: 'Built governance with traceable evidence from policy through to model behaviour.',
        outcome: 'Audit answered from the system of record.',
        metric: { value: '3', label: 'regimes satisfied' },
      },
    ],
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
    cases: [
      {
        id: 'physical-ai-1',
        client: 'Automotive manufacturer',
        title: 'Line-side quality that acts in real time',
        challenge: 'Defects were detected downstream, after value had already been added.',
        action: 'Embedded edge intelligence at the line to interpret sensor and vision data and act within the cycle.',
        outcome: 'Defects caught at the station that caused them.',
        metric: { value: '28%', label: 'less rework' },
      },
      {
        id: 'physical-ai-2',
        client: 'Industrial equipment maker',
        title: 'Digital twin drives the physical asset',
        challenge: 'Field failures were expensive and impossible to predict from telemetry alone.',
        action: 'Paired a digital twin with on-device intelligence to interpret signals and schedule intervention.',
        outcome: 'Maintenance moved from calendar to condition.',
        metric: { value: '45%', label: 'fewer unplanned stops' },
      },
      {
        id: 'physical-ai-3',
        client: 'Ports operator',
        title: 'Autonomous handling in a live yard',
        challenge: 'Container moves depended on manual coordination in a congested yard.',
        action: 'Combined robotics, edge perception and a live twin of the yard to sequence moves autonomously.',
        outcome: 'Higher throughput on the same footprint.',
        metric: { value: '22%', label: 'more moves per hour' },
      },
    ],
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
    cases: [
      {
        id: 'agentic-legacy-modernization-1',
        client: 'Retail bank',
        title: 'Core platform intent recovered by agents',
        challenge: 'Four decades of core banking code with no reliable documentation.',
        action: 'Agents reverse-engineered the estate to recover business intent before any code was rewritten.',
        outcome: 'Modernisation planned against what the system actually does.',
        metric: { value: '12M', label: 'lines analysed' },
      },
      {
        id: 'agentic-legacy-modernization-2',
        client: 'Public sector agency',
        title: 'Progressive migration, no disruption',
        challenge: 'A big-bang rewrite had already failed once and could not be attempted again.',
        action: 'Modernised progressively behind stable interfaces, with each increment proven in production.',
        outcome: 'No service interruption during the programme.',
        metric: { value: '0', label: 'hours of downtime' },
      },
      {
        id: 'agentic-legacy-modernization-3',
        client: 'Insurance group',
        title: 'Technical debt cut without a rewrite',
        challenge: 'Change requests took months because nobody could safely alter the policy engine.',
        action: 'Used agents to map dependencies and safely decompose the engine into governed services.',
        outcome: 'Change velocity restored without replacing the platform.',
        metric: { value: '60%', label: 'faster change cycle' },
      },
    ],
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
    cases: [
      {
        id: 'process-ai-1',
        client: 'Consumer goods company',
        title: 'Order to cash rebuilt around agents',
        challenge: 'Order exceptions were handled manually across three shared service centres.',
        action: 'Redesigned the end-to-end workflow with domain-aware agents and human review at the decision points.',
        outcome: 'Exceptions resolved in hours rather than days.',
        metric: { value: '70%', label: 'touchless orders' },
      },
      {
        id: 'process-ai-2',
        client: 'Healthcare provider',
        title: 'Prior authorisation with people in the loop',
        challenge: 'Clinical authorisation queues were growing faster than the team could staff them.',
        action: 'Agents prepared and evidenced each case; clinicians kept every approval decision.',
        outcome: 'Clinician time moved from assembly to judgement.',
        metric: { value: '4x', label: 'throughput per reviewer' },
      },
      {
        id: 'process-ai-3',
        client: 'Logistics operator',
        title: 'Exception handling redesigned end to end',
        challenge: 'Freight exceptions were detected late and escalated inconsistently.',
        action: 'Rebuilt the workflow so agents detect, triage and brief a human on the exceptions that matter.',
        outcome: 'Fewer escalations, and earlier ones.',
        metric: { value: '35%', label: 'reduction in delay cost' },
      },
    ],
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
