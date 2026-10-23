import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import { InputText } from '../InputText/InputText';
import { Topbar } from './Topbar';

export const examples = [
  {
    title: 'Brand, search, actions',
    description: 'Press "/" to focus the search field.',
    code: `<Topbar brand="Svenska ord" onMenuToggle={toggle} search={<InputText type="search" aria-label="Search" prefix={<Icon name="search" />} />} actions={<Button appearance="text" icon="settings" aria-label="Settings" />} />`,
    render: () => (
      <Topbar
        sticky={false}
        brand="Svenska ord"
        onMenuToggle={() => {}}
        search={<InputText type="search" size="sm" aria-label="Search" placeholder="Search…  /" prefix={<Icon name="search" />} />}
        actions={<Button appearance="text" variant="secondary" icon="settings" aria-label="Settings" />}
      />
    ),
  },
];
