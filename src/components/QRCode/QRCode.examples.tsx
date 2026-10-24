import { useEffect, useRef, useState } from 'react';
import { Button } from '../Button/Button';
import { Field } from '../Field/Field';
import { InputText } from '../InputText/InputText';
import { Section } from '../Section/Section';
import { StatCard } from '../StatCard/StatCard';
import { StatGroup } from '../StatGroup/StatGroup';
import { QRCode, type QRCodeHandle, type QRCodeProps } from './QRCode';

/** A 64x64 PNG mark, inlined so the logo examples (and exports) are fully self-contained. */
const MARK =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAChklEQVR4nO2UO2sUURSAj+0u5icYrRTsFC0ECwnEQgRf2ChiY2ECWsRHoVZq4SOFQmJhI6KN+GosDAQLO0U7QSsfPyGy2+r5is1jyc7cO3PPHcicD3bmTiDL3u98dzaNH973T1qMC3ABLsAFuAC9txYX4AJcgAtwAXpvLS6gSQETu/fqVWTxyye9NkNjAsY6XXk/O68rkYMzU7LU7+kqP40JeHjxypoCLjy4q6v8NCKAjSNgNQhARG6yCxikP9bt6tMKS71eI0chuwAmTwHrQQGUkJOsAtg4AopAACJykU3AqPSHyX0Usglg8hQQAgVQQg6yCGDjCIgBAYiwxlxAaPrD5DoK5gKYPAVUgQIowRJTAWwcAXVAACKsMBNQNf1hrI+CmQAmTwEpoABKsMBEABtHQEoQgIjUJBeQKv1hrI5CcgFMngIsoABKSElSAWwcAZYgABGpSCYgNH1SfrbwTha/fpbvv3/qX0R2jG+TiV175PTkoaD/T3kUkglg8hRQxNuPH+TO8ycjfzwSr546K0f2H9Cn0VAAJaQgiQA2joAi2Py1x3O6Kuf2uelSCQhARF1qC2BqZenHZmvxnaOoLYDJU0ARc29eyLx+Ypg6elKm9VMEBVBCHWoJYOMIKOP4jcvLL7xQeDG+unlPV8UgABFVqSwgJNMBO8+c0Gs8356+1GsxdY9CZQFMngJCsBQAFEAJVagkgI0jIJRj1y/Jjz+/JIbtW7bK61v3dRUGAhARS7SAmPQHWL0EV1P1KEQLYPIUEAM/bnLmvPzt9/WpnM2djizMPoqSDBRACTFEC9houAAX4AJcgAvQe2txAS7ABbgAF6D31uICXIALcAEuQO+tpfUC/gMxM4CQeHDJIAAAAABJRU5ErkJggg==';

const ARTICLE = 'https://example.com/pass/8F3A-2291-B14';
const shapeFigure = (props: Partial<QRCodeProps>, caption: string, size = 128) => (
  <QRCode key={caption} value={ARTICLE} size={size} label={caption} caption={caption} {...props} />
);
const wrap = 'd-flex flex-wrap gap-4 align-items-start';
const tokenFor = (serial: number) => `TK-${String(serial).padStart(4, '0')}`;

function LiveTyping() {
  const [text, setText] = useState('https://example.com/hello');
  return (
    <div className={wrap}>
      <div style={{ flex: '1 1 16rem', maxWidth: 380 }}>
        <Field label="Text or link" help="The code updates as you type. Everything stays in your browser.">
          <InputText value={text} onChange={setText} clearable />
        </Field>
        <p className="text-body-secondary small mb-0">{[...text].length} characters</p>
      </div>
      <QRCode value={text} size={176} label="Live QR code" caption={text === '' ? 'Type something to see a code' : 'Scan to open'} />
    </div>
  );
}

