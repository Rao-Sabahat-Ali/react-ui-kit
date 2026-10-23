import { Divider } from './Divider';

export const examples = [
  {
    title: 'Horizontal with label',
    description: 'Label can be aligned start, center or end; line style is solid, dashed or dotted.',
    code: `<Divider />\n<Divider>or</Divider>\n<Divider align="start" type="dashed">Section</Divider>`,
    render: () => (
      <div>
        <Divider />
        <Divider>or</Divider>
        <Divider align="start" type="dashed">Section</Divider>
        <Divider align="end" type="dotted">End</Divider>
      </div>
    ),
  },
  {
    title: 'Vertical',
    code: `<div className="d-flex"><span>One</span><Divider orientation="vertical" /><span>Two</span></div>`,
    render: () => (
      <div className="d-flex align-items-center">
        <span>One</span>
        <Divider orientation="vertical" />
        <span>Two</span>
      </div>
    ),
  },
];
