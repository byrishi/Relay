import { ReactNode, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';

/**
 * Accessible modal: role="dialog", labelled, focus moves in and is trapped,
 * Escape closes, focus returns to the trigger. Rendered in a portal so blurred
 * parents can't clip it.
 */
export default function Dialog({ title, description, onClose, children, dismissible = true, testId }: {
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  dismissible?: boolean;
  testId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  // keep the latest callbacks without re-running the focus setup on every render
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const dismissRef = useRef(dismissible); dismissRef.current = dismissible;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const box = ref.current!;
    const focusables = () => Array.from(box.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((el) => !el.hasAttribute('disabled'));
    (box.querySelector<HTMLElement>('[data-autofocus]') || focusables()[0] || box).focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissRef.current) { e.preventDefault(); closeRef.current(); }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);

  return createPortal(
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={(e) => { if (dismissible && e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descId : undefined}
        tabIndex={-1} data-testid={testId}
        className="w-full max-w-md rounded-2xl bg-s2 ring2 shadow-[0_40px_100px_-20px_rgb(0_0_0/0.9)] p-6 md:p-7 text-left text-fg outline-none">
        <h2 id={titleId} className="text-[19px] font-semibold tracking-[-0.02em]">{title}</h2>
        {description && <div id={descId} className="text-[14.5px] text-fg-2 mt-2 leading-relaxed">{description}</div>}
        <div className="mt-5">{children}</div>
      </div>
    </motion.div>,
    document.body,
  );
}
