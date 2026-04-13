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
      <label className="text-sm font-medium text-text-primary" htmlFor={id}>
        {label}
        {mandatory ? <span className="ml-1 text-rag-red">*</span> : null}
      </label>
      <input
        id={id}
        className={`rounded-lg border bg-background-elevated px-4 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent-blue ${
          error ? "border-rag-red" : "border-border"
        } ${className ?? ""}`}
        {...props}
      />
      {error ? <p className="text-xs text-rag-red">{error}</p> : null}
    </div>
  );
}
