'use client'
import { forwardRef, useState, useEffect } from 'react'

function formatCOP(raw: string | number | undefined): string {
  const str = String(raw ?? '').replace(/\./g, '').replace(/[^0-9]/g, '')
  if (!str) return ''
  const num = Number(str)
  if (isNaN(num) || num === 0) return ''
  return num.toLocaleString('es-CO', { maximumFractionDigits: 0 })
}

function stripNonDigits(v: string): string {
  return v.replace(/\./g, '').replace(/[^0-9]/g, '')
}

/**
 * Input de dinero con formato colombiano (puntos como separadores de miles).
 * Compatible con react-hook-form register() y con useState.
 * Internamente almacena el string numérico limpio ("35000") para que
 * z.coerce.number() funcione correctamente al validar.
 */
export const MoneyInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>
>(({ value, onChange, className, ...rest }, ref) => {
  const [display, setDisplay] = useState(() => formatCOP(value as string | number))

  useEffect(() => {
    setDisplay(formatCOP(value as string | number))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = stripNonDigits(e.target.value)
    setDisplay(raw ? formatCOP(raw) || raw : '')
    onChange?.({
      ...e,
      target:        { ...e.target,        value: raw },
      currentTarget: { ...e.currentTarget, value: raw },
    } as React.ChangeEvent<HTMLInputElement>)
  }

  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      className={className}
    />
  )
})

MoneyInput.displayName = 'MoneyInput'