function Rotating({ auto }: { auto: boolean }) {
  const lifetime = auto ? 20_000 : 30_000;
  const [serial, setSerial] = useState(1);
  const token = tokenFor(serial);
  const [expires, setExpires] = useState(() => Date.now() + lifetime);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => {
      clearInterval(tick);
      clearTimeout(timer.current);
    };
  }, []);
  const refresh = () => {
    setLoading(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSerial((n) => n + 1);
      setExpires(Date.now() + lifetime);
      setLoading(false);
    }, 700);
  };
  const seconds = Math.max(0, Math.ceil((expires - now) / 1000));
  return (
    <div className={wrap}>
      <QRCode
        value={`https://example.com/login?token=${token}`}
        size={176}
        label="Sign-in code"
        describedValue="One-time code to sign in on your phone"
        status={loading ? 'loading' : 'active'}
        expiresAt={expires}
        onExpire={auto ? refresh : undefined}
        onRefresh={refresh}
      />
      <div>
        <p className="mb-1">{auto ? 'A new code is fetched automatically.' : 'The code expires; refresh it yourself.'}</p>
        <p className="text-body-secondary small mb-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {loading ? 'Fetching a new code…' : seconds > 0 ? `Valid for ${seconds} s` : 'Expired'}
        </p>
        <p className="text-body-secondary small mb-0">Token {token}</p>
        {!auto && (
          <Button appearance="text" variant="secondary" size="sm" className="mt-2" onClick={() => setExpires(Date.now())}>
            Expire now
          </Button>
        )}
      </div>
    </div>
  );
}

function Downloads() {
  const ref = useRef<QRCodeHandle>(null);
  const [message, setMessage] = useState('');
  const copy = async () => {
    try {
      const blob = await ref.current!.toBlob('png');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setMessage('Image copied to the clipboard');
    } catch {
      setMessage('This browser cannot copy images; use a download instead');
    }
  };
  return (
    <div className={wrap}>
      <QRCode ref={ref} value="https://example.com/share/8F3A" size={176} label="Share code" logo={{ src: MARK, alt: 'Example', shape: 'rounded' }} />
      <div>
        <div className="d-flex flex-wrap gap-2">
          <Button appearance="outline" variant="secondary" icon="download" onClick={() => ref.current?.download('share-code', 'png')}>
            Download PNG
          </Button>
          <Button appearance="outline" variant="secondary" icon="download" onClick={() => ref.current?.download('share-code', 'svg')}>
            Download SVG
          </Button>
          <Button appearance="text" variant="secondary" icon="copy" onClick={copy}>
            Copy image
          </Button>
        </div>
        <p className="text-body-secondary small mt-2 mb-0" role="status">
          {message}
        </p>
      </div>
    </div>
  );
}

function TicketCard() {
  return (
    <Section title="Entry ticket" titleAs="h4" description="Saturday 14 June, Stockholm Waterfront">
      <div className="d-flex flex-wrap gap-5 align-items-center">
        <QRCode value="TICKET:8F3A-2291-B14" size={168} label="Ticket QR code" describedValue="Entry ticket for seat B 14, gate 3" caption="Show this code at the gate" />
        <StatGroup aria-label="Ticket details">
          <StatCard label="Seat" value="B 14" />
          <StatCard label="Gate" value="3" />
          <StatCard label="Doors" value="18:30" />
        </StatGroup>
      </div>
    </Section>
  );
}

function PaymentCard() {
  const [paid, setPaid] = useState(false);
  const [expires] = useState(() => Date.now() + 60_000);
  return (
    <Section title="Pay with your phone" titleAs="h4" description="Open your banking app and scan the code.">
      <div className="d-flex flex-wrap gap-5 align-items-center">
        <QRCode value="swish://pay?amount=249&ref=8F3A" size={168} label="Payment QR code" status={paid ? 'scanned' : 'active'} expiresAt={expires} errorCorrection="Q" />
        <div>
          <StatGroup aria-label="Payment details">
            <StatCard label="Amount" value="249 kr" />
            <StatCard label="Reference" value="8F3A" />
          </StatGroup>
          <div className="mt-3">
            <Button appearance="outline" variant="secondary" onClick={() => setPaid((p) => !p)}>
              {paid ? 'Reset demo' : 'Simulate a scan'}
            </Button>
          </div>
        </div>
      </div>
    </Section>
  );
}

