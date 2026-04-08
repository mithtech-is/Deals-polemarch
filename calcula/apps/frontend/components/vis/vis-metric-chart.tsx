'use client';

import { memo } from 'react';
import { VChart } from '@visactor/react-vchart';

type Props = {
  spec: any;
  height?: number;
};

export const VisMetricChart = memo(function VisMetricChart({ spec, height = 320 }: Props) {
  return (
    <div style={{ height }}>
      <VChart spec={spec} />
    </div>
  );
});
