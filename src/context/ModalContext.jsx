import { createContext, useMemo, useState } from "react";

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

export default ModalContext;
