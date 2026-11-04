import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Optimized for instant 0ms click-to-render page navigation on all devices,
 * eliminating framer-motion exit/enter lag on low-end phones.
 */
export const PageTransition = ({ children }: PageTransitionProps) => {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
};

export default PageTransition;
