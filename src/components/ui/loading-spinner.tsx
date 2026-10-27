import React from "react";
import { OverraLoader, type OverraLoaderProps } from "./OverraLoader";

/**
 * Universal OverraPrep Loading Indicator
 *
 * Backward-compatible drop-in replacement for the generic spinner.
 * Uses the authentic OverraPrep eagle-in-orbit emblem with a tracing gold orbit.
 */
export const LoadingSpinner: React.FC<OverraLoaderProps> = (props) => {
  return <OverraLoader size={props.size || "md"} variant={props.variant || "page"} {...props} />;
};

/**
 * Compact loading card for tabs, search results, and inner modules.
 */
export const LoadingCard: React.FC<OverraLoaderProps> = (props) => {
  return <OverraLoader size={props.size || "sm"} variant="block" {...props} />;
};

export { OverraLoader };
export default LoadingSpinner;
