import { Box, Figure, Guide, Part, Ring, Trace } from '../../../templates/blueprints/figures';

/** 1. The package is lowered into the project folder. */
export function PackageIntoFolderFigure() {
  return (
    <Figure>
      <Guide x1={80} y1={2} x2={80} y2={44} />
      <Trace d="M36 78V42a6 6 0 0 1 6-6h20l8 8h48a6 6 0 0 1 6 6v28a6 6 0 0 1-6 6H42a6 6 0 0 1-6-6z" />
      <Part>
        <Box x={58} y={14} width={44} height={36} paper />
        <Trace d="M80 14v14M72 14v8h16v-8" />
      </Part>
      <Trace d="M36 56h88v22a6 6 0 0 1-6 6H42a6 6 0 0 1-6-6z" paper />
    </Figure>
  );
}

/** 2. The stylesheet is clipped onto the app frame. */
export function SheetOntoFrameFigure() {
  return (
    <Figure>
      <Guide x1={80} y1={2} x2={80} y2={44} />
      <Box x={24} y={36} width={112} height={52} />
      <Trace d="M24 50h112" />
      <Ring cx={36} cy={43} r={2} />
      <Part>
        <Box x={52} y={16} width={56} height={52} paper />
        <Trace d="M62 36h36M62 46h36M62 56h22" />
        <Trace d="M72 16v-8h16v8" />
      </Part>
    </Figure>
  );
}

/** 3. The provider part clicks into the app's slot. */
export function PartIntoSlotFigure() {
  return (
    <Figure>
      <Guide x1={80} y1={2} x2={80} y2={44} />
      <Trace d="M26 58h36v12h36V58h36v30H26z" />
      <Part>
        <Box x={60} y={20} width={40} height={38} paper />
        <Trace d="M72 58v10h16V58" />
        <Trace d="M70 36h20M70 46h12" />
      </Part>
      <Trace d="M50 52l-8-2M110 52l8-2" />
    </Figure>
  );
}
