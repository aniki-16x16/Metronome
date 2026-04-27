import { type ButtonHTMLAttributes, type ReactNode } from 'react'

const iconButtonClassName =
  'inline-flex h-10 w-10 items-center justify-center rounded-md border border-sky-100 bg-white text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-45'

type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'children' | 'type'
> & {
  ariaLabel: string
  children: ReactNode
}

export function IconButton({ ariaLabel, children, className = '', ...buttonProps }: IconButtonProps) {
  return (
    <button
      {...buttonProps}
      type="button"
      className={`${iconButtonClassName} ${className}`.trim()}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  )
}