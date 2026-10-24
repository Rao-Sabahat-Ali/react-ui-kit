import { LocaleProvider, ThemeProvider, ToastProvider } from '@sabahat/react-ui-kit';
import { __SCREEN__ } from './screens/__SCREEN__';

/**
 * Generated for the "__PROFILE__" profile. The home screen is the `__SCREEN__` blueprint from react-ui-kit
 * (src/screens): replace its sample data with your own and rename the navigation items. Specs: design-system get_pattern.
 */
export function App() {
  return (
    <ThemeProvider profile="__PROFILE__">
      <LocaleProvider locale="en">
        <ToastProvider>
          <__SCREEN__ appName="__APP_TITLE__" />
        </ToastProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
