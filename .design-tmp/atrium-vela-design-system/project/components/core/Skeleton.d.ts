import * as React from 'react';

/** Skeleton — loading placeholder that should mirror the final element's box to avoid reflow. */
export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** CSS width, e.g. "12rem" or "60%". */
  width?: string | number;
  /** CSS height, e.g. "1rem". */
  height?: string | number;
  /** Override border radius. */
  radius?: string | number;
}

export declare function Skeleton(props: SkeletonProps): React.ReactElement;
