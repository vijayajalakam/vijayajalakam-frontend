import { NavLink } from 'react-router-dom'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { userMenu } from '../userMenu.config'
import { X } from 'lucide-react'

const UserMobileSidebar = ({ isOpen, onClose }) => {
    const filteredMenu = userMenu

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <Motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 lg:hidden"
                    />

                    {/* Sidebar Drawer */}
                    <Motion.aside
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
                        className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-dark-surface shadow-2xl z-50 lg:hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-dark-border">
                            <div className="flex items-center gap-2">
                                <span className="p-1 px-2.5 bg-brand-primary rounded-lg text-white font-bold text-lg">S</span>
                                <span className="font-bold text-gray-900 dark:text-white tracking-tight text-lg">SALON SYSTEM</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-gray-400 hover:text-gray-900 dark:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
                            {filteredMenu.map((item) => {
                                const Icon = item.icon
                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        onClick={onClose}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 ${isActive
                                                ? 'bg-blue-50 text-brand-primary shadow-sm shadow-blue-100/50'
                                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card hover:text-gray-900 dark:text-white'
                                            }`
                                        }
                                    >
                                        <Icon className="w-5 h-5 flex-shrink-0" />
                                        <span className="text-sm font-medium tracking-tight">{item.label}</span>
                                    </NavLink>
                                )
                            })}
                        </nav>
                    </Motion.aside>
                </>
            )}
        </AnimatePresence>
    )
}

export default UserMobileSidebar
