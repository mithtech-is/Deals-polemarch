'use client';

import { memo, useMemo } from 'react';
import { ListTable } from '@visactor/react-vtable';

type Column = {
  key: string;
  title: string;
  width?: number | string;
};

type CellStyle = { color?: string; fontWeight?: string | number };

type Props = {
  columns: Column[];
  records: Array<Record<string, unknown>>;
  height?: number | string;
  onClickRow?: (rowIndex: number, record: Record<string, unknown>, field?: string) => void;
  cellStyle?: (args: { field: string; record: Record<string, unknown> }) => CellStyle | undefined;
};

export const VisTableShell = memo(function VisTableShell({ columns, records, height = 420, onClickRow, cellStyle }: Props) {
  const option = useMemo(
    () => ({
      header: columns.map((col) => ({
        field: col.key,
        title: col.title,
        width: col.width,
        style: cellStyle
          ? (args: { row?: number }) => {
              const idx = typeof args?.row === 'number' ? args.row - 1 : -1;
              if (idx < 0) return undefined;
              const rec = records[idx];
              if (!rec) return undefined;
              return cellStyle({ field: col.key, record: rec });
            }
          : undefined
      })),
      records,
      defaultRowHeight: 40
    }),
    [columns, records, cellStyle]
  );

  return (
    <ListTable
      option={option}
      height={height}
      onClickCell={(args: { row?: number; col?: number }) => {
        if (!onClickRow || typeof args?.row !== 'number') return;
        // VTable row index includes the header row at 0.
        const dataRowIndex = args.row - 1;
        if (dataRowIndex < 0) return;
        const record = records[dataRowIndex];
        if (!record) return;
        const field = typeof args.col === 'number' ? columns[args.col]?.key : undefined;
        onClickRow(dataRowIndex, record, field);
      }}
    />
  );
});
