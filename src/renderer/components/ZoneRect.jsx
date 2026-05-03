const HANDLE_R = 5

const CORNER_CURSORS = {
  tl: 'nwse-resize',
  tr: 'nesw-resize',
  bl: 'nesw-resize',
  br: 'nwse-resize',
}

export default function ZoneRect({ zone, isSelected, onClick, onMoveStart, onResizeStart }) {
  const x = zone.canvasX
  const y = zone.canvasY
  const w = zone.canvasWidth
  const h = zone.canvasHeight

  const corners = [
    { key: 'tl', cx: x,     cy: y },
    { key: 'tr', cx: x + w, cy: y },
    { key: 'bl', cx: x,     cy: y + h },
    { key: 'br', cx: x + w, cy: y + h },
  ]

  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h}
        fill="rgba(25, 118, 210, 0.15)"
        stroke={isSelected ? '#1976d2' : '#1976d280'}
        strokeWidth={isSelected ? 2 : 1}
        style={{ cursor: 'move' }}
        onMouseDown={e => { if (onMoveStart) onMoveStart(e); else onClick?.(e) }}
      />
      <text
        x={x + 4} y={y + 14}
        fontSize={12} fill="#1976d2"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {zone.label}
      </text>
      {isSelected && corners.map(({ key, cx, cy }) => (
        <circle
          key={key}
          cx={cx} cy={cy} r={HANDLE_R}
          fill="white"
          stroke="#1976d2"
          strokeWidth={1.5}
          style={{ cursor: CORNER_CURSORS[key] }}
          onMouseDown={e => { e.stopPropagation(); onResizeStart?.(e, key) }}
        />
      ))}
    </g>
  )
}
