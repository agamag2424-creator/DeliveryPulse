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
      <label className="text-sm font-medium text-text-primary" htmlFor={id}>
        {label}
        {mandatory ? <span className="ml-1 text-rag-red">*</span> : null}
      </label>
      <input
        id={id}
        type="date"
        className={`rounded-lg border bg-background-elevated px-4 py-2.5 text-sm text-text-primary outline-none focus:border-accent-blue ${
          error ? "border-rag-red" : "border-border"
        } ${className ?? ""}`}
        {...props}
      />
      {error ? <p className="text-xs text-rag-red">{error}</p> : null}
    </div>
  );
}
