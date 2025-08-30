import React from 'react';

const DataTable = ({ columns, data, onRowClick, rowKey = 'id', empty, caption }) => {
  return (
    <div className="w-full overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm">
      <table className="min-w-full text-sm">
        {caption && <caption className="text-left p-3 text-xs text-gray-500">{caption}</caption>}
        <thead className="bg-gray-100/70 text-gray-600">
          <tr>
            {columns.map(col => (
              <th
                key={col.accessor}
                scope="col"
                className={`px-3 py-2 font-medium text-[10px] sm:text-xs uppercase tracking-wide text-left whitespace-nowrap ${col.hideSm ? 'hidden sm:table-cell' : ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="text-center py-6 text-gray-500 text-sm">{empty || 'No records'}</td>
            </tr>
          )}
          {data.map(row => (
            <tr
              key={row[rowKey]}
              tabIndex={0}
              onClick={() => onRowClick?.(row)}
              onKeyDown={e => { if (e.key === 'Enter') onRowClick?.(row); }}
              className="focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1 cursor-pointer even:bg-gray-50 hover:bg-orange-50 transition-colors"
            >
              {columns.map(col => (
                <td
                  key={col.accessor}
                  className={`px-3 py-2 whitespace-nowrap align-middle text-[11px] sm:text-xs ${col.hideSm ? 'hidden sm:table-cell' : ''}`}
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
