import { useEffect, useMemo, MouseEvent } from 'react';
import { Navigate, useNavigate, useParams, Link } from 'react-router-dom';
import { articles, getDoc, relatedFor } from '../content';
import { renderDocPage, renderDocsIndex, headForDoc, headForIndex } from '../content/render';
import { applyHead } from '../content/head';
import redirects from '../../content/redirects.json';

/** Internal links inside rendered markdown navigate without a full page load. */
function useLinkDelegate() {
  const navigate = useNavigate();
  return (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as HTMLElement).closest('a[data-internal="true"]') as HTMLAnchorElement | null;
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    const href = a.getAttribute('href') || '';
    if (!href.startsWith('/')) return;
    e.preventDefault();
    navigate(href);
  };
}

export function DocRoute() {
  const { slug = '' } = useParams();
  const onClick = useLinkDelegate();
  const target = (redirects as Record<string, string>)[slug];
  const doc = getDoc(slug);
  const html = useMemo(() => (doc ? renderDocPage(doc, relatedFor(doc)) : ''), [doc]);
  useEffect(() => { if (doc) applyHead(headForDoc(doc)); }, [doc]);

  if (target) return <Navigate to={`/${target}`} replace />;
  if (!doc) return <NotFound />;
  return <div className="w-full" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function DocsIndex() {
  const onClick = useLinkDelegate();
  const html = useMemo(() => renderDocsIndex(articles), []);
  useEffect(() => { applyHead(headForIndex()); }, []);
  return <div className="w-full" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function NotFound() {
  useEffect(() => { document.title = 'Page not found | Relay'; }, []);
  return (
    <div className="wrap pt-10">
      <p className="display text-signal text-[42vw] md:text-[28vw] 2xl:text-[400px] leading-[.8]" style={{ ['--w' as string]: 2 }} aria-hidden="true">404</p>
      <div className="mt-10 grid md:grid-cols-12 gap-6">
        <h1 className="md:col-span-5 display text-[44px] md:text-[60px]" style={{ ['--w' as string]: 3.5 }}>This page isn't here.</h1>
        <div className="md:col-span-6 md:col-start-7 flex flex-col gap-6">
          <p className="text-ink-2 text-[18px]">The link may be old. Try the guides, or start a transfer.</p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Link to="/" className="btn btn-signal">Start sending</Link>
            <Link to="/articles" className="btn btn-line">Browse the guides</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocRoute;
