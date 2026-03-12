import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info';

interface NotificationToastProps {
    message: string;
    type: NotificationType;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export const NotificationToast = ({ 
    message, 
    type, 
    isVisible, 
    onClose, 
    duration = 5000 
}: NotificationToastProps) => {
    useEffect(() => {
        if (isVisible && duration > 0) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    const config = {
        success: {
            icon: <CheckCircle2 size={20} />,
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
            iconColor: 'text-emerald-500',
            textColor: 'text-emerald-900'
        },
        error: {
            icon: <AlertCircle size={20} />,
            bg: 'bg-red-50',
            border: 'border-red-100',
            iconColor: 'text-red-500',
            textColor: 'text-red-900'
        },
        info: {
            icon: <CheckCircle2 size={20} />,
            bg: 'bg-blue-50',
            border: 'border-blue-100',
            iconColor: 'text-blue-500',
            textColor: 'text-blue-900'
        }
    };

    const current = config[type];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-4 px-6 py-4 rounded-3xl border ${current.bg} ${current.border} shadow-2xl shadow-slate-200/50 min-w-[320px] max-w-[90vw]`}
                >
                    <div className={`${current.iconColor}`}>
                        {current.icon}
                    </div>
                    <p className={`flex-1 font-bold text-sm ${current.textColor}`}>
                        {message}
                    </p>
                    <button 
                        onClick={onClose}
                        className="p-1 hover:bg-slate-200/50 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X size={16} />
                    </button>
                    
                    {/* Progress Bar */}
                    <motion.div 
                        initial={{ width: '100%' }}
                        animate={{ width: '0%' }}
                        transition={{ duration: duration / 1000, ease: 'linear' }}
                        className={`absolute bottom-0 left-0 h-1 rounded-full ${current.iconColor} opacity-20`}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};
