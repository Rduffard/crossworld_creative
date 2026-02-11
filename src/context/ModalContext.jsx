import { createContext, useContext, useMemo, useState } from "react";

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null);
  // modal shape: { type: string, props?: object }

  const value = useMemo(() => {
    return {
      openModal: (type, props = {}) => setModal({ type, props }),
      closeModal: () => setModal(null),
      modal,
    };
  }, [modal]);

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used inside ModalProvider");
  return ctx;
}
