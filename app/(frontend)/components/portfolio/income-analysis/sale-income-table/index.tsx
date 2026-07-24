"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import type { SaleIncomeRow } from "@/app/(frontend)/types/portfolio/income-analysis";
import {
  formatNullableWon,
  formatRate,
  formatSignedWon,
  formatWon,
} from "@/app/(frontend)/utils/portfolio/income-analysis";

const saleIncomeColumns: ColumnDef<SaleIncomeRow>[] = [
  {
    accessorKey: "saleDate",
    header: "판매일",
  },
  {
    accessorKey: "assetType",
    header: "종목유형",
  },
  {
    accessorKey: "companyName",
    header: "종목명",
  },
  {
    accessorKey: "saleProfit",
    cell: ({ row }) => formatSignedWon(row.original.saleProfit),
    header: "총 판매수익",
  },
  {
    accessorKey: "profitRate",
    cell: ({ row }) => formatRate(row.original.profitRate),
    header: "수익률",
  },
  {
    accessorKey: "totalSaleAmount",
    cell: ({ row }) => formatWon(row.original.totalSaleAmount),
    header: "총 판매대금",
  },
  {
    accessorKey: "totalPurchaseAmount",
    cell: ({ row }) => formatNullableWon(row.original.totalPurchaseAmount),
    header: "총 구매금액",
  },
  {
    accessorKey: "totalQuantity",
    cell: ({ row }) =>
      `${row.original.totalQuantity.toLocaleString("ko-KR")}주`,
    header: "판매수량",
  },
  {
    accessorKey: "fee",
    cell: ({ row }) => formatWon(row.original.fee),
    header: "수수료",
  },
];

const gridClassName =
  "grid min-w-[66.5rem] grid-cols-[6.5rem_7.5rem_7rem_8.5rem_6rem_8.5rem_8.5rem_7rem_7rem] justify-between";

interface SaleIncomeTableProps {
  rows: SaleIncomeRow[];
}

export default function SaleIncomeTable({ rows }: SaleIncomeTableProps) {
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table instance functions stay local to this component.
  const table = useReactTable({
    columns: saleIncomeColumns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="overflow-x-auto pt-2 pb-4">
      <div className="min-w-[66.5rem]" role="table" aria-label="판매수익">
        <div
          className="border-b border-(--cs-border-subtle) pb-3 text-sm font-medium text-(--cs-text-muted)"
          role="rowgroup"
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <div key={headerGroup.id} className={gridClassName} role="row">
              {headerGroup.headers.map((header) => (
                <span key={header.id} role="columnheader">
                  {!header.isPlaceholder &&
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                </span>
              ))}
            </div>
          ))}
        </div>

        <div className="min-h-[380px] py-6 md:py-9" role="rowgroup">
          {rows.length === 0 && (
            <div
              className="row center h-60 text-lg text-(--cs-color-gray-700)"
              role="row"
            >
              <span role="cell" aria-colspan={saleIncomeColumns.length}>
                판매수익이 없습니다.
              </span>
            </div>
          )}

          {rows.length > 0 && (
            <div className="col gap-3">
              {table.getRowModel().rows.map((row) => (
                <div
                  key={row.id}
                  className={`${gridClassName} text-base`}
                  role="row"
                >
                  {row.getVisibleCells().map((cell) => (
                    <span key={cell.id} role="cell">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
