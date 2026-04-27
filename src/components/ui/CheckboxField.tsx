type CheckboxFieldProps = {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function CheckboxField({ label, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="mt-5 flex items-center gap-3 rounded-md bg-rose-50/70 px-3 py-3 text-sm font-semibold text-slate-700">
      <input
        type="checkbox"
        className="h-5 w-5 rounded border-rose-200 text-rose-500 accent-rose-500"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  )
}