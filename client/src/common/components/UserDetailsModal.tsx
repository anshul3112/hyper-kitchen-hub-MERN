import ModalShell from "./ModalShell";
import TruncatedText from "./TruncatedText";

export type UserDetailRecord = {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: boolean;
  phoneNumber?: string;
  createdAt?: string;
  tenant?: { tenantId: string; tenantName: string };
  outlet?: { outletId: string; outletName: string };
};

type Props = {
  user: UserDetailRecord;
  roleLabel?: string;
  onClose: () => void;
};

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function UserDetailsModal({ user, roleLabel, onClose }: Props) {
  return (
    <ModalShell title={user.name} subtitle={user.email} onClose={onClose} maxWidthClassName="max-w-2xl">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Role", value: roleLabel || user.role || "-" },
            { label: "Status", value: user.status ? "Active" : "Disabled" },
            { label: "Tenant", value: user.tenant?.tenantName || "-" },
            { label: "Outlet", value: user.outlet?.outletName || "-" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                <TruncatedText text={item.value} maxLength={22} />
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800">User Details</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm text-gray-600">
            <div>
              <dt className="text-gray-400">Full Name</dt>
              <dd className="mt-1 font-medium text-gray-800">
                <TruncatedText text={user.name || "-"} maxLength={36} />
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">Email</dt>
              <dd className="mt-1 font-medium text-gray-800">
                <TruncatedText text={user.email || "-"} maxLength={36} />
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">Phone</dt>
              <dd className="mt-1 font-medium text-gray-800">
                <TruncatedText text={user.phoneNumber || "-"} maxLength={24} />
              </dd>
            </div>
            <div>
              <dt className="text-gray-400">Created</dt>
              <dd className="mt-1 font-medium text-gray-800">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </ModalShell>
  );
}