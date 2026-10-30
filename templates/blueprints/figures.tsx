import { createContext, useContext, useRef, type ReactNode, type SVGProps } from 'react';
import { useAssemble } from '@sabahat/react-ui-kit';

/*
 * Line-art figures for step panels: the picture before the words (identity v2, "Monteringsanvisning").
 * Rules: 2px strokes in the current ink (`currentColor`, non-scaling), the dashed guide in the accent, part numbers only
 * if they are 12px or larger and reach 4.5:1 in every panel state (none are used here),
 * no text or quantity marks (the panel's value carries counts), no fills except paper, no gradients, no glyph icons standing in for drawings. A figure is drawn at
 * its own fixed size (1 unit = 1px). Moving parts are marked `data-fig-part` and the guide `data-fig-guide`: the part
 * is lowered along the guide line when the figure assembles (`useAssemble`, reduced motion fades only).
 *
 * These helpers are not kit API. Copy this file next to the screen that uses it.
 */

const PAPER = 'var(--ui-color-surface)';
const line = { vectorEffect: 'non-scaling-stroke' } as const;

const ScaleContext = createContext(1);

/** The drawing surface: 160 x 96 units by default (drawn larger by an enclosing `AssembledFigure scale`). */
export function Figure({ children, width = 160, height = 96 }: { children: ReactNode; width?: number; height?: number }) {
  const scale = useContext(ScaleContext);
  return (
    <svg width={width * scale} height={height * scale} viewBox={`0 0 ${width} ${height}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">
      {children}
    </svg>
  );
}

type Paper = { paper?: boolean };

/** A rounded 6px part outline. */
export function Box({ paper, rx = 6, ...rest }: SVGProps<SVGRectElement> & Paper) {
  return <rect {...line} rx={rx} fill={paper ? PAPER : 'none'} {...rest} />;
}

/** Any path outline. */
export function Trace({ paper, ...rest }: SVGProps<SVGPathElement> & Paper) {
  return <path {...line} fill={paper ? PAPER : 'none'} {...rest} />;
}

export function Ring({ paper, ...rest }: SVGProps<SVGCircleElement> & Paper) {
  return <circle {...line} fill={paper ? PAPER : 'none'} {...rest} />;
}

/** The dashed guide line a part is lowered along, in the accent. */
export function Guide({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line {...line} data-fig-guide x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray="5 5" style={{ stroke: 'var(--ui-color-accent)' }} />;
}

/** A moving part: everything inside travels together. */
export function Part({ children }: { children: ReactNode }) {
  return <g data-fig-part>{children}</g>;
}

/**
 * Wraps a figure outside a StepPanel (a step of a Stepper, a plain page) and runs the same Assemble movement:
 * the parts are lowered along the guide when the figure mounts or `replayKey` changes.
 */
export function AssembledFigure({ children, replayKey, label, scale = 1 }: { children: ReactNode; replayKey?: string | number; label?: string; scale?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useAssemble(ref, { parts: '[data-fig-part]', guide: '[data-fig-guide]', reverse: true, trigger: replayKey });
  return (
    <div ref={ref} style={{ color: 'var(--ui-color-line)', lineHeight: 0 }} aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}>
      <ScaleContext.Provider value={scale}>{children}</ScaleContext.Provider>
    </div>
  );
}

/* ------------------------------------------------------------------ drawings for the step panels */

/** A stack of cards; the top card is lowered onto it. */
export function CardStackFigure() {
  return (
    <Figure>
      <Guide x1={80} y1={2} x2={80} y2={44} />
      <Box x={44} y={66} width={72} height={20} />
      <Box x={40} y={58} width={80} height={20} paper />
      <Box x={36} y={50} width={88} height={20} paper />
      <Part>
        <Box x={32} y={30} width={96} height={30} paper />
        <Trace d="M44 41h40M44 49h24" />
      </Part>
    </Figure>
  );
}

/** A card is lowered into a tray. */
export function WordCardFigure() {
  return (
    <Figure>
      <Guide x1={80} y1={2} x2={80} y2={44} />
      <Trace d="M28 52v32a6 6 0 0 0 6 6h92a6 6 0 0 0 6-6V52" />
      <Part>
        <Box x={48} y={12} width={64} height={44} paper />
        <Trace d="M58 26h28M58 38h44" />
      </Part>
      <Trace d="M28 52h104v32a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6z" paper />
    </Figure>
  );
}

/** A sheet of rows; a check is lowered onto the first one. */
export function ReviewSheetFigure() {
  return (
    <Figure>
      <Guide x1={46} y1={2} x2={46} y2={40} />
      <Box x={28} y={10} width={104} height={80} paper />
      <Trace d="M70 28h46M70 48h46M70 68h30" />
      <Box x={40} y={42} width={12} height={12} rx={3} />
      <Box x={40} y={62} width={12} height={12} rx={3} />
      <Part>
        <Box x={40} y={22} width={12} height={12} rx={3} paper />
        <Trace d="M43 28.5l2.8 2.8L50 25" />
      </Part>
    </Figure>
  );
}

/** A parcel is lowered into the cart. */
export function CartFigure() {
  return (
    <Figure>
      <Guide x1={72} y1={2} x2={72} y2={44} />
      <Trace d="M18 22h14l10 40h58l8-30H38" />
      <Part>
        <Box x={52} y={26} width={40} height={28} paper />
        <Trace d="M72 26v10M64 26v6h16v-6" />
      </Part>
      <Trace d="M48 54h56v8H46z" paper />
      <Ring cx={54} cy={78} r={6} paper />
      <Ring cx={96} cy={78} r={6} paper />
    </Figure>
  );
}

/** Contact: a letter with a person mark is lowered into an envelope (the receipt goes to you). */
export function ContactFigure() {
  return (
    <Figure>
      <Guide x1={80} y1={2} x2={80} y2={44} />
      <Box x={24} y={42} width={112} height={46} />
      <Part>
        <Box x={46} y={8} width={68} height={48} paper />
        <Ring cx={62} cy={24} r={5} />
        <Trace d="M53 42a9 9 0 0 1 18 0" />
        <Trace d="M82 22h20M82 32h20" />
      </Part>
      <Box x={24} y={46} width={112} height={42} paper />
      <Trace d="M24 52l56 22 56-22" />
    </Figure>
  );
}

/** Delivery: a parcel is lowered onto the doorstep. */
export function ParcelDoorFigure() {
  return (
    <Figure>
      <Guide x1={64} y1={2} x2={64} y2={44} />
      <Trace d="M12 88h136" />
      <Box x={102} y={30} width={34} height={58} />
      <Ring cx={128} cy={60} r={2.5} />
      <Part>
        <Box x={44} y={52} width={40} height={36} paper />
        <Trace d="M64 52v12M56 52v7h16v-7" />
      </Part>
    </Figure>
  );
}

/** Payment: a card is lowered into the terminal's slot. */
export function PaymentCardFigure() {
  return (
    <Figure>
      <Guide x1={80} y1={2} x2={80} y2={40} />
      <Box x={36} y={56} width={88} height={32} />
      <Trace d="M52 70h16M52 78h28" />
      <Part>
        <Box x={48} y={14} width={64} height={42} paper />
        <Trace d="M48 28h64" />
        <Box x={56} y={36} width={14} height={10} rx={3} />
      </Part>
      <Trace d="M44 56h72v8H44z" paper />
    </Figure>
  );
}

/** An address card; a pin is lowered onto the address line. */
export function AddressCardFigure() {
  return (
    <Figure>
      <Guide x1={104} y1={2} x2={104} y2={42} />
      <Box x={24} y={30} width={112} height={56} paper />
      <Trace d="M38 48h40M38 60h56M38 72h30" />
      <Part>
        <Trace d="M104 52c-10-9-14-15-14-21a14 14 0 0 1 28 0c0 6-4 12-14 21z" paper />
        <Ring cx={104} cy={31} r={4} />
      </Part>
    </Figure>
  );
}

export type CheckoutFigureStep = 'contact' | 'delivery' | 'payment' | 'review';

/** The picture for a checkout step (contact, delivery, payment, review), assembled when the step opens. */
export function CheckoutFigure({ step, scale = 0.7 }: { step: CheckoutFigureStep; scale?: number }) {
  return (
    <AssembledFigure replayKey={step} scale={scale}>
      {step === 'contact' ? <ContactFigure /> : step === 'delivery' ? <ParcelDoorFigure /> : step === 'payment' ? <PaymentCardFigure /> : <ReviewSheetFigure />}
    </AssembledFigure>
  );
}
