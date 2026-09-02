/* The framework hexagon.
 *
 * Replaces the three.js board. Six instances of one traced path, rotated 60
 * degrees apart, each showing the same rendered piece of Evelyn's artwork.
 *
 * Three things this buys over six PNGs in divs:
 *   - taps land on the real outline, not on a bounding box, so the transparent
 *     corner of one piece never steals its neighbour's touch;
 *   - the labels stay live text, so copy changes do not need a re-export;
 *   - the whole board is one 37KB image and a 224-byte path.
 *
 * Geometry notes are on the constants below. The numbers were fitted against
 * Evelyn's Figma render rather than derived, because the artwork has rounded
 * corners and deliberate gaps that a clean hexagon solve does not account for.
 */

const NS = 'http://www.w3.org/2000/svg';

/* The traced outline, straight out of Figma. 2555 wide, spanning y 6.76 to
 * 4155.26 and symmetric about y = 2081. The short edge (x = 0) faces the
 * centre of the hexagon; the long edge (x = 2555) is the outer rim. */
const PIECE_PATH =
  'M0 2695.64V1465.9C0 1448.03 9.53903 1431.52 25.0208 1422.59L2480.02 6.76128C2513.35 -12.4625 2555 11.5952 2555 50.0746V4111.95C2555 4150.43 2513.35 4174.49 2480.01 4155.26L25.0144 2738.95C9.53621 2730.02 0 2713.51 0 2695.64Z';

const VB = 1000; // viewBox is square; everything below is in these units
const CX = VB / 2;
const CY = VB / 2;
const MID_Y = 2081; // the path's own axis of symmetry
const P_W = 2555; // path width
const SCALE = 0.10415;

/* The exported piece covers the mask group's box, which is a little taller
 * than the path because it carries the soft edge. Centre it on the same axis. */
const IMG_H = 4235;
const IMG_Y = MID_Y - IMG_H / 2;

/* Spacing. The artwork has a gap on every side of every piece, including at
 * the outer corners, which needs two knobs rather than one:
 *
 *   FIT    where the inner edge sits when the six pieces close up with no gap.
 *          Falls out of the path: the inner edge is 1229.74 long, and an edge
 *          of that length on a regular hexagon sits at 1229.74/2 * sqrt(3)
 *          from the centre.
 *   PUSH   slides each piece out along its own axis. Because neighbours
 *          diverge at 30 degrees this opens a channel of constant width
 *          PUSH/2 between each pair, and widens the centre hole by the same
 *          move.
 *   SHRINK pulls each piece in towards its own centroid, which is what puts
 *          the gap at the outer rim. PUSH alone cannot make that one.
 *
 * Fitted by measuring Evelyn's render and matching two ratios: the centre hole
 * as a share of the width (0.330) and the channel width (0.021). */
const FIT = 1064.9 * SCALE;
const PUSH = 8;
const SHRINK = 0.955;
const GAP = FIT + PUSH; // centre to inner edge

// Centroid of the trapezoid, where the shrink is anchored.
const CENTROID_X = (P_W / 3) * ((2 * 4061.88 + 1229.74) / (1229.74 + 4061.88));

// How far the open pool slides out from the ring. Dormant while the board is
// hidden behind an open pool, but correct if that ever comes back.
const SELECT_PUSH = 30;

const el = (name, attrs = {}, text) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text !== undefined) node.textContent = text;
  return node;
};

/* Index 0 sits on the right and the rest run counter-clockwise, matching both
 * the artwork and the order data.js documents. */
const angleFor = (i) => -60 * i;

const transformFor = (i, push = 0) =>
  `rotate(${angleFor(i)} ${CX} ${CY}) translate(${CX + GAP + push} ${CY})` +
  ` scale(${SCALE}) translate(0 ${-MID_Y})` +
  ` translate(${CENTROID_X} ${MID_Y}) scale(${SHRINK}) translate(${-CENTROID_X} ${-MID_Y})`;

/* Two-line titles. The long ones do not fit across a piece on one line, and
 * breaking them by measure would put the break in a different place for every
 * screen size, so split once here on the nearest space to the middle. */
function titleLines(title) {
  if (title.length <= 16) return [title];
  const mid = title.length / 2;
  let best = -1;
  for (let i = 0; i < title.length; i++) {
    if (title[i] !== ' ') continue;
    if (best < 0 || Math.abs(i - mid) < Math.abs(best - mid)) best = i;
  }
  return best < 0 ? [title] : [title.slice(0, best), title.slice(best + 1)];
}

/**
 * Builds the board into `host`.
 *
 * @param {object}   opts
 * @param {Element}  opts.host      where the board is mounted
 * @param {Array}    opts.pools     POOLS from data.js
 * @param {string}   opts.artUrl    the rendered piece
 * @param {string[]} opts.centre    centre lockup, one entry per line
 * @param {Function} opts.onSelect  called with a pool index, or -1 for "off the board"
 */
