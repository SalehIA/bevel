import type { ReactNode } from "react";

type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  selectedKey?: string | null;
  onRowClick?: (row: T) => void;
  emptyText?: string;
};

export default function DataGrid<T>({
  columns,
  rows,
  rowKey,
  selectedKey,
  onRowClick,
  emptyText = "لا توجد بيانات",
}: Props<T>) {
  if (!rows.length) {
    return (
      <p className="rounded-xl border border-dashed border-black/15 bg-surface px-4 py-8 text-center text-sm text-muted">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-black/10 bg-white shadow-sm">
      <table className="min-w-max w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-black/10 bg-surface text-start">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap px-4 py-3 font-semibold text-brand ${col.className || ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const selected = selectedKey === key;
            return (
              <tr
                key={key}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-black/5 transition ${onRowClick ? "cursor-pointer hover:bg-accent/10" : ""} ${selected ? "bg-accent/15" : ""}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 align-middle ${col.className || ""}`}>
                    {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key]?.toString()}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
