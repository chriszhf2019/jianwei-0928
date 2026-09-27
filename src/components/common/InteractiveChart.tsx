import React from 'react';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface ChartProps {
  type: 'bar' | 'area' | 'line' | 'pie';
  data: ChartData[];
  title: string;
  height?: number;
  showValues?: boolean;
  tooltip?: boolean;
}

export function InteractiveChart({ type, data, title, height = 200, showValues = true, tooltip = true }: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
        <p className="text-gray-500 text-sm">暂无数据</p>
      </div>
    );
  }

  const width = 600;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(0, ...data.map(d => d.value));

  const getX = (index: number) => padding.left + (index / (data.length - 1 || 1)) * chartWidth;
  const getY = (value: number) => padding.top + chartHeight - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight;

  const colors = {
    positive: '#10B981',
    negative: '#EF4444',
    neutral: '#6B7280',
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#F59E0B',
  };

  const getBarColor = (index: number, value: number) => {
    if (value >= 0) return colors.positive;
    return colors.negative;
  };

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      
      <div className="relative w-full" style={{ minHeight: height }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* X轴 */}
          {data.map((d, i) => {
            const x = getX(i);
            const angle = i % 2 === 0 ? 0 : 0;
            return (
              <g key={i} transform={`translate(${x},${height - padding.bottom + 15}) rotate(${angle})`}>
                <text 
                  x="0" 
                  y="0" 
                  textAnchor="middle" 
                  className="text-[10px] fill-gray-600"
                  style={{ fontSize: '10px' }}
                >
                  {d.label.length > 6 ? d.label.slice(0, 5) + '...' : d.label}
                </text>
              </g>
            );
          })}

          {/* Y轴 */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
            const value = minValue + (maxValue - minValue) * tick;
            const y = getY(value);
            return (
              <g key={i}>
                <line 
                  x1={padding.left} 
                  y1={y} 
                  x2={width - padding.right} 
                  y2={y} 
                  stroke="#E5E7EB" 
                  strokeWidth="1" 
                />
                <text 
                  x={padding.left - 10} 
                  y={y + 4} 
                  textAnchor="end" 
                  className="text-[10px] fill-gray-600"
                  style={{ fontSize: '10px' }}
                >
                  {Math.round(value)}
                </text>
              </g>
            );
          })}

          {/* 数据 series */}
          {type === 'bar' && data.map((d, i) => {
            const x = getX(i);
            const barWidth = chartWidth / data.length * 0.7;
            const y = getY(d.value);
            const barHeight = Math.max(2, chartHeight - Math.abs(getY(d.value) - getY(0)));
            
            return (
              <g key={i} className="group cursor-pointer">
                <rect
                  x={x - barWidth / 2}
                  y={Math.min(getY(d.value), getY(0))}
                  width={barWidth}
                  height={Math.abs(getY(d.value) - getY(0))}
                  fill={getBarColor(i, d.value)}
                  rx="4"
                />
                {showValues && (
                  <text
                    x={x}
                    y={getY(d.value) - 5}
                    textAnchor="middle"
                    className="text-[10px] fill-gray-700 font-medium"
                    style={{ fontSize: '10px' }}
                  >
                    {Math.round(d.value)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Area/Line chart */}
          {(type === 'area' || type === 'line') && data.length > 1 && (
            <>
              <path
                d={`M${data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(' L')}`}
                fill="none"
                stroke={colors.primary}
                strokeWidth="2"
              />
              {type === 'area' && (
                <path
                  d={`M${getX(0)},${getY(0)} ${data.map((d, i) => `L${getX(i)},${getY(d.value)}`).join(' ')} L${getX(data.length - 1)},${getY(0)} Z`}
                  fill={colors.primary}
                  opacity="0.1"
                />
              )}
              {data.map((d, i) => (
                <circle
                  key={i}
                  cx={getX(i)}
                  cy={getY(d.value)}
                  r="4"
                  fill={colors.primary}
                  className="group cursor-pointer hover:r-6 transition-all"
                >
                  <title>{`${d.label}: ${Math.round(d.value)}`}</title>
                </circle>
              ))}
            </>
          )}

          {/* Zero line */}
          <line 
            x1={padding.left} 
            y1={getY(0)} 
            x2={width - padding.right} 
            y2={getY(0)} 
            stroke="#9CA3AF" 
            strokeWidth="1" 
            strokeDasharray="4 4"
          />
        </svg>
      </div>

      {/* Legend */}
      {type === 'bar' && (
        <div className="flex gap-3 mt-2 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div>
            <span>正值</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
            <span>负值</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function RadarChart({ data, title }: { data: ChartData[]; title: string }) {
  if (data.length === 0) return null;

  const size = 200;
  const padding = 40;
  const radius = (size - padding * 2) / 2;
  const center = size / 2;
  
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col items-center">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[200px] h-auto">
        {/* Grid circles */}
        {[0.25, 0.5, 0.75, 1].map((tick, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius * tick}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="1"
          />
        ))}

        {/* Axes */}
        {data.map((d, i) => {
          const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;
          
          return (
            <g key={i}>
              <line x1={center} y1={center} x2={x} y2={y} stroke="#E5E7EB" strokeWidth="1" />
              <text
                x={center + Math.cos(angle) * (radius + 15)}
                y={center + Math.sin(angle) * (radius + 15)}
                textAnchor="middle"
                className="text-[10px] fill-gray-600"
                style={{ fontSize: '10px' }}
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* Data area */}
        <polygon
          points={data
            .map((d, i) => {
              const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
              const r = (d.value / 100) * radius;
              return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
            })
            .join(' ')}
          fill="#3B82F6"
          fillOpacity="0.2"
          stroke="#3B82F6"
          strokeWidth="2"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
          const r = (d.value / 100) * radius;
          return (
            <circle
              key={i}
              cx={center + Math.cos(angle) * r}
              cy={center + Math.sin(angle) * r}
              r="4"
              fill="#3B82F6"
            />
          );
        })}
      </svg>

      <div className="mt-2 text-xs text-gray-500 text-center">
        {data.length} 个维度，最大值: {Math.max(...data.map(d => d.value))}
      </div>
    </div>
  );
}

export function Heatmap({ data, title }: { data: number[][]; title: string }) {
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${data[0]?.length || 0}, minmax(0, 1fr))` }}>
        {data.map((row, rowIndex) =>
          row.map((value, colIndex) => {
            const intensity = Math.min(value / 100, 1);
            const opacity = 0.2 + intensity * 0.8;
            const color = opacity > 0.5 ? '#ffffff' : '#374151';
            
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="aspect-square rounded flex items-center justify-center text-[10px] font-medium"
                style={{ 
                  backgroundColor: `rgba(59, 130, 246, ${opacity})`,
                  color: color
                }}
                title={`${value}`}
              >
                {value > 0 ? value : ''}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default { InteractiveChart, RadarChart, Heatmap };
