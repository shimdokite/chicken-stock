"use client";

import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import type { FinancialTableRow } from "../types";

type FinancialTableProps = {
  columns: string[];
  rows: FinancialTableRow[];
};

export default function FinancialTable({ columns, rows }: FinancialTableProps) {
  const tableColumns = useMemo<ColumnDef<FinancialTableRow>[]>(
    () => [
      {
        accessorKey: "item",
        header: "항목",
        cell: (info) => info.getValue(),
      },
      ...columns.map((column) => ({
        id: column,
        header: column,
        accessorFn: (row: FinancialTableRow) => row.values[column] ?? "-",
      })),
    ],
    [columns],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-full table-fixed text-center text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 pb-3 font-medium text-zinc-500 first:w-24"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-3 py-1.5 text-xs font-medium whitespace-nowrap text-zinc-500 first:text-left"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
