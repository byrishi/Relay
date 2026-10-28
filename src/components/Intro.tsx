import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'motion/react';

/** Between pages, one ultramarine sheet lifts off the new page. */
export function RouteCurtain() {
  const { pathname } = useLocation();
  const [key, setKey] = useState(0);
  const [first, setFirst] = useState(true);
  useEffect(() => { if (first) { setFirst(false); return; } setKey((k) => k + 1); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!key || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  return (
    <motion.div key={key} aria-hidden="true" className="fixed inset-0 z-[240] pointer-events-none bg-signal origin-top"
      initial={{ scaleY: 1 }} animate={{ scaleY: 0 }} transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1], delay: 0.05 }} />
  );
}
