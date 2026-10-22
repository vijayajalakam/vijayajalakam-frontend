import StatCard from "./StatCard";

const StatsGrid = ({ stats, loading = false, isDashboard = false, children }) => {
  const count = stats?.length || 6;

  const getGridClass = () => {
    const hideScrollbar = "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";
    if (isDashboard) {
      return `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full`;
    }
    return `flex overflow-x-auto gap-4 w-full sm:flex-wrap sm:overflow-visible ${hideScrollbar}`;
  };

  const getChildClass = () => {
    if (isDashboard) {
      return "w-full";
    }
    return "w-[240px] shrink-0 sm:w-fit sm:min-w-[220px] sm:shrink";
  };

  if (loading) {
    return (
      <div className={getGridClass()}>
        {[...Array(count)].map((_, i) => (
          <div key={i} className={getChildClass()}>
            <StatCard loading={true} />
          </div>
        ))}
      </div>
    );
  }

  if (!stats || stats.length === 0) return null;

  return (
    <div className={getGridClass()}>
      {stats.map((stat, index) => (
        <div key={index} className={getChildClass()}>
          <StatCard
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            delay={index * 0.1}
          />
        </div>
      ))}
      {children}
    </div>
  );
};

export default StatsGrid;

