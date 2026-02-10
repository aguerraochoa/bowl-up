interface LeaderboardItem {
  rank: number;
  name: string;
  value: string | number;
  subtitle?: string;
  onClick?: () => void;
}

interface LeaderboardCardProps {
  title: string;
  items: LeaderboardItem[];
  emptyMessage?: string;
  showMoreButton?: boolean;
  onShowMore?: () => void;
  showMoreLabel?: string;
}

export default function LeaderboardCard({
  title,
  items,
  emptyMessage = 'No data yet',
  showMoreButton = false,
  onShowMore,
  showMoreLabel = 'Show More',
}: LeaderboardCardProps) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-amber-400 border-black text-black';
    if (rank === 2) return 'bg-lime-500 border-black text-black';
    if (rank === 3) return 'bg-orange-500 border-black text-black';
    return 'bg-white border-black text-black';
  };

  return (
    <div className="bg-white rounded-none border-4 border-black p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-black text-black mb-4 uppercase break-words">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm sm:text-base text-black text-center py-8 font-bold">{emptyMessage}</p>
      ) : (
        <>
          <div className="space-y-2 sm:space-y-3">
            {items.map((item) => (
              <div
                key={item.rank}
                onClick={item.onClick}
                className={`flex items-center justify-between p-3 sm:p-4 rounded-none border-4 ${getRankColor(item.rank)} ${
                  item.onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
                }`}
              >
                <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-1">
                  <span className="text-lg sm:text-xl font-black w-10 sm:w-12 text-center flex-shrink-0">
                    #{item.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-sm sm:text-base truncate">{item.name}</p>
                    {item.subtitle && (
                      <p className="text-xs font-bold truncate">{item.subtitle}</p>
                    )}
                  </div>
                </div>
                <span className="text-xl sm:text-2xl font-black flex-shrink-0 ml-2">{item.value}</span>
              </div>
            ))}
          </div>
          {showMoreButton && onShowMore && (
            <button
              onClick={onShowMore}
              className="w-full mt-4 bg-amber-400 border-4 border-black text-black py-3 rounded-none font-black hover:bg-amber-500 transition-all"
            >
              {showMoreLabel}
            </button>
          )}
        </>
      )}
    </div>
  );
}
