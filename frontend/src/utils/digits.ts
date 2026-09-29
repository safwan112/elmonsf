const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩'
const EXTENDED_ARABIC_INDIC = '۰۱۲۳۴۵۶۷۸۹'

/** Convert Arabic-Indic and Persian digits to ASCII digits. */
export function toLatinDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (d) => {
    const i = ARABIC_INDIC.indexOf(d)
    return String(i >= 0 ? i : EXTENDED_ARABIC_INDIC.indexOf(d))
  })
}
