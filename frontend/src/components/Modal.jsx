import React from "react";

/**
 * Shared modal form used by meal planning and all authentication flows.
 * It centralizes backdrop dismissal, event isolation, and dialog semantics.
 */
export function ModalForm({ children, className = "", onClose, onSubmit }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className={`modal ${className}`.trim()}
        onSubmit={onSubmit}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className="close" type="button" aria-label="Close dialog" onClick={onClose}>×</button>
        {children}
      </form>
    </div>
  );
}

/**
 * Shared heading used by login, signup, and account-recovery dialogs.
 */
export function AuthHeader({ eyebrow, title, description, icon = "N" }) {
  return (
    <>
      <div className="login-mark" aria-hidden="true">{icon}</div>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {description && <p className="login-copy">{description}</p>}
    </>
  );
}
