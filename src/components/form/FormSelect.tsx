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
      <label className="text-sm font-medium text-text-primary" htmlFor={id}>
        {label}
        {mandatory ? <span className="ml-1 text-rag-red">*</span> : null}
      </label>
      <select
        id={id}
        className={`appearance-none rounded-lg border bg-background-elevated px-4 py-2.5 text-sm text-text-primary outline-none focus:border-accent-blue ${
          error ? "border-rag-red" : "border-border"
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
