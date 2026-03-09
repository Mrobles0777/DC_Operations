import { useMemo } from 'react'
import { RackAsset, U_TOTAL } from '../utils/excelUtils'

export const useDashboardStats = (assets: RackAsset[], selectedSite: string) => {
    return useMemo(() => {
        const filteredAssets = selectedSite === 'all'
            ? assets
            : assets.filter(a => a.sitio === selectedSite);

        const totalRacks = filteredAssets.length
        const totalConsumption = filteredAssets.reduce((acc, r) => acc + (r.consumo || 0), 0)
        const totalUsedU = filteredAssets.reduce((acc, r) => acc + r.devices.reduce((dAcc, d) => dAcc + (d.u_height || 1), 0), 0)
        const totalU = totalRacks * U_TOTAL
        const usagePercent = totalU > 0 ? (totalUsedU / totalU) * 100 : 0
        const freePercent = 100 - usagePercent

        const salaGroups = filteredAssets.reduce((acc: Record<string, any>, r) => {
            const sala = r.sala || 'Desconocida'
            if (!acc[sala]) {
                acc[sala] = { name: sala, racks: 0, usedU: 0, totalU: 0, consumption: 0 }
            }
            acc[sala].racks += 1
            acc[sala].usedU += r.devices.reduce((dAcc, d) => dAcc + (d.u_height || 1), 0)
            acc[sala].totalU += U_TOTAL
            acc[sala].consumption += (r.consumo || 0)
            return acc
        }, {})

        const getAlarmPercent = (alarmKey: keyof RackAsset) => {
            if (filteredAssets.length === 0) return 0;
            const alarmsCount = filteredAssets.filter(r => r[alarmKey] === 1).length;
            return (alarmsCount / filteredAssets.length) * 100;
        };

        return {
            totalRacks,
            totalWatts: totalConsumption,
            totalConsumptionKW: totalConsumption / 1000,
            usagePercent: usagePercent.toFixed(1),
            freePercent: freePercent.toFixed(1),
            salaBreakdown: Object.values(salaGroups),
            filteredAssets,
            alarms: {
                hardware: getAlarmPercent('alarm_hardware'),
                ventilador: getAlarmPercent('alarm_ventilador'),
                fuente: getAlarmPercent('alarm_fuente'),
                hdd: getAlarmPercent('alarm_hdd'),
            }
        }
    }, [assets, selectedSite])
}
