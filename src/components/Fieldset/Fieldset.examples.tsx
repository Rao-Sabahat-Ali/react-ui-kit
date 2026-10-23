import { Fieldset } from './Fieldset';

export const examples = [
  {
    title: 'Plain and collapsible',
    description: 'Native fieldset/legend; the toggle is a button inside the legend.',
    code: `<Fieldset legend="Shipping address">…</Fieldset>\n<Fieldset legend="Advanced" toggleable defaultCollapsed variant="plain">…</Fieldset>`,
    render: () => (
      <div className="d-flex flex-column gap-3">
        <Fieldset legend="Shipping address">
          <label className="form-label" htmlFor="fs-street">Street</label>
          <input id="fs-street" className="form-control" />
        </Fieldset>
        <Fieldset legend="Advanced" toggleable defaultCollapsed variant="plain">
          <p className="mb-0">Hidden until expanded.</p>
        </Fieldset>
      </div>
    ),
  },
];
