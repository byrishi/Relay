import { ReactNode } from 'react';
import { motion } from 'motion/react';

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Headline words rise into place from behind a mask when they scroll into
 * view. The text is always in the page (only moved), so it stays readable
 * to search engines and screen readers.
 */
export function RevealWords({ text, className = '', delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(' ');
  return (
    <motion.span className={className} initial="hide" whileInView="show" viewport={{ once: true, margin: '0px 0px -12% 0px' }}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
          <motion.span className="inline-block will-change-transform" variants={{ hide: { y: '105%' }, show: { y: 0 } }}
            transition={{ duration: 0.9, ease, delay: delay + i * 0.045 }}>{w}</motion.span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </motion.span>
  );
}

/** A list whose items rise in one after another as it scrolls into view. */
export function Stagger({ as = 'ul', className = '', children }: { as?: 'ul' | 'ol' | 'dl' | 'div'; className?: string; children: ReactNode }) {
  const Tag = motion[as];
  return (
    <Tag className={className} initial="hide" whileInView="show" viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
      {children}
    </Tag>
  );
}

export const item = {
  variants: { hide: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } } },
};
