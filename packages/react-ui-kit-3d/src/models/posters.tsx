import type { ReactNode } from 'react';

// Line-art posters (2px ink strokes in currentColor) in the same 4:3 box as the scene, shown before load,
// without WebGL, on context loss or error.
const Poster = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 160 120" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const L = (props: React.SVGProps<SVGPathElement>) => <path vectorEffect="non-scaling-stroke" {...props} />;

export const StoolPoster = () => (
  <Poster>
    <ellipse vectorEffect="non-scaling-stroke" cx="80" cy="42" rx="40" ry="11" />
    <L d="M40 42v7c0 6 18 11 40 11s40-5 40-11v-7" />
    <L d="M56 58 46 100M104 58l10 42M80 63v40" />
    <L d="M44 102h6M110 102h6M77 105h6" />
  </Poster>
);

export const ShelfPoster = () => (
  <Poster>
    <L d="M46 14v92M114 14v92M46 14h68M46 106h68" />
    <L d="M46 40h68M46 72h68" />
    <circle vectorEffect="non-scaling-stroke" cx="52" cy="40" r="2.5" />
    <circle vectorEffect="non-scaling-stroke" cx="108" cy="40" r="2.5" />
  </Poster>
);

export const TokenPoster = () => (
  <Poster>
    <L d="M80 82l-34-10V52l34-10 34 10v20z" />
    <L d="M46 52l34 10 34-10M80 62v20" />
    <L d="M80 14l16 22-16 22-16-22z" />
  </Poster>
);
