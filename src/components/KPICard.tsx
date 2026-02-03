import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  color?: 'primary' | 'accent' | 'purple' | 'orange';
}

export default function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'primary',
}: KPICardProps) {
  const colorClasses = {
    primary: 'bg-orange-500 border-black text-black',
    accent: 'bg-amber-400 border-black text-black',
    purple: 'bg-lime-500 border-black text-black',
    orange: 'bg-orange-500 border-black text-black',
  };

  return (
    <div className={`rounded-none border-4 p-4 sm:p-6 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black uppercase mb-2 tracking-wide break-words">{title}</p>
          <p className="text-3xl sm:text-4xl md:text-5xl font-black break-words">{value}</p>
          {subtitle && (
            <p className="text-xs mt-2 font-bold break-words">{subtitle}</p>
          )}
        </div>
        {icon && <div className="ml-2 sm:ml-3 flex-shrink-0">{icon}</div>}
      </div>
      {trend && (
        <div className={`flex items-center mt-3 text-sm font-black ${
          trend.isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend.isPositive ? (
            <TrendingUp className="w-4 h-4 mr-1" />
          ) : (
            <TrendingDown className="w-4 h-4 mr-1" />
          )}
          {Math.abs(trend.value)}%
        </div>
      )}
    </div>
  );
}
