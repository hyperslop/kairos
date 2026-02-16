import React, { useRef, useCallback, useEffect } from 'react';

const ClockFace = ({ value, max, onChange, onComplete, size = 160, overclock = false, label }) => {
  const svgRef = useRef(null);
  const dragging = useRef(false);
  const onChangeRef = useRef(onChange);
  const onCompleteRef = useRef(onComplete);

  // Keep refs in sync with latest props without re-triggering effects
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 8;

  // In 24H hour mode, single ring with all 24 numbers
  const numbers = label === 'HOUR'
    ? (overclock
      ? Array.from({ length: 24 }, (_, i) => i + 1)
      : Array.from({ length: 12 }, (_, i) => i + 1))
    : Array.from({ length: 12 }, (_, i) => i * 5);

  const numberR = outerR - 18;
  const handR = outerR - 28;

  const getAngleForValue = useCallback((val) => {
    if (label === 'HOUR') {
      if (overclock) {
        return (val / 24) * 360 - 90;
      }
      return ((val % 12) / 12) * 360 - 90;
    }
    return (val / 60) * 360 - 90;
  }, [label, overclock]);

  const getValueFromAngle = useCallback((angleDeg) => {
    let norm = (angleDeg + 90 + 360) % 360;
    if (label === 'HOUR') {
      if (overclock) {
        let h = Math.round((norm / 360) * 24);
        if (h === 0) h = 24;
        return h;
      }
      let h = Math.round((norm / 360) * 12);
      if (h === 0) h = 12;
      return h;
    }
    let m = Math.round((norm / 360) * 60);
    if (m === 60) m = 0;
    return m;
  }, [label, overclock]);

  const handlePointer = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX == null || clientY == null) return;
    const x = clientX - rect.left - size / 2;
    const y = clientY - rect.top - size / 2;
    const angle = Math.atan2(y, x) * (180 / Math.PI);
    const val = getValueFromAngle(angle);
    onChangeRef.current(val);
  }, [size, getValueFromAngle]);

  const onDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    handlePointer(e);
  }, [handlePointer]);

  const onMove = useCallback((e) => {
    if (dragging.current) {
      e.preventDefault();
      handlePointer(e);
    }
  }, [handlePointer]);

  const onUp = useCallback(() => {
    if (dragging.current) {
      dragging.current = false;
      if (onCompleteRef.current) onCompleteRef.current();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
  }, [onMove, onUp]);

  const handAngle = value !== null ? getAngleForValue(value) : -90;
  const actualHandX = cx + Math.cos((handAngle * Math.PI) / 180) * handR;
  const actualHandY = cy + Math.sin((handAngle * Math.PI) / 180) * handR;

  return (
    <div className="flex flex-col items-center">
      <svg
        ref={svgRef}
        width={size}
        height={size}
        className="cursor-pointer select-none"
        onMouseDown={onDown}
        onTouchStart={onDown}
        style={{ touchAction: 'none' }}
      >
        <circle cx={cx} cy={cy} r={outerR} fill="#111827" stroke="#374151" strokeWidth="2" />

        {/* Numbers around the clock */}
        {numbers.map((num, i) => {
          let angle;
          if (label === 'HOUR') {
            if (overclock) {
              // 24 evenly spaced positions
              angle = (num / 24) * 360 - 90;
            } else {
              // 12 hours: position based on value, not index
              angle = (num / 12) * 360 - 90;
            }
          } else {
            // Minutes: index-based works since 0 is at index 0
            angle = (i / numbers.length) * 360 - 90;
          }

          const x = cx + Math.cos((angle * Math.PI) / 180) * numberR;
          const y = cy + Math.sin((angle * Math.PI) / 180) * numberR;
          const isSelected = value === num || (label === 'MINUTE' && value === 0 && num === 0);
          const displayNum = label === 'MINUTE' ? String(num).padStart(2, '0') : num;
          const fontSize = overclock && label === 'HOUR' ? 9 : 12;

          return (
            <text
              key={num + '-' + i}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={isSelected ? '#60a5fa' : '#9ca3af'}
              fontSize={fontSize}
              fontFamily="monospace"
              fontWeight={isSelected ? 'bold' : 'normal'}
            >
              {displayNum}
            </text>
          );
        })}

        {value !== null && (
          <>
            <line
              x1={cx}
              y1={cy}
              x2={actualHandX}
              y2={actualHandY}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx={actualHandX} cy={actualHandY} r={6} fill="#3b82f6" />
            <circle cx={cx} cy={cy} r={3} fill="#3b82f6" />
          </>
        )}
      </svg>
    </div>
  );
};

export default ClockFace;