export function createBoard({ host, pools, artUrl, centre, onSelect }) {
  const svg = el('svg', {
    class: 'board-svg',
    viewBox: `0 0 ${VB} ${VB}`,
    'aria-label': 'AI-First Value Framework',
  });

  const defs = el('defs');
  /* The piece export carries a white background rather than alpha, so the
   * artwork has to be clipped back to the traced outline or the white shows
   * through as wedges between the pieces. */
  const clip = el('clipPath', { id: 'hexPieceClip' });
  clip.appendChild(el('use', { href: '#hexPiece' }));
  defs.appendChild(clip);
  defs.appendChild(el('path', { id: 'hexPiece', d: PIECE_PATH }));
  svg.appendChild(defs);

  const group = el('g', { class: 'board-pieces' });
  svg.appendChild(group);

  const nodes = pools.map((pool, i) => {
    const piece = el('g', {
      class: 'board-piece',
      'data-index': String(i),
      tabindex: '0',
      role: 'button',
      'aria-label': pool.title,
    });

    const body = el('g', { class: 'board-body', transform: transformFor(i) });

    /* Artwork. Flipped horizontally because Figma drew the piece with its
     * short edge on the right, the opposite way round to the path. */
    const art = el('g', { class: 'board-art', 'clip-path': 'url(#hexPieceClip)' });
    art.appendChild(
      el('image', {
        href: artUrl,
        x: 0,
        y: IMG_Y,
        width: P_W,
        height: IMG_H,
        preserveAspectRatio: 'none',
        transform: `translate(${P_W} 0) scale(-1 1)`,
      })
    );
    body.appendChild(art);

    /* Labels sit in the piece's own space, so they ride every transform. Text
     * runs perpendicular to the radial axis, but on the pieces past the
     * vertical that lands it upside down, so work out where the type ends up
     * on screen and turn it back. Same problem the three.js board solved with
     * labelFlip. */
    const norm = (d) => (((d + 180) % 360) + 360) % 360 - 180;
    const rot = Math.abs(norm(angleFor(i) - 90)) > 90 ? 90 : -90;

    const labels = el('g', { class: 'board-labels' });
    const lines = titleLines(pool.title);
    const titleX = 1880;
    const verbX = 780;
    const size = lines.length > 1 ? 200 : 235;
    lines.forEach((line, k) => {
      labels.appendChild(
        el(
          'text',
          {
            class: 'board-title',
            x: titleX,
            y: MID_Y + (k - (lines.length - 1) / 2) * 250,
            'font-size': size,
            transform: `rotate(${rot} ${titleX} ${MID_Y})`,
          },
          line
        )
      );
    });
    labels.appendChild(
      el(
        'text',
        {
          class: 'board-verb',
          x: verbX,
          y: MID_Y,
          'font-size': 118,
          transform: `rotate(${rot} ${verbX} ${MID_Y})`,
        },
        pool.verb
      )
    );
    body.appendChild(labels);

    /* The hit shape goes last so it sits over the artwork it belongs to. It is
     * the traced path, invisible but clickable, which is the whole reason this
     * is an SVG rather than six images. */
    body.appendChild(el('use', { href: '#hexPiece', class: 'board-hit' }));

    piece.appendChild(body);
    group.appendChild(piece);
    return { piece, body };
  });

  // Centre lockup, one text node per line so the break is deliberate.
  centre.forEach((line, k) => {
    svg.appendChild(
      el(
        'text',
        {
          class: 'board-centre',
          x: CX,
          y: CY - 8 + k * 42,
          'font-size': 40,
        },
        line
      )
    );
  });

  host.appendChild(svg);

  /* State ------------------------------------------------------------- */
  let selected = -1;
  let attract = -1;

  const paint = () => {
    nodes.forEach(({ piece, body }, i) => {
      const on = i === selected;
      piece.classList.toggle('is-selected', on);
      piece.classList.toggle('is-attract', i === attract && selected < 0);
      body.setAttribute('transform', transformFor(i, on ? SELECT_PUSH : 0));
    });
    svg.classList.toggle('has-selection', selected >= 0);
  };

  nodes.forEach(({ piece }, i) => {
    piece.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      onSelect(i);
    });
  });

  /* One handler on the svg rather than six, so a tap that lands in a channel
   * between pieces reads as "off the board" and closes the pool, matching what
   * tapping the background used to do on the three.js version. */
  svg.addEventListener('click', (e) => {
    const piece = e.target.closest ? e.target.closest('.board-piece') : null;
    onSelect(piece ? Number(piece.dataset.index) : -1);
  });

  return {
    node: svg,
    setSelected(i) {
      selected = i;
      paint();
    },
    setAttract(i) {
      attract = i;
      paint();
    },
  };
}
