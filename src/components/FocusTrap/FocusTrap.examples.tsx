import { useRef, useState } from 'react';
import { Button } from '../Button/Button';
import { InputText } from '../InputText/InputText';
import { FocusTrap } from './FocusTrap';

function Demo() {
  const [active, setActive] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  return (
    <div className="d-flex flex-column gap-3">
      <div>
        <Button appearance="outline" onClick={() => setActive(true)} disabled={active}>Start trapping focus</Button>
      </div>
      {active ? (
        <FocusTrap initialFocus={first} className="p-3 rounded border d-flex flex-column gap-2" aria-label="Trapped region" role="group">
          <p className="mb-0 small text-body-secondary">Tab and Shift+Tab cycle inside this box. Focus returns to the button when you leave.</p>
          <InputText ref={first} aria-label="Name" placeholder="Name" />
          <InputText aria-label="Email" type="email" placeholder="Email" />
          <div>
            <Button appearance="outline" onClick={() => setActive(false)}>Release focus</Button>
          </div>
        </FocusTrap>
      ) : (
        <p className="mb-0 small text-body-secondary">Not trapping. Press the button to activate the trap.</p>
      )}
    </div>
  );
}

export const examples = [
  {
    title: 'Trap and restore focus',
    description: 'Keeps keyboard focus inside a container, moves it in on activation (`initialFocus`, else the first focusable, else the container) and restores it on release.',
    code: `<FocusTrap active={open} initialFocus={firstFieldRef}>\n  <InputText ref={firstFieldRef} aria-label="Name" />\n  <Button onClick={close}>Release focus</Button>\n</FocusTrap>\n\n// Or without the component:\nuseFocusTrap(containerRef, { active, initialFocus, restoreFocus });`,
    render: () => <Demo />,
  },
];
