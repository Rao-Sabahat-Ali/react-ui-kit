import { useEffect, useId, useMemo, useRef, useState, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { Button, cx, useReducedMotion } from '@sabahat/react-ui-kit';
import { SceneContext, sameDef, warnOnce, type SceneRegistry } from '../../context';
import { readTokens, watchTokens } from '../../engine/tokens';
import { createStage, type Stage } from '../../engine/stage';
import { useScene3DLocale } from '../../locale';
import type { CameraOptions, ModelDef, SceneLook, ThreeModule } from '../../types';

export interface Scene3DProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'aria-label'> {
  /** Short text alternative. Required unless `decorative`. */
  'aria-label'?: string;
  /** Longer text alternative, visually hidden. */
  description?: ReactNode;
  /** Purely ornamental: hidden from assistive technology, no controls. */
  decorative?: boolean;
  /** Static fallback in the same box: shown before load, without WebGL, on context loss or error. */
  poster: ReactNode;
  variant?: 'hero' | 'inline' | 'empty-state';
  /** CSS aspect-ratio override. */
  aspectRatio?: string;
  look?: SceneLook;
  camera?: CameraOptions;
  controls?: 'none' | 'orbit';
  /** Slow turntable; a number is degrees per second (default 12). Shows Pause/Play. */
  autoRotate?: boolean | number;
  /** Parts of each `Model3D parts="children"` travel in along dashed guide lines on first view. */
  assemble?: boolean;
  /** When three is imported: near the viewport (200px), at once, or on first pointer/focus. */
  loading?: 'visible' | 'eager' | 'interaction';
  /** Device pixel ratio cap. */
  maxDpr?: number;
  onReady?: () => void;
  onError?: (error: unknown) => void;
  children?: ReactNode;
  ref?: Ref<HTMLDivElement>;
}

type Status = 'poster' | 'loading' | 'ready' | 'lost' | 'error';

const PAUSE_KEY = 'ui-scene3d:paused';
function readPaused(): boolean {
  try {
    return sessionStorage.getItem(PAUSE_KEY) === '1';
  } catch {
    return false;
  }
}
function writePaused(paused: boolean) {
  try {
    sessionStorage.setItem(PAUSE_KEY, paused ? '1' : '0');
  } catch {
    // remembered for this page only
  }
}

/** Decide WebGL availability before downloading three. */
function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

export function Scene3D(props: Scene3DProps) {
  const {
    'aria-label': label,
    description,
    decorative = false,
    poster,
    variant = 'inline',
    aspectRatio,
    look = 'sheet',
    camera,
    controls = 'none',
    autoRotate = false,
    assemble = false,
    loading = 'visible',
    maxDpr = 2,
    onReady,
    onError,
    children,
    className,
    style,
    ref,
    ...rest
  } = props;
  const t = useScene3DLocale();
  const reduced = useReducedMotion();
  const uid = useId();
  const descId = `${uid}-desc`;
  const helpId = `${uid}-help`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<Stage | null>(null);
  const modelsRef = useRef(new Map<string, ModelDef>());
  const rebuildRef = useRef<() => void>(() => {});
  const [status, setStatus] = useState<Status>('poster');
  const [paused, setPaused] = useState(readPaused);
  const [animated, setAnimated] = useState(false);
  const [labels, setLabels] = useState<string[]>([]);

  const degrees = autoRotate === true ? 12 : autoRotate === false ? 0 : autoRotate;
  const interactive = controls === 'orbit' && !decorative;
  // Latest props for the async stage code, which must not re-run when they change.
  const live = useRef({ look, camera, interactive, degrees, assemble, maxDpr, reduced, paused, loading, onReady, onError });
  useEffect(() => {
    live.current = { look, camera, interactive, degrees, assemble, maxDpr, reduced, paused, loading, onReady, onError };
  });

  if (!decorative && !label) warnOnce('Scene3D: pass `aria-label` (a short text alternative) or set `decorative`.');
  if (poster === undefined || poster === null) warnOnce('Scene3D: `poster` is required (the fallback shown before load and without WebGL).');

  const registry = useMemo<SceneRegistry>(() => {
    const sync = () => {
      const defs = [...modelsRef.current.values()];
      setAnimated(defs.some((d) => d.animate));
      const next = defs.map((d) => d.label).filter((l): l is string => Boolean(l));
      setLabels((prev) => (prev.join('\n') === next.join('\n') ? prev : next));
    };
    return {
      register(id, def) {
        const prev = modelsRef.current.get(id);
        if (prev && sameDef(prev, def)) return;
        modelsRef.current.set(id, def);
        stageRef.current?.setModel(id, def);
        sync();
      },
      unregister(id) {
        modelsRef.current.delete(id);
        stageRef.current?.removeModel(id);
        sync();
      },
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current!;
    const canvas = canvasRef.current!;
    let dead = false;
    let failed = false;
    let started = false;
    let announced = false;
    let visible = true;
    let three: ThreeModule | null = null;
    let tokens = readTokens(root);

    const teardown = (release: boolean) => {
      const stage = stageRef.current;
      stageRef.current = null;
      stage?.dispose(release);
    };
    const fail = (error: unknown) => {
      if (dead || failed) return;
      failed = true;
      teardown(true);
      setStatus('error');
      live.current.onError?.(error);
    };
    const create = () => {
      if (!three || dead || failed) return;
      const now = live.current;
      try {
        const stage = createStage({
          three,
          canvas,
          box: root,
          look: now.look,
          maxDpr: now.maxDpr,
          camera: now.camera,
          controls: now.interactive,
          autoRotate: now.degrees,
          assemble: now.assemble,
          reducedMotion: now.reduced,
          paused: now.paused,
          tokens,
          onFirstFrame: () => {
            if (dead || failed) return;
            setStatus('ready');
            if (!announced) {
              announced = true;
              live.current.onReady?.();
            }
          },
          onAnimating: (on) => root.toggleAttribute('data-animating', on),
          onError: fail,
        });
        stageRef.current = stage;
        stage.setVisible(visible);
        for (const [id, def] of modelsRef.current) stage.setModel(id, def);
        stage.start();
      } catch (error) {
        fail(error);
      }
    };
    rebuildRef.current = () => {
      if (!stageRef.current) return;
      teardown(false);
      create();
    };
    const start = async () => {
      if (started || dead) return;
      started = true;
      setStatus('loading');
      try {
        if (!webglAvailable()) throw new Error('Scene3D: WebGL is not available.');
        three = await import('three');
        create();
      } catch (error) {
        fail(error);
      }
    };

    const cleanups: (() => void)[] = [];
    const mode = live.current.loading;
    if (mode === 'eager' || (mode === 'visible' && typeof IntersectionObserver === 'undefined')) void start();
    else if (mode === 'interaction') {
      const go = () => void start();
      root.addEventListener('pointerdown', go, { once: true });
      root.addEventListener('focusin', go, { once: true });
      cleanups.push(() => (root.removeEventListener('pointerdown', go), root.removeEventListener('focusin', go)));
    } else {
      const near = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          near.disconnect();
          void start();
        }
      }, { rootMargin: '200px' });
      near.observe(root);
      cleanups.push(() => near.disconnect());
    }
    if (typeof IntersectionObserver !== 'undefined') {
      const view = new IntersectionObserver((entries) => {
        visible = entries[entries.length - 1]!.isIntersecting;
        stageRef.current?.setVisible(visible);
      });
      view.observe(root);
      cleanups.push(() => view.disconnect());
    }
    if (typeof ResizeObserver !== 'undefined') {
      const size = new ResizeObserver(() => stageRef.current?.resize());
      size.observe(root);
      cleanups.push(() => size.disconnect());
    }
    cleanups.push(
      watchTokens(root, () => {
        tokens = readTokens(root);
        stageRef.current?.setTokens(tokens);
      }),
    );
    const onLost = (e: Event) => {
      e.preventDefault();
      stageRef.current?.setLost(true);
      if (!failed) setStatus('lost');
    };
    const onRestored = () => {
      if (!stageRef.current || failed) return;
      teardown(false);
      create();
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    return () => {
      dead = true;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      for (const c of cleanups) c();
      teardown(true);
      rebuildRef.current = () => {};
    };
  }, []);

  useEffect(() => {
    stageRef.current?.set({ reducedMotion: reduced, paused, autoRotate: degrees, controls: interactive });
  }, [reduced, paused, degrees, interactive]);
  const firstLook = useRef(look);
  useEffect(() => {
    if (firstLook.current === look) return;
    firstLook.current = look;
    rebuildRef.current();
  }, [look]);

  const showCanvas = status === 'ready';
  const showPause = showCanvas && !decorative && !reduced && (degrees > 0 || animated);
  const describedBy = interactive ? `${descId} ${helpId}` : descId;
  const canvasProps = decorative || !showCanvas
    ? { 'aria-hidden': true as const }
    : interactive
      ? { role: 'application', 'aria-label': label, 'aria-describedby': describedBy, tabIndex: 0 }
      : { role: 'img', 'aria-label': label, 'aria-describedby': descId };

  return (
    <SceneContext.Provider value={registry}>
      <div
        ref={(node) => {
          rootRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cx('ui-scene3d', `ui-scene3d--${variant}`, className)}
        style={aspectRatio ? { aspectRatio, ...style } : style}
        data-state={status}
        data-look={look}
        {...rest}
      >
        <div
          className="ui-scene3d__poster"
          {...(decorative || showCanvas ? { 'aria-hidden': true } : { role: 'img', 'aria-label': label, 'aria-describedby': descId })}
        >
          {poster}
        </div>
        <canvas ref={canvasRef} className="ui-scene3d__canvas" {...canvasProps} />
        {showCanvas && !decorative && (showPause || interactive) && (
          <div className="ui-scene3d__controls">
            {showPause && (
              <Button
                size="sm"
                variant="secondary"
                appearance="outline"
                icon={paused ? 'play' : 'pause'}
                aria-label={paused ? t('scene3dPlay') : t('scene3dPause')}
                onClick={() => {
                  writePaused(!paused);
                  setPaused(!paused);
                }}
              />
            )}
            {interactive && <Button size="sm" variant="secondary" appearance="outline" icon="rotate" aria-label={t('scene3dReset')} onClick={() => stageRef.current?.reset()} />}
          </div>
        )}
        {!decorative && (
          <div id={descId} className="ui-scene3d__description">
            {description}
            {labels.length > 0 && (
              <ul>
                {labels.map((l, i) => (
                  <li key={`${l}-${i}`}>{l}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {interactive && (
          <span id={helpId} className="ui-scene3d__description">
            {t('scene3dKeyboardHelp')}
          </span>
        )}
        {children}
      </div>
    </SceneContext.Provider>
  );
}
