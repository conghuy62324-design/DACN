type Props = { budget: number; estimate: number; onRevise?: () => void };

/** Always reflects the displayed amounts, including edits and reopened Trips. */
export function PlannerBudgetNotice({ budget, estimate, onRevise }: Props) {
  const excess = Math.max(0, Math.round((estimate - budget) * 100) / 100);
  const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
  return (
    <section data-testid="planner-budget-notice" role={excess > 0 ? 'alert' : 'status'}
      className={`p-3 rounded-xl border text-sm space-y-1 ${excess > 0 ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
      <p>Ngân sách: {money(budget)} • Dự toán cả nhóm: {money(estimate)}</p>
      {excess > 0 ? <>
        <p className="font-bold">Vượt ngân sách: {money(excess)}</p>
        <p>Phương án tham khảo chưa đáp ứng ngân sách. Có thể lưu kèm cảnh báo này, hoặc sửa yêu cầu và tạo lại.</p>
      </> : <p>Dự toán trong ngân sách đã nhập; giá thực tế và các khoản chưa tính có thể khác.</p>}
      {onRevise && <button type="button" onClick={onRevise} className="font-bold underline">Sửa yêu cầu và tạo lại</button>}
    </section>
  );
}
