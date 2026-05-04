import { Check, ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type PickerOption<T extends string | number> = {
  value: T
  label: string
}

type PickerPosition = {
  top: number
  left: number
  width: number
}

type OptionPickerProps<T extends string | number> = {
  id: string
  value: T
  options: Array<PickerOption<T>>
  onChange: (value: T) => void
}

const pickerButtonClassName =
  'flex h-11 w-full items-center justify-between gap-2 rounded-md border border-sky-100 bg-white px-3 text-sm font-medium text-slate-700 shadow-inner shadow-sky-50 transition hover:border-teal-200 hover:bg-teal-50/60 focus:border-teal-300 focus:outline-none'

export function OptionPicker<T extends string | number>({
  id,
  value,
  options,
  onChange,
}: OptionPickerProps<T>) {
  const selectedOption = options.find((option) => option.value === value) ?? options[0]
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [menuPosition, setMenuPosition] = useState<PickerPosition | null>(null)

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current
    if (!button) {
      return
    }

    const buttonBounds = button.getBoundingClientRect()
    setMenuPosition({
      top: buttonBounds.bottom,
      left: buttonBounds.left,
      width: buttonBounds.width,
    })
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleOutsidePointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }

      setIsOpen(false)
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [isOpen, updateMenuPosition])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className={pickerButtonClassName}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-listbox`}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false)
            return
          }

          updateMenuPosition()
          setIsOpen(true)
        }}
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown
          size={16}
          strokeWidth={2.4}
          className={`shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen &&
        menuPosition &&
        createPortal(
          <div
            id={`${id}-listbox`}
            ref={menuRef}
            className="fixed z-[1000] overflow-hidden rounded-md border border-sky-100 bg-white p-1 shadow-[0_16px_40px_rgba(91,141,166,0.18)]"
            role="listbox"
            style={menuPosition}
          >
            {options.map((option) => {
              const isSelected = option.value === value
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`flex h-10 w-full items-center justify-between rounded-sm px-3 text-left text-sm font-medium transition ${
                    isSelected
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-slate-600 hover:bg-sky-50'
                  }`}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check size={16} strokeWidth={2.4} />}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </div>
  )
}