export default function ZoneRect({ zone, isSelected, onClick }) {
  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <rect
        x={zone.canvasX}
        y={zone.canvasY}
        width={zone.canvasWidth}
        height={zone.canvasHeight}
        fill="rgba(25, 118, 210, 0.15)"
        stroke={isSelected ? '#1976d2' : '#1976d280'}
        strokeWidth={isSelected ? 2 : 1}
      />
      <text
        x={zone.canvasX + 4}
        y={zone.canvasY + 14}
        fontSize={12}
        fill="#1976d2"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {zone.label}
      </text>
    </g>
  )
}
