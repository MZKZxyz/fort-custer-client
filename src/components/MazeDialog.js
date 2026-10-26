import { useEffect, useRef } from 'react';

export default function MazeDialog({ label, onCancel, children, initialFocus }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    // Native modal dialogs make the rest of the page inert and contain focus.
    dialog.showModal?.();
    dialog.querySelector(initialFocus || 'button')?.focus();
    return () => { dialog.close?.(); if (previous?.isConnected) previous.focus(); };
  }, [initialFocus]);
  return <dialog ref={ref} className="maze-dialog modal-content" aria-label={label}
    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const buttons = [...ref.current.querySelectorAll('button:not(:disabled)')];
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onCancel={event => { event.preventDefault(); onCancel(); }}>{children}</dialog>;
}
