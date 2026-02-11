import { useEffect, useRef } from "react";
import "./Modal.css";

export default function Modal({
  isOpen,
  title,
  children,
  onClose,
  footer,
  closeOnOverlay = true,
  closeOnEsc = true,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (closeOnEsc && e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKeyDown);

    // focus the modal panel for basic keyboard safety
    window.setTimeout(() => panelRef.current?.focus(), 0);

    // prevent background scroll
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal__overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (!closeOnOverlay) return;
        // only close if click is on overlay, not inside modal content
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <section
        className="modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title || "Dialog"}
        tabIndex={-1}
        ref={panelRef}
      >
        <header className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button
            type="button"
            className="modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <div className="modal__body">{children}</div>

        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </section>
    </div>
  );
}
