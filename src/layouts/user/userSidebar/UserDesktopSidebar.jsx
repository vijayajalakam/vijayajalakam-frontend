import { NavLink } from "react-router-dom";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { userMenu } from "../userMenu.config";

const UserDesktopSidebar = ({ isOpen }) => {
  const filteredMenu = userMenu;

  return (
    <Motion.aside
      initial={false}
      animate={{ width: isOpen ? 240 : 80 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex flex-col border-r border-gray-200 dark:border-dark-border/50 bg-white dark:bg-dark-surface overflow-hidden h-full z-20 hidden lg:flex"
    >
      <div className="flex-1 py-6 px-3 custom-scrollbar overflow-y-auto overflow-x-hidden">
        <div className="space-y-1.5">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center ${isOpen ? "gap-3 px-4" : "justify-center px-0"} py-3 rounded-xl transition-all duration-200 group relative ${
                    isActive
                      ? "bg-blue-50 text-brand-primary shadow-sm shadow-blue-100/50"
                      : "text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card hover:text-gray-900 dark:text-white"
                  }`
                }
                title={!isOpen ? item.label : ""}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-brand-primary dark:text-blue-400" : "text-gray-400 group-hover:text-brand-primary dark:text-blue-400 transition-colors"}`}
                    />
                    <AnimatePresence>
                      {isOpen && (
                        <Motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="text-sm font-medium whitespace-nowrap overflow-hidden"
                        >
                          {item.label}
                        </Motion.span>
                      )}
                    </AnimatePresence>
                    {isActive && (
                      <Motion.div
                        layoutId="active-pill"
                        className="absolute left-0 w-1 h-6 bg-brand-primary rounded-r-full"
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </Motion.aside>
  );
};

export default UserDesktopSidebar;
