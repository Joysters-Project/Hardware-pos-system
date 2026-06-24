import { NavLink, Outlet } from 'react-router-dom';
import { Package, Building2, ShoppingCart, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/suppliers', label: 'Suppliers', icon: Building2 },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/procurement', label: 'Procurement', icon: FileText },
];

const sidebarVariants = {
  hidden: { x: -100, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
      staggerChildren: 0.1,
    },
  },
};

const navItemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3 },
  },
};

function Layout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <motion.aside
        variants={sidebarVariants}
        initial="hidden"
        animate="visible"
        className="fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200/50 bg-white/80 backdrop-blur-xl shadow-xl"
      >
        <div className="flex h-20 items-center border-b border-slate-200/50 px-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                POS System
              </h1>
              <p className="text-xs text-slate-500">Hardware Store</p>
            </div>
          </motion.div>
        </div>
        
        <nav className="space-y-2 p-4">
          <motion.p
            variants={navItemVariants}
            className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            Management
          </motion.p>
          {navItems.map((item) => (
            <motion.div key={item.to} variants={navItemVariants}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        'h-5 w-5 transition-transform group-hover:scale-110',
                        isActive ? 'text-white' : 'text-slate-400'
                      )}
                    />
                    {item.label}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="ml-auto h-2 w-2 rounded-full bg-white"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            </motion.div>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200/50 p-4">
          <div className="rounded-xl bg-gradient-to-r from-slate-100 to-slate-50 p-4">
            <p className="text-xs text-slate-500">Logged in as</p>
            <p className="text-sm font-medium text-slate-700">Admin User</p>
          </div>
        </div>
      </motion.aside>
      
      <main className="pl-72">
        <div className="min-h-screen p-8">
          <AnimatePresence mode="wait">
            <Outlet />
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default Layout;
