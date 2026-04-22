import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-linear-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-8xl font-bold text-linear-purple/20 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">页面未找到</h2>
        <p className="text-linear-text-muted text-sm mb-8">您访问的页面不存在或已被移除</p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-linear-purple hover:bg-linear-purple-dark text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            返回首页
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-linear-surface hover:bg-linear-surface-hover border border-linear-border rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回上页
          </button>
        </div>
      </motion.div>
    </div>
  );
}
