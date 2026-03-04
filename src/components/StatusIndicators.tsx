import { motion } from 'framer-motion';

interface IndicatorProps {
    label: string;
    percentage: number;
    color: string;
    description?: string;
}

const CircularIndicator = ({ label, percentage, color, description }: IndicatorProps) => {
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const isNaNVal = isNaN(percentage);

    return (
        <div className="flex flex-col items-center gap-3">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-tight text-center whitespace-nowrap opacity-80">
                {label}
            </span>
            <div className="relative w-20 h-20 flex items-center justify-center">
                {/* Background Circle */}
                <svg className="w-full h-full -rotate-90">
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="6"
                        className="text-slate-800/40"
                    />
                    {/* Progress Circle */}
                    <motion.circle
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="transparent"
                        stroke={color}
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: isNaNVal ? circumference : offset }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-white">
                        {isNaNVal ? 'NaN%' : `${Math.round(percentage)}%`}
                    </span>
                    {description && (
                        <span className="text-[7px] text-slate-500 font-bold uppercase mt-0.5">
                            {description}
                        </span>
                    )}
                </div>
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
    const indicators = [
        { label: 'Alarmas de Hardware', percentage: alarms.hardware, color: '#ef4444' },
        { label: 'Alarmas de Ventilador', percentage: alarms.ventilador, color: '#3b82f6' },
        { label: 'Alarmas Fuente Poder', percentage: alarms.fuente, color: '#94a3b8' },
        { label: 'Alarmas de HDD', percentage: alarms.hdd, color: '#f59e0b' },
        { label: 'Rack Operativos', percentage: racksStats.total > 0 ? 100 : 0, color: '#1e293b', description: racksStats.total.toString() },
        { label: 'Ocupacion UR', percentage: parseFloat(racksStats.usage || '0'), color: '#1e293b' },
    ];

    return (
        <div className="flex items-center gap-8 py-2">
            {indicators.map((indicator, index) => (
                <CircularIndicator
                    key={index}
                    label={indicator.label}
                    percentage={indicator.percentage}
                    color={indicator.color}
                    description={indicator.description}
                />
            ))}
        </div>
    );
};