export const examples = [
  {
    title: 'Basic',
    description: 'A value and an accessible name. The code is always dark on light, so it scans in both themes.',
    code: `<QRCode value="https://example.com/ticket/8F3A" label="Ticket QR code" caption="Scan to open" />`,
    render: () => <QRCode value="https://example.com/ticket/8F3A" label="Ticket QR code" caption="Scan to open" />,
  },
  {
    title: 'Dynamic: live typing',
    description: 'The value can change at any time. Encoding is memoised and the same SVG is updated in place, so there is no flicker. Too-long or empty values show a labelled error state instead of throwing.',
    code: `const [text, setText] = useState('https://example.com/hello');\n<InputText value={text} onChange={setText} />\n<QRCode value={text} size={176} label="Live QR code" />`,
    render: () => <LiveTyping />,
  },
  {
    title: 'Dynamic: auto-refreshing code with countdown',
    description: 'expiresAt + onExpire fetch a new code before the old one lapses; the loading state keeps the footprint so nothing jumps.',
    code: `<QRCode value={\`https://example.com/login?token=\${token}\`} status={loading ? 'loading' : 'active'}\n  expiresAt={expires} onExpire={refresh} onRefresh={refresh} describedValue="One-time code to sign in on your phone" />`,
    render: () => <Rotating auto />,
  },
  {
    title: 'Dynamic: expiry and manual refresh',
    description: 'Without onExpire the code expires: it fades out (so a stale code cannot be scanned), announces "QR code expired" politely and offers a Refresh button.',
    code: `<QRCode value={url} expiresAt={expires} onRefresh={refresh} />`,
    render: () => <Rotating auto={false} />,
  },
  {
    title: 'Status states',
    description: 'loading (Skeleton + Spinner), expired (Refresh button) and scanned (success mark). Each has a text alternative and a polite live announcement.',
    code: `<QRCode value={url} status="loading" />\n<QRCode value={url} status="expired" onRefresh={refresh} />\n<QRCode value={url} status="scanned" />`,
    render: () => (
      <div className={wrap}>
        {shapeFigure({ status: 'loading' }, 'Loading', 160)}
        {shapeFigure({ status: 'expired', onRefresh: () => {} }, 'Expired', 160)}
        {shapeFigure({ status: 'scanned' }, 'Scanned', 160)}
      </div>
    ),
  },
  {
    title: 'Module shapes',
    description: 'Timing, alignment and format modules always stay square so readers lock on; only data modules take the shape. All four decode in the reference scanners at every error-correction level.',
    code: `<QRCode value={url} moduleShape="square" />\n<QRCode value={url} moduleShape="rounded" />\n<QRCode value={url} moduleShape="dots" />\n<QRCode value={url} moduleShape="diamond" />`,
    render: () => (
      <div className={wrap}>
        {(['square', 'rounded', 'dots', 'diamond'] as const).map((moduleShape) => shapeFigure({ moduleShape }, moduleShape))}
      </div>
    ),
  },
  {
    title: 'Finder shapes',
    description: 'finderShape styles the outer ring and finderInnerShape the eye (default: same as the ring). Match the shapes, or pair square with rounded (not under dots); mixing circle with another shape triggers a dev warning because some scanners cannot read it.',
    code: `<QRCode value={url} finderShape="rounded" />\n<QRCode value={url} finderShape="circle" moduleShape="dots" />\n<QRCode value={url} finderShape="rounded" finderInnerShape="square" />`,
    render: () => (
      <div className={wrap}>
        {shapeFigure({ finderShape: 'square' }, 'square')}
        {shapeFigure({ finderShape: 'rounded' }, 'rounded')}
        {shapeFigure({ finderShape: 'circle', moduleShape: 'dots' }, 'circle with dots')}
        {shapeFigure({ finderShape: 'rounded', finderInnerShape: 'square' }, 'rounded ring, square eye')}
        {shapeFigure({ finderShape: 'square', finderInnerShape: 'rounded', moduleShape: 'rounded' }, 'square ring, rounded eye')}
      </div>
    ),
  },
  {
    title: 'Colours and tokens',
    description: 'The defaults are the QR tokens (ink on white in light and dark, 17:1). Any CSS colour or var(--ui-*) works while the modules stay darker than the background with at least 4:1; the dev console warns otherwise.',
    code: `<QRCode value={url} />\n<QRCode value={url} foreground="color-mix(in oklab, var(--ui-color-qr-foreground) 85%, var(--ui-color-info) 15%)" />\n<QRCode value={url} background="var(--ui-color-qr-background)" foreground="var(--ui-color-qr-foreground)" bordered />`,
    render: () => (
      <div className={wrap}>
        {shapeFigure({}, 'default tokens')}
        {shapeFigure({ foreground: 'color-mix(in oklab, var(--ui-color-qr-foreground) 85%, var(--ui-color-info) 15%)' }, 'ink tinted with info')}
        {shapeFigure({ bordered: true }, 'bordered')}
      </div>
    ),
  },
  {
    title: 'Sizes',
    description: 'size is the rendered width in px. 128 px and up is comfortable for phones; the box shrinks inside narrow containers.',
    code: `<QRCode value={url} size={96} />\n<QRCode value={url} size={160} />\n<QRCode value={url} size={224} />`,
    render: () => (
      <div className={wrap}>
        {[96, 160, 224].map((size) => shapeFigure({ size }, `${size} px`, size))}
      </div>
    ),
  },
  {
    title: 'Logo: image, icon and text',
    description: 'A logo raises the error correction to H, clears the modules behind it and stays inside the central zone, never covering a finder pattern. src passes through safeImageSrc; use a data: URI for a self-contained export.',
    code: `<QRCode value={url} logo={{ src: dataUri, alt: 'Example', shape: 'rounded' }} />\n<QRCode value={url} logo={{ icon: 'star-filled', alt: 'Favourite', shape: 'circle' }} />\n<QRCode value={url} logo={{ text: 'AB', alt: 'Acme', shape: 'square' }} />`,
    render: () => (
      <div className={wrap}>
        {shapeFigure({ logo: { src: MARK, alt: 'Example', shape: 'rounded' } }, 'image', 144)}
        {shapeFigure({ logo: { icon: 'star-filled', alt: 'Favourite', shape: 'circle' } }, 'icon', 144)}
        {shapeFigure({ logo: { text: 'AB', alt: 'Acme', shape: 'square' } }, 'initials', 144)}
      </div>
    ),
  },
  {
    title: 'Logo: shapes, size and excavate',
    description: 'shape circle, rounded or square; size is a fraction of the width (0.1 to 0.3, default 0.22); excavate={false} lets an opaque image overlay the modules instead of clearing them (text and icons need the clear plate).',
    code: `<QRCode value={url} logo={{ src, alt, shape: 'circle', size: 0.26 }} />\n<QRCode value={url} logo={{ src, alt, excavate: false, size: 0.16 }} />`,
    render: () => (
      <div className={wrap}>
        {shapeFigure({ logo: { src: MARK, alt: 'Example', shape: 'circle' } }, 'circle', 144)}
        {shapeFigure({ logo: { src: MARK, alt: 'Example', shape: 'rounded', size: 0.28, padding: 0 } }, 'rounded, 0.28', 144)}
        {shapeFigure({ logo: { src: MARK, alt: 'Example', shape: 'square', size: 0.14 } }, 'square, 0.14', 144)}
        {shapeFigure({ logo: { text: 'AB', alt: 'Acme', shape: 'circle' } }, 'excavate (default)', 144)}
        {shapeFigure({ logo: { src: MARK, alt: 'Example', shape: 'circle', excavate: false, size: 0.16 } }, 'excavate off', 144)}
      </div>
    ),
  },
  {
    title: 'Error correction',
    description: 'Higher levels survive more damage and cost more modules: L about 7 %, M 15 %, Q 25 %, H 30 %. M is the default; a logo forces H.',
    code: `<QRCode value={url} errorCorrection="L" />\n<QRCode value={url} errorCorrection="M" />\n<QRCode value={url} errorCorrection="Q" />\n<QRCode value={url} errorCorrection="H" />`,
    render: () => (
      <div className={wrap}>
        {(
          [
            ['L', 'L, about 7 %'],
            ['M', 'M, about 15 %'],
            ['Q', 'Q, about 25 %'],
            ['H', 'H, about 30 %'],
          ] as const
        ).map(([errorCorrection, caption]) => shapeFigure({ errorCorrection }, caption))}
      </div>
    ),
  },
  {
    title: 'Canvas rendering',
    description: 'renderAs="canvas" draws at the device pixel ratio on whole pixels per module. The imperative handle exports either render as PNG or SVG.',
    code: `<QRCode value={url} renderAs="canvas" size={176} />`,
    render: () => <QRCode value={ARTICLE} renderAs="canvas" size={176} label="Canvas QR code" caption="Canvas" />,
  },
  {
    title: 'Download and copy',
    description: 'ref.download(name, type), ref.toBlob(type) and ref.toDataURL(type) export a self-contained image with resolved colours (no CSS variables). File names are sanitised.',
    code: `const ref = useRef<QRCodeHandle>(null);\n<QRCode ref={ref} value={url} logo={{ src: dataUri, alt: 'Example' }} />\n<Button onClick={() => ref.current?.download('share-code', 'png')}>Download PNG</Button>\n<Button onClick={async () => navigator.clipboard.write([new ClipboardItem({ 'image/png': await ref.current!.toBlob('png') })])}>Copy image</Button>`,
    render: () => <Downloads />,
  },
  {
    title: 'Ticket card',
    description: 'Composed with Section and StatGroup: type and a ruled row of numbers, no boxes around them.',
    code: `<Section title="Entry ticket" titleAs="h4" description="Saturday 14 June">\n  <QRCode value="TICKET:8F3A-2291-B14" label="Ticket QR code" describedValue="Entry ticket for seat B 14" caption="Show this code at the gate" />\n  <StatGroup aria-label="Ticket details">\n    <StatCard label="Seat" value="B 14" /> <StatCard label="Gate" value="3" /> <StatCard label="Doors" value="18:30" />\n  </StatGroup>\n</Section>`,
    render: () => <TicketCard />,
  },
  {
    title: 'Payment card with expiry',
    description: 'A payment hand-off: the code expires after a minute (expiresAt) and flips to the scanned state when the payment is confirmed.',
    code: `<QRCode value={payload} errorCorrection="Q" status={paid ? 'scanned' : 'active'} expiresAt={expires} />`,
    render: () => <PaymentCard />,
  },
  {
    title: 'Dark theme',
    description: 'On a dark surface the code keeps its light ground: scanners cannot read inverted codes, so the QR tokens are the same in every theme and profile.',
    code: `<div data-bs-theme="dark"><QRCode value={url} caption="Still dark on light" /></div>`,
    render: () => (
      <div data-bs-theme="dark" className="p-4 rounded d-flex flex-wrap gap-4 align-items-center" style={{ background: 'var(--ui-color-bg)', color: 'var(--ui-color-text)' }}>
        <QRCode value={ARTICLE} label="QR code on a dark surface" caption="Still dark on light" />
        <p className="mb-0" style={{ maxWidth: '32ch' }}>
          The surface follows the theme; the code does not.
        </p>
      </div>
    ),
  },
];
