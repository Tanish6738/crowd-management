import React from 'react';

const DataTable = ({ columns, data, onRowClick, rowKey = 'id', empty, caption }) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl mk-panel">
      <table className="min-w-full text-sm">
        {caption && <caption className="text-left p-3 text-[11px] mk-text-muted">{caption}</caption>}
        <thead className="mk-text-muted">
          <tr className="border-b mk-divider">
            {columns.map(col => (
              <th
                key={col.accessor}
                scope="col"
                className={`px-3 py-2 font-semibold text-[10px] sm:text-[11px] uppercase tracking-[1.3px] text-left whitespace-nowrap mk-text-secondary/80 ${col.hideSm ? 'hidden sm:table-cell' : ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 mk-text-muted text-sm">{empty || 'No records'}</td>
            </tr>
          )}
          {data.map(row => (
            <tr
              key={row[rowKey]}
              tabIndex={0}
              onClick={() => onRowClick?.(row)}
              onKeyDown={e => { if (e.key === 'Enter') onRowClick?.(row); }}
              className="focus:outline-none focus-visible:shadow-[var(--mk-focus-ring)] cursor-pointer mk-row-hover-accent mk-table-zebra transition-colors border-b last:border-0 mk-separator"
            >
              {columns.map(col => (
                <td
                  key={col.accessor}
                  className={`px-3 py-2 whitespace-nowrap align-middle text-[11px] sm:text-[11px] mk-text-secondary ${col.hideSm ? 'hidden sm:table-cell' : ''}`}
                >
                  {col.cell ? col.cell(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
