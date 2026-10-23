// Design Alignment: form field grammar matched to ChisokuLabs (.form-field).
// Report slides remain Phase 1 frozen until explicit unfreeze.

"use client";

interface FormDatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  mandatory?: boolean;
}

export function FormDatePicker({
  id,
  label,
  error,
  mandatory,
  className,
  ...props
}: FormDatePickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink" htmlFor={id}>
        {label}
        {mandatory ? <span className="ml-1 text-rag-red">*</span> : null}
      </label>
      <input
        id={id}
        type="date"
        className={`rounded-[3px] border bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-cyan ${
          error ? "border-rag-red" : "border-line"
        } ${className ?? ""}`}
        {...props}
      />
      {error ? <p className="text-xs text-rag-red">{error}</p> : null}
    </div>
  );
}
