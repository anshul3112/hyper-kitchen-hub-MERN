import { useState } from "react";
import { toggleOutletStatus, type Outlet } from "../api";

type Props = {
  outlets: Outlet[];
  loading: boolean;
  error: string;
  onAddClick: () => void;
  onAddAdminClick: () => void;
  onToggle: (updated: Outlet) => void;
};

export default function OutletsTable({ outlets, loading, error, onAddClick, onAddAdminClick, onToggle }: Props) {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<Record<string, string>>({});

  const handleToggle = async (outlet: Outlet) => {
    setTogglingId(outlet._id);
    setToggleError((prev) => ({ ...prev, [outlet._id]: "" }));
    try {
      const updated = await toggleOutletStatus(outlet._id);
      onToggle(updated);
    } catch (err: unknown) {
      setToggleError((prev) => ({
        ...prev,
        [outlet._id]: err instanceof Error ? err.message : "Action failed",
      }));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Manage Outlets</h2>
        <div className="flex gap-2">
          <button
            onClick={onAddAdminClick}
            className="px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors"
          >
            Add Outlet Admin
          </button>
          <button
            onClick={onAddClick}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
          >
            Add New Outlet
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <p className="text-center text-gray-600">Loading outlets...</p>
        </div>
      ) : outlets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <p className="text-center text-gray-600">No outlets found</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {outlets.map((outlet) => {
                  const isToggling = togglingId === outlet._id;
                  const rowError = toggleError[outlet._id];
                  return (
                    <tr key={outlet._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {outlet.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {outlet.address || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            outlet.status
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {outlet.status ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {outlet.createdAt ? new Date(outlet.createdAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleToggle(outlet)}
                            disabled={isToggling}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors disabled:opacity-50 ${
                              outlet.status
                                ? "bg-red-50 border border-red-300 text-red-600 hover:bg-red-100"
                                : "bg-green-50 border border-green-300 text-green-700 hover:bg-green-100"
                            }`}
                          >
                            {isToggling
                              ? outlet.status ? "Disabling..." : "Enabling..."
                              : outlet.status ? "Disable" : "Enable"}
                          </button>
                          {rowError && (
                            <p className="text-xs text-red-500">{rowError}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
