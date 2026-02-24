import { useEffect, useState } from "react";
import { fetchOutletStaff, type OutletStaffMember, type OutletStaffRole } from "../api";
import CreateOutletUserModal from "./CreateOutletUserModal";

const ROLE_LABEL: Record<OutletStaffRole, string> = {
  kitchenStaff: "Kitchen Staff",
  billingStaff: "Billing Staff",
};

const ROLE_BADGE: Record<OutletStaffRole, string> = {
  kitchenStaff: "bg-orange-100 text-orange-700",
  billingStaff: "bg-purple-100 text-purple-700",
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function OutletUsersTab() {
  const [staff, setStaff] = useState<OutletStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [filterRole, setFilterRole] = useState<OutletStaffRole | "all">("all");

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchOutletStaff();
      setStaff(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  };

  const handleCreated = (member: OutletStaffMember) => {
    setStaff((prev) => [member, ...prev]);
  };

  const displayed =
    filterRole === "all" ? staff : staff.filter((m) => m.role === filterRole);

  const kitchenCount = staff.filter((m) => m.role === "kitchenStaff").length;
  const billingCount = staff.filter((m) => m.role === "billingStaff").length;

  return (
    <div>
      {/* ── Top bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Staff Members</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage kitchen and billing staff for this outlet
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          + Add Staff Member
        </button>
      </div>

      {/* ── Stat chips ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        {(["all", "kitchenStaff", "billingStaff"] as const).map((r) => {
          const label =
            r === "all"
              ? `All (${staff.length})`
              : r === "kitchenStaff"
              ? `Kitchen Staff (${kitchenCount})`
              : `Billing Staff (${billingCount})`;
          return (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                filterRole === r
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-5 py-4 text-sm mb-4">
          ⚠️ {error}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">Loading staff…</p>
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && displayed.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-14 text-center">
          <p className="text-3xl mb-3">👥</p>
          <p className="text-gray-600 font-medium mb-1">No staff members yet</p>
          <p className="text-sm text-gray-400 mb-4">
            Add kitchen or billing staff to get started.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            Add Staff Member
          </button>
        </div>
      )}

      {/* ── Table ── */}
      {!loading && !error && displayed.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Phone
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Added
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayed.map((member) => (
                <tr key={member._id} className="hover:bg-gray-50 transition-colors">
                  {/* Name + initials avatar */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold flex-shrink-0">
                        {member.name
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{member.email}</td>
                  <td className="px-5 py-4 text-gray-500 hidden sm:table-cell">
                    {member.phoneNumber || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGE[member.role]}`}
                    >
                      {ROLE_LABEL[member.role]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-400 hidden md:table-cell">
                    {formatDate(member.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <CreateOutletUserModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleCreated}
        />
      )}
    </div>
  );
}
