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
    window.scrollTo(0, 0);
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
    <div className="w-full max-w-xl mx-auto px-6 py-32 text-center">
      <p className="text-[14px] font-medium text-acc">404</p>
      <h1 className="mt-3 text-[40px] md:text-[52px] font-semibold tracking-[var(--tr-1)] leading-[1.05]">This page isn't here.</h1>
      <p className="text-fg-2 text-[17px] mt-4">The link may be old. Try the guides, or start a transfer.</p>
      <div className="flex gap-3 justify-center mt-9">
        <Link to="/" className="btn btn-w btn-lg">Start sending</Link>
        <Link to="/articles" className="btn btn-g btn-lg">Browse guides</Link>
      </div>
    </div>
  );
}

export default DocRoute;
