import { IndexItem, IndexList } from '@sabahat/react-ui-kit';
import { blueprints } from '../blueprints/registry';
import { href } from '../router';

export function BlueprintsPage() {
  return (
    <>
      <header className="docs-page-header">
        <h1>Blueprints</h1>
        <p className="lead text-body-secondary">
          Complete, runnable screens built only from kit components and the design contract. Start a new app from one so every app looks and behaves the same without re-explaining
          the design.
        </p>
      </header>
      <IndexList>
        {blueprints.map((b) => (
          <IndexItem
            key={b.slug}
            title={b.title}
            description={b.summary}
            href={href('blueprints', b.slug)}
            meta={
              <>
                Profile {b.profile} · patterns {b.patterns.join(', ')}
              </>
            }
          />
        ))}
      </IndexList>
    </>
  );
}
