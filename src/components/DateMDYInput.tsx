import { useEffect, useState, type ComponentProps } from 'react'
import { Input } from './ui/input'
import { formatIsoDateMDYInput, parseMDYInputToIso } from '../lib/utils'

type DateMDYInputProps = Omit<ComponentProps<typeof Input>, 'type' | 'value' | 'onChange'> & {
  value: string
  onChange: (iso: string) => void
}

export function DateMDYInput({ value, onChange, onBlur, ...props }: DateMDYInputProps) {
  const [text, setText] = useState(() => formatIsoDateMDYInput(value))

  useEffect(() => {
    setText(formatIsoDateMDYInput(value))
  }, [value])

  const commit = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      onChange('')
      setText('')
      return
    }

    const iso = parseMDYInputToIso(trimmed)
    if (iso) {
      onChange(iso)
      setText(formatIsoDateMDYInput(iso))
      return
    }

    setText(formatIsoDateMDYInput(value))
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      placeholder="mm/dd/yyyy"
      dir="ltr"
      value={text}
      onChange={(e) => {
        const next = e.target.value
        setText(next)
        const iso = parseMDYInputToIso(next.trim())
        if (iso) onChange(iso)
        else if (!next.trim()) onChange('')
      }}
      onBlur={(e) => {
        commit(e.target.value)
        onBlur?.(e)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit(text)
      }}
    />
  )
}
