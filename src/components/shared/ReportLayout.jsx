const ReportLayout = ({ title, subtitle, children }) => {
  return (
    <div className="p-4 md:p-6 space-y-3 md:space-y-6 animate-in fade-in duration-500">
      {title && <div id="report-title-meta" data-title={title} className="hidden" />}
      {children}
    </div>
  );
};

export default ReportLayout;
