export const PAY_MODES = [
  { value: "neft", label: "NEFT" },
  { value: "upi", label: "UPI" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
  { value: "adjustment", label: "Adjustment" },
  { value: "bank", label: "Bank transfer" },
] as const;

export function payModeLabel(mode: string) {
  return PAY_MODES.find((m) => m.value === mode)?.label || mode.replaceAll("_", " ");
}

export function daysFromToday(iso: string | null | undefined) {
  if (!iso) return 0;
  const a = new Date(`${iso}T00:00:00`);
  const b = new Date();
  b.setHours(0, 0, 0, 0);
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function dueCountdown(due: string | null | undefined) {
  if (!due) return "No due date";
  const d = daysFromToday(due);
  if (d > 0) return `Due in ${d} day${d === 1 ? "" : "s"}`;
  if (d === 0) return "Due today";
  const n = Math.abs(d);
  return `${n} day${n === 1 ? "" : "s"} overdue`;
}

export function payStatus(row: {
  status: string;
  payment_status?: string;
  due_date?: string | null;
  outstanding?: string | number;
  amount_paid?: string | number;
}) {
  if (row.payment_status) return row.payment_status;
  if (row.status === "cancelled") return "cancelled";
  if (row.status === "paid" || Number(row.outstanding || 0) <= 0) return "paid";
  const overdue = row.due_date ? daysFromToday(row.due_date) < 0 && Number(row.outstanding || 0) > 0 : false;
  if (overdue) return "overdue";
  if (row.status === "partial" || Number(row.amount_paid || 0) > 0) return "partial";
  return "unpaid";
}

export function payStatusLabel(status: string) {
  return (
    {
      unpaid: "Unpaid",
      partial: "Partially paid",
      paid: "Paid",
      overdue: "Overdue",
      cancelled: "Cancelled",
    }[status] || status
  );
}

export function agingBucket(due: string | null | undefined) {
  const d = due ? -daysFromToday(due) : 0;
  if (d <= 0) return "Current";
  if (d <= 30) return "1–30";
  if (d <= 60) return "31–60";
  if (d <= 90) return "61–90";
  return "90+";
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
