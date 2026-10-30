import { useLocale, type MessageKey } from '@sabahat/react-ui-kit';

/**
 * Strings of the 3D package. They follow the kit's locale pattern: English defaults here, overridable through
 * `<LocaleProvider messages={{ scene3dPause: '…' }}>` (the kit's `t()` returns undefined for unknown keys, so
 * the package falls back to these defaults). Keys are prefixed `scene3d`.
 */
export const en3d = {
  scene3dPause: 'Pause animation',
  scene3dPlay: 'Play animation',
  scene3dReset: 'Reset view',
  scene3dKeyboardHelp: 'Interactive 3D view. Arrow keys rotate, plus and minus zoom, Home resets the view.',
  scene3dLoading: 'Loading 3D view',
} as const;

export type Scene3DMessageKey = keyof typeof en3d;
/** Pass to `LocaleProvider` as `messages` (cast to the kit's `LocaleMessages`) to translate the 3D strings. */
export type Scene3DMessages = Record<Scene3DMessageKey, string>;

export function useScene3DLocale(): (key: Scene3DMessageKey) => string {
  const { t } = useLocale();
  return (key) => {
    const value = (t as (key: MessageKey) => string | undefined)(key as unknown as MessageKey);
    return typeof value === 'string' ? value : en3d[key];
  };
}
