import { motion } from 'framer-motion';
import { AlertTriangle, Fan, Zap, HardDrive, Box, Activity, LucideIcon } from 'lucide-react';

interface IndicatorProps {
    label: string;
    percentage: number;
    color: string;
    icon: LucideIcon;
    description?: string;
    isAlarm?: boolean;
}

const CircularIndicator = ({ label, percentage, color, icon: Icon, description, isAlarm }: IndicatorProps) => {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const isNaNVal = isNaN(percentage);

    return (
        <div className="flex flex-col items-center gap-3">
            <div className={`relative w-20 h-20 flex items-center justify-center group`}>
                {/* Background Glow Effect */}
                <div
                    className="absolute inset-0 rounded-full opacity-10 blur-md transition-all duration-500 group-hover:opacity-20"
                    style={{ backgroundColor: color }}
                ></div>

                {/* SVG Progress Circle */}
                <svg className="w-full h-full -rotate-90 relative z-10 drop-shadow-[0_0_2px_rgba(0,0,0,0.1)]">
                    {/* Background Track */}
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="5"
                        className="text-slate-100"
                    />
                    {/* Progress Circle with Glow */}
                    {!isNaNVal && (
                        <motion.circle
                            cx="40"
                            cy="40"
                            r={radius}
                            fill="transparent"
                            stroke={color}
                            strokeWidth="5"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: offset }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                            strokeLinecap="round"
                            style={{ filter: `drop-shadow(0 0 3px ${color}80)` }}
                        />
                    )}
                </svg>

                {/* Center Content: Icon + Percentage */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    <Icon size={18} style={{ color: color }} className="mb-0.5 opacity-80" />
                    <span className="text-[14px] font-black text-slate-900 leading-none font-mono">
                        {isNaNVal ? '-%' : `${Math.round(percentage)}%`}
                    </span>
                </div>
            </div>

            {/* Labels */}
            <div className="text-center">
                <span className={`text-[8px] uppercase font-black tracking-[0.2em] px-2 py-0.5 rounded-full border ${isAlarm ? (percentage > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100') : 'bg-blue-50 text-blue-600 border-blue-100'} transition-all`}>
                    {label}
                </span>
                {description && (
                    <p className="text-[7px] text-slate-400 font-bold uppercase mt-1 tracking-widest opacity-60">
                        {description}
                    </p>
                )}
            </div>
        </div>
    );
};

export const StatusIndicators = ({
    alarms = { hardware: NaN, ventilador: NaN, fuente: NaN, hdd: NaN },
    racksStats = { total: 0, usage: '0' }
}: {
    alarms?: { hardware: number, ventilador: number, fuente: number, hdd: number },
    racksStats?: { total: number, usage: string }
}) => {
    return (
        <div className="flex items-center gap-12 py-2 px-6 bg-white/40 backdrop-blur-sm rounded-2xl border border-slate-200/50 shadow-sm">
            {/* Alarms Group */}
            <div className="flex items-center gap-6 relative pr-8">
                <div className="absolute top-1/2 -translate-y-1/2 right-0 w-px h-12 bg-slate-200"></div>
                <CircularIndicator label="Hardware" percentage={alarms.hardware} color="#ef4444" icon={AlertTriangle} isAlarm />
                <CircularIndicator label="Cooling" percentage={alarms.ventilador} color="#3b82f6" icon={Fan} isAlarm />
                <CircularIndicator label="Power" percentage={alarms.fuente} color="#6366f1" icon={Zap} isAlarm />
                <CircularIndicator label="Storage" percentage={alarms.hdd} color="#f59e0b" icon={HardDrive} isAlarm />
            </div>

            {/* Site Metrics Group */}
            <div className="flex items-center gap-8">
                <CircularIndicator
                    label="Operativo"
                    percentage={racksStats.total > 0 ? 100 : 0}
                    color="#10b981"
                    icon={Box}
                    description={`${racksStats.total} Racks`}
                />
                <CircularIndicator
                    label="Ocupación"
                    percentage={parseFloat(racksStats.usage || '0')}
                    color="#2563eb"
                    icon={Activity}
                    description="Capacidad UR"
                />
            </div>
        </div>
    );
};
