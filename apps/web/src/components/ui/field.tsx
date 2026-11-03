"use client";

import { Children, createContext, isValidElement, useContext, useId, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type FieldContextValue = { id: string; descriptionId?: string; invalid?: boolean };
const FieldContext = createContext<FieldContextValue | null>(null);
const fieldClass = "w-full rounded-control border border-line-strong bg-white px-3.5 py-2.5 text-body text-ink placeholder:text-muted transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 aria-invalid:border-[#b83244] disabled:bg-canvas disabled:text-muted";

type AccessibleControl = { id?: string; "aria-describedby"?: string; "aria-invalid"?: InputHTMLAttributes<HTMLInputElement>["aria-invalid"] };
function useFieldControl(props: AccessibleControl) {
  const field = useContext(FieldContext);
  return {
    id: props.id ?? field?.id,
    "aria-describedby": [props["aria-describedby"], field?.descriptionId].filter(Boolean).join(" ") || undefined,
    "aria-invalid": props["aria-invalid"] ?? field?.invalid,
  };
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const accessibility = useFieldControl(props);
  return <input {...props} {...accessibility} className={cn(fieldClass, "h-11", className)} />;
}
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const accessibility = useFieldControl(props);
  return <textarea {...props} {...accessibility} className={cn(fieldClass, "min-h-24 resize-y leading-relaxed", className)} />;
}
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const accessibility = useFieldControl(props);
  return <select {...props} {...accessibility} className={cn(fieldClass, "h-11 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%23626e82%22%20stroke-width%3D%221.7%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[right_0.8rem_center] bg-no-repeat pr-9", className)}>{children}</select>;
}

/** Context keeps labels and validation attached even when controls have icon wrappers. */
export function Field({ label, hint, error, children, className, htmlFor }: {
  label?: string; hint?: string; error?: string; children: ReactNode; className?: string; htmlFor?: string;
}) {
  const generatedId = useId();
  const child = Children.count(children) === 1 && isValidElement<{ id?: string }>(children) ? children : null;
  const id = htmlFor ?? child?.props.id ?? generatedId;
  const descriptionId = `${id}-description`;
  return <FieldContext.Provider value={{ id, descriptionId: error || hint ? descriptionId : undefined, invalid: error ? true : undefined }}>
    <div className={className}>
      {label ? <label htmlFor={id} className="mb-1.5 block text-body font-medium text-ink">{label}</label> : null}
      {children}
      {error ? <p id={descriptionId} role="alert" className="mt-1.5 text-caption font-medium text-[#b83244]">{error}</p> : hint ? <p id={descriptionId} className="mt-1.5 text-caption text-muted">{hint}</p> : null}
    </div>
  </FieldContext.Provider>;
}
