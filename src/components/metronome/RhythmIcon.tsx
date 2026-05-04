import { type RhythmId } from '../../lib/metronome'

export function RhythmIcon({ rhythmId }: { rhythmId: RhythmId }) {
  const note = (xPosition: number, yPosition = 25) => (
    <>
      <ellipse cx={xPosition} cy={yPosition} rx="3.8" ry="2.7" />
      <path d={`M${xPosition + 3.4} ${yPosition - 1.6}V8`} />
    </>
  )

  return (
    <svg
      viewBox="0 0 64 36"
      className="h-10 w-full"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
    >
      {rhythmId === 'quarter' && <>{note(30)}</>}
      {rhythmId === 'eighth' && (
        <>
          {note(22)}
          {note(42)}
          <path d="M25.4 8H45.4" />
        </>
      )}
      {rhythmId === 'sixteenth' && (
        <>
          {[14, 26, 38, 50].map((xPosition) => note(xPosition))}
          <path d="M17.4 8H53.4" />
          <path d="M17.4 13H53.4" />
        </>
      )}
      {rhythmId === 'sixteenthEighthSixteenth' && (
        <>
          {[16, 32, 48].map((xPosition) => note(xPosition))}
          <path d="M19.4 8H51.4" />
          <path d="M19.4 13H29.4" />
          <path d="M41.4 13H51.4" />
        </>
      )}
      {rhythmId === 'dottedFront' && (
        <>
          {note(23)}
          <circle cx="32" cy="23" r="1.4" fill="currentColor" stroke="none" />
          {note(45, 26)}
          <path d="M26.4 8H48.4" />
        </>
      )}
      {rhythmId === 'dottedBack' && (
        <>
          {note(20, 26)}
          {note(42)}
          <circle cx="51" cy="23" r="1.4" fill="currentColor" stroke="none" />
          <path d="M23.4 8H45.4" />
        </>
      )}
      {rhythmId === 'triplet' && (
        <>
          {[18, 32, 46].map((xPosition) => note(xPosition))}
          <path d="M21.4 8V6H49.4V8" />
          <text
            x="35"
            y="5"
            textAnchor="middle"
            className="fill-current text-[8px] font-semibold"
            stroke="none"
          >
            3
          </text>
        </>
      )}
      {rhythmId === 'swing' && (
        <>
          {note(22)}
          {note(44)}
          <path d="M25.4 8H47.4" />
          <path d="M18 31C28 35 40 35 50 28" />
          <path d="M50 28l-2 5" />
        </>
      )}
    </svg>
  )
}