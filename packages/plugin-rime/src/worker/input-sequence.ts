const SPECIAL_KEY_ALIASES: Record<string, string> = {
  Backspace: 'BackSpace',
  BackSpace: 'BackSpace',
  Enter: 'Return',
  Return: 'Return',
  Escape: 'Escape',
  Esc: 'Escape',
  Tab: 'Tab',
  ArrowLeft: 'Left',
  Left: 'Left',
  ArrowRight: 'Right',
  Right: 'Right',
  ArrowUp: 'Up',
  Up: 'Up',
  ArrowDown: 'Down',
  Down: 'Down',
  Home: 'Home',
  End: 'End',
  Delete: 'Delete',
  Insert: 'Insert',
  PageUp: 'Page_Up',
  Page_Up: 'Page_Up',
  PageDown: 'Page_Down',
  Page_Down: 'Page_Down',
  '[': 'bracketleft',
  ']': 'bracketright',
}

const MODIFIER_ALIASES: Record<string, string> = {
  Ctrl: 'Control',
  Control: 'Control',
  Alt: 'Alt',
  Option: 'Alt',
  Shift: 'Shift',
  Meta: 'Super',
  Cmd: 'Super',
  Command: 'Super',
  Super: 'Super',
}

function normalizeKeyToken(token: string): string | null {
  if (token.length === 0) {
    return null
  }

  return SPECIAL_KEY_ALIASES[token] ?? null
}

function normalizeModifierToken(token: string): string | null {
  if (token.length === 0) {
    return null
  }

  return MODIFIER_ALIASES[token] ?? null
}

function normalizeCombination(input: string): string | null {
  const parts = input
    .split('+')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  if (parts.length <= 1) {
    return null
  }

  const keyToken = parts[parts.length - 1]
  if (!keyToken) {
    return null
  }
  const modifierTokens = parts.slice(0, -1)
  const normalizedModifiers = modifierTokens
    .map((part) => normalizeModifierToken(part))
    .filter((part): part is string => part !== null)

  if (normalizedModifiers.length !== modifierTokens.length) {
    return null
  }

  const normalizedKey = normalizeKeyToken(keyToken) ?? keyToken.toLowerCase()
  return `${normalizedModifiers.join('+')}+${normalizedKey}`
}

export function normalizeProcessInput(input: string): string {
  if (input.length === 0) {
    return input
  }

  if (input.startsWith('{') && input.endsWith('}')) {
    return input
  }

  const normalizedCombination = normalizeCombination(input)
  if (normalizedCombination) {
    return `{${normalizedCombination}}`
  }

  const normalizedKey = normalizeKeyToken(input)
  if (normalizedKey) {
    return `{${normalizedKey}}`
  }

  return input
}

export function isSpecialProcessInput(input: string): boolean {
  return normalizeProcessInput(input) !== input || (input.startsWith('{') && input.endsWith('}'))
}
