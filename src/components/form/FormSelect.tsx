// Design Alignment: form field grammar matched to ChisokuLabs (.form-field).
// Report slides remain Phase 1 frozen until explicit unfreeze.

"use client";

interface SelectOption {
  label: string;
  value: string;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  options: SelectOption[];
  error?: string;
  mandatory?: boolean;
  placeholder?: string;
}

export function FormSelect({
  id,
  label,
  options,
  error,
  mandatory,
  className,
  placeholder,
  ...props
}: FormSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink" htmlFor={id}>
        {label}
        {mandatory ? <span className="ml-1 text-rag-red">*</span> : null}
      </label>
      <select
        id={id}
        className={`appearance-none rounded-[3px] border bg-paper px-4 py-2.5 text-sm text-ink outline-none focus:border-cyan ${
          error ? "border-rag-red" : "border-line"
        } ${className ?? ""}`}
        {...props}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-rag-red">{error}</p> : null}
    </div>
  );
}
