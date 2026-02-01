import type { ReactNode } from "react";

export type Column<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
};

export function DataTable<T extends { id?: string | number }>({ columns, data, emptyMessage }: DataTableProps<T>) {
  const shouldScroll = data.length > 10;

  return (
    <div
      className={
        "overflow-hidden rounded-2xl border border-white/10 bg-black/70" +
        (shouldScroll ? " max-h-96 overflow-y-auto" : "")
      }
    >
      <table className="min-w-full text-left text-xs text-zinc-300">
        <thead className="bg-white/5 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          <tr>
            {columns.map((col) => (
              <th key={col.header} className="px-3 py-2 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-[11px] text-zinc-500">
                {emptyMessage || "No records"}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr key={(row.id as string) ?? idx} className="border-t border-white/5 hover:bg-white/5">
                {columns.map((col) => (
                  <td key={col.header} className={`px-3 py-2 align-middle ${col.className || ""}`}>
                    {col.render ? col.render(row) : ((row as any)[col.key] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
