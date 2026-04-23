export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "danger" | "accent";
}) {
  const toneClassName =
    tone === "success"
      ? "bg-moss-100 text-moss-800"
      : tone === "danger"
        ? "bg-clay-100 text-clay-800"
        : tone === "accent"
          ? "bg-amber-100 text-amber-800"
          : "bg-stone-100 text-stone-700";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneClassName}`}>
      {label}
    </span>
  );
}
