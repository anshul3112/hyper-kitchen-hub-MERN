type Props = {
  label: string;
  value: string | number;
  color?: "blue" | "green" | "red";
};

const colorClass: Record<NonNullable<Props["color"]>, string> = {
  blue: "text-blue-600",
  green: "text-green-600",
  red: "text-red-600",
};

export default function StatCard({ label, value, color = "blue" }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-sm font-medium text-gray-600 mb-2">{label}</h3>
      <p className={`text-3xl font-bold ${colorClass[color]}`}>{value}</p>
    </div>
  );
}
