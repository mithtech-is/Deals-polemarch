'use client';

import { memo, useMemo } from 'react';
import { ListTable } from '@visactor/react-vtable';

type Column = {
  key: string;
  title: string;
  width?: number | string;
};

type Props = {
  columns: Column[];
  records: Array<Record<string, string | number | null>>;
  height?: number | string;
  onClickRow?: (rowIndex: number, record: Record<string, string | number | null>) => void;
};

export const VisTableShell = memo(function VisTableShell({ columns, records, height = 420, onClickRow }: Props) {
  const option = useMemo(
    () => ({
      header: columns.map((col) => ({
        field: col.key,
        title: col.title,
        width: col.width
      })),
      records,
      defaultRowHeight: 40
    }),
    [columns, records]
  );

  return (
    <ListTable
      option={option}
      height={height}
      onClickCell={(args: { row?: number }) => {
        if (!onClickRow || typeof args?.row !== 'number') return;
        // VTable row index includes the header row at 0.
        const dataRowIndex = args.row - 1;
        if (dataRowIndex < 0) return;
        const record = records[dataRowIndex];
        if (!record) return;
        onClickRow(dataRowIndex, record);
      }}
    />
  );
});
