// Design Alignment: form field grammar matched to ChisokuLabs (.form-field).
// Report slides remain Phase 1 frozen until explicit unfreeze.

"use client";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  mandatory?: boolean;
}

export function FormInput({ id, label, error, mandatory, className, ...props }: FormInputProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-ink" htmlFor={id}>
        {label}
        {mandatory ? <span className="ml-1 text-rag-red">*</span> : null}
      </label>
      <input
        id={id}
        className={`rounded-[3px] border bg-paper px-4 py-2.5 text-sm text-ink outline-none placeholder:text-text-muted focus:border-cyan ${
          error ? "border-rag-red" : "border-line"
        } ${className ?? ""}`}
        {...props}
      />
      {error ? <p className="text-xs text-rag-red">{error}</p> : null}
    </div>
  );
}
