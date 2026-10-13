'use client'

/**
 * Lo que acompaña a un mensaje de Sophia en el chat (spec §6.3):
 * - Tarjetas «Ver en el panel» por cada bloque que citó con [[block:ID]].
 *   En celular la imagen va en miniatura dentro de la tarjeta.
 * - Botones para las alternativas «A) … B) …» del último mensaje.
 */
import { Layers } from 'lucide-react'
import { citedBlocksInOrder, type ChoiceOption } from '@/lib/material-markers'
import { useMaterial } from './material-context'

export function MaterialChips({ content }: { content: string }) {
  const { blocksById, openBlock } = useMaterial()
  const bloques = citedBlocksInOrder(content)
    .map((id) => blocksById.get(id))
    .filter((b) => b !== undefined)
  if (bloques.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {bloques.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => openBlock(b.id)}
          className="min-h-11 inline-flex max-w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-left text-sm text-[#09222d] shadow-sm hover:bg-gray-50"
        >
          {b.type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.url} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover lg:hidden" />
          ) : null}
          <Layers className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
          <span className="truncate">
            <span className="text-gray-600">Ver en el panel: </span>
            <span className="font-semibold">{b.title}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

export function ChoiceButtons({
  options,
  onChoose,
  disabled = false,
}: {
  options: ChoiceOption[]
  onChoose: (texto: string) => void
  disabled?: boolean
}) {
  return (
    <div role="group" aria-label="Alternativas" className="mt-3 flex flex-col gap-2">
      {options.map((o) => (
        <button
          key={o.letter}
          type="button"
          disabled={disabled}
          onClick={() => onChoose(`${o.letter}) ${o.text}`)}
          className="min-h-11 flex w-full items-start gap-3 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-left text-[15px] leading-snug text-gray-900 hover:border-[#09222d] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#09222d] text-xs font-bold text-[#fbc50b]">
            {o.letter}
          </span>
          <span>{o.text}</span>
        </button>
      ))}
      <p className="text-xs text-gray-500">También puedes escribir o decir tu respuesta.</p>
    </div>
  )
}
