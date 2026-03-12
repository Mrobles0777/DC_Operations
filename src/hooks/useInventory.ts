import { useState, useEffect, useMemo, useCallback } from 'react'
import { RackAsset, Device, parseAssetExcel } from '../utils/excelUtils'
import { supabase } from '../lib/supabase'

export interface InventoryNotification {
    message: string;
    type: 'success' | 'error' | 'info';
}

export const useInventory = (initialAssets: RackAsset[]) => {
    const [assets, setAssets] = useState<RackAsset[]>(initialAssets)
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [notification, setNotification] = useState<InventoryNotification | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ message, type });
    };

    const clearNotification = () => setNotification(null);

    // Fetch from Supabase on mount
    const fetchInventory = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: roomsData, error: roomsError } = await supabase.from('rooms').select('*');
            if (roomsError) throw roomsError;

            const { data: assetsData, error: assetsError } = await supabase.from('assets').select('*').order('created_at', { ascending: true });
            if (assetsError) throw assetsError;

            const roomsMap = new Map();
            roomsData.forEach(r => roomsMap.set(r.id, r));

            const racks = assetsData.filter(a => a.type === 'rack');
            const devices = assetsData.filter(a => a.type !== 'rack');

            const allAssets: RackAsset[] = racks.map(r => {
                const room = roomsMap.get(r.room_id);
                const rackDevices: Device[] = devices
                    .filter(d => d.parent_id === r.id)
                    .map(d => ({
                        id: d.id,
                        type: d.type,
                        modelo: d.modelo,
                        fabricante: d.fabricante,
                        serie: d.serie,
                        u_position: d.u_pos,
                        u_height: d.u_height,
                        watts: d.watts,
                        ...d.details
                    }));

                return {
                    id: r.id,
                    tag_id: r.tag_id,
                    type: 'rack',
                    modelo: r.modelo,
                    fabricante: r.fabricante,
                    serie: r.serie,
                    sala: room?.name,
                    sitio: room?.site,
                    piso: room?.floor?.toString(),
                    pos_x: r.pos_x,
                    pos_z: r.pos_z,
                    estado: r.estado,
                    consumo: r.watts,
                    propietario: r.propietario,
                    alarm_hardware: r.details?.alarm_hardware || 0,
                    alarm_ventilador: r.details?.alarm_ventilador || 0,
                    alarm_fuente: r.details?.alarm_fuente || 0,
                    alarm_hdd: r.details?.alarm_hdd || 0,
                    devices: rackDevices
                };
            });

            setAssets(allAssets);
        } catch (e) {
            console.error("Error fetching inventory:", e);
            setSaveStatus('error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const handleSaveInventory = async () => {
        setSaveStatus('saving');
        setIsSaving(true);

        try {
            // 1. Prepare and Bulk Upsert Rooms
            const uniqueRoomKeys = new Set(assets.map(a => `${(a.sitio || 'GENERAL').toUpperCase()}|${(a.sala || 'GENERAL').toUpperCase()}`));
            const roomsToUpsert = Array.from(uniqueRoomKeys).map(key => {
                const [site, name] = key.split('|');
                const asset = assets.find(a => (a.sitio || 'GENERAL').toUpperCase() === site && (a.sala || 'GENERAL').toUpperCase() === name);
                return {
                    site,
                    name,
                    floor: parseInt(asset?.piso || '1') || 1
                };
            });

            const { data: savedRooms, error: roomsError } = await supabase
                .from('rooms')
                .upsert(roomsToUpsert, { onConflict: 'site,name' })
                .select();

            if (roomsError) throw roomsError;

            const roomsMap = new Map(savedRooms.map(r => [`${r.site.toUpperCase()}|${r.name.toUpperCase()}`, r.id]));

            // 2. Prepare and Bulk Upsert Racks
            const racksMap = new Map();
            assets.forEach(rack => {
                const roomKey = `${(rack.sitio || 'GENERAL').toUpperCase()}|${(rack.sala || 'GENERAL').toUpperCase()}`;
                const roomId = roomsMap.get(roomKey);
                
                // Composite key for multi-room support: ROOM + TAG
                const compositeKey = `${roomId}-${rack.tag_id.toUpperCase()}`;

                racksMap.set(compositeKey, {
                    tag_id: rack.tag_id,
                    type: 'rack',
                    room_id: roomId,
                    fabricante: rack.fabricante,
                    modelo: rack.modelo,
                    serie: rack.serie,
                    estado: rack.estado,
                    pos_x: rack.pos_x,
                    pos_z: rack.pos_z,
                    watts: rack.consumo,
                    propietario: rack.propietario,
                    details: {
                        alarm_hardware: rack.alarm_hardware,
                        alarm_ventilador: rack.alarm_ventilador,
                        alarm_fuente: rack.alarm_fuente,
                        alarm_hdd: rack.alarm_hdd
                    }
                });
            });

            const racksToUpsert = Array.from(racksMap.values());

            const { data: savedRacks, error: racksError } = await supabase
                .from('assets')
                .upsert(racksToUpsert, { onConflict: 'room_id,tag_id' })
                .select();

            if (racksError) throw racksError;

            // 3. Prepare and Bulk Upsert Devices
            const savedRacksMap = new Map(savedRacks.map(r => [`${r.room_id}-${r.tag_id.toUpperCase()}`, r.id]));
            const devicesMap = new Map();

            assets.forEach(rack => {
                const roomKey = `${(rack.sitio || 'GENERAL').toUpperCase()}|${(rack.sala || 'GENERAL').toUpperCase()}`;
                const roomId = roomsMap.get(roomKey);
                const parentId = savedRacksMap.get(`${roomId}-${rack.tag_id.toUpperCase()}`);

                if (rack.devices) {
                    rack.devices.forEach(d => {
                        // Deduplicate by parent rack + slot (U position)
                        // This is more reliable than 'serie' which may contain placeholders
                        const devKey = `${parentId}-${d.u_position || 0}`;

                        devicesMap.set(devKey, {
                            parent_id: parentId,
                            room_id: roomId,
                            type: d.type,
                            modelo: d.modelo,
                            fabricante: d.fabricante,
                            serie: d.serie,
                            u_pos: d.u_position,
                            u_height: d.u_height,
                            watts: d.watts,
                            details: {
                                ip_gestion: d.ip_gestion,
                                contrato: d.contrato,
                                owner: d.owner,
                                f_instalacion: d.f_instalacion,
                                comentarios: d.comentarios
                            }
                        });
                    });
                }
            });

            const devicesToUpsert = Array.from(devicesMap.values());

            if (devicesToUpsert.length > 0) {
                // Use slot-based conflict resolution (requires SQL unique index on parent_id, u_pos)
                const { error: deviceError } = await supabase.from('assets').upsert(devicesToUpsert, { onConflict: 'parent_id,u_pos' });
                if (deviceError) throw deviceError;
            }

            setSaveStatus('saved');
            showNotification(`¡Inventario sincronizado con éxito! (${assets.length} racks)`, 'success');
            await fetchInventory();
        } catch (e) {
            console.error("Error saving to Supabase:", e);
            setSaveStatus('error');
            showNotification('Error al sincronizar con el servidor', 'error');
        } finally {
            setTimeout(() => {
                setSaveStatus('idle');
                setIsSaving(false);
            }, 5000);
        }
    };

    const handleClearAllInventory = async () => {
        if (!confirm('¿CONFIRMAR ELIMINACIÓN TOTAL? Esta acción vaciará la base de datos.')) return;
        
        setIsSaving(true);
        try {
            const { error } = await supabase.from('assets').delete().neq('tag_id', 'FORCE_DELETE_ALL');
            if (error) throw error;
            setAssets([]);
            showNotification('Inventario eliminado por completo', 'info');
        } catch (e) {
            console.error("Error clearing inventory:", e);
            showNotification('Error al limpiar el inventario', 'error');
        } finally {
            setIsSaving(false);
        }
    }

    const availableSites = useMemo(() => {
        const sites = new Set(assets.map(a => a.sitio).filter(Boolean));
        return Array.from(sites) as string[];
    }, [assets]);

    const importFromExcel = async (file: File) => {
        const data = await parseAssetExcel(file)
        if (data && data.length > 0) {
            showNotification(`Excel procesado: ${data.length} racks encontrados`, 'info');
        }
        return data || []
    }

    const confirmImport = (importedRacks: RackAsset[]) => {
        setAssets(prev => {
            const toKey = (a: RackAsset) =>
                `${(a.sitio || '').toUpperCase()}-${(a.sala || '').toUpperCase()}-${a.tag_id.toUpperCase()}`;

            const assetMap = new Map(prev.map(a => [toKey(a), a]));
            importedRacks.forEach(rack => {
                assetMap.set(toKey(rack), rack);
            });
            return Array.from(assetMap.values());
        });
        showNotification(`${importedRacks.length} activos listos para guardar`, 'success');
    }

    const deleteAsset = async (assetId: string) => {
        try {
            const { error } = await supabase.from('assets').delete().eq('id', assetId);
            if (error) throw error;
            setAssets(prev => prev.filter(a => a.id !== assetId));
            showNotification('Activo eliminado', 'success');
        } catch (e) {
            console.error("Error deleting asset:", e);
            showNotification('Error al eliminar el activo', 'error');
        }
    }

    const updateAssetDevices = (rackId: string, devices: any[]) => {
        setAssets(prev => prev.map(rack => 
            rack.id === rackId ? { ...rack, devices: [...devices] } : rack
        ))
    }

    const addAsset = (newAsset: RackAsset) => {
        setAssets(prev => {
            const existingIndex = prev.findIndex(a => 
                a.tag_id.toUpperCase() === newAsset.tag_id.toUpperCase() && 
                a.sitio?.toUpperCase() === newAsset.sitio?.toUpperCase() &&
                a.sala?.toUpperCase() === newAsset.sala?.toUpperCase()
            );

            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = { ...updated[existingIndex], ...newAsset };
                return updated;
            }
            return [...prev, newAsset];
        });
        showNotification('Rack añadido localmente. Presione Guardar para sincronizar.', 'info');
    }

    const addDeviceToRack = (rackId: string, deviceData: any) => {
        setAssets(prev => prev.map(rack => {
            if (rack.id === rackId) {
                const newDevice = {
                    ...deviceData,
                    id: `dev-${Date.now()}`,
                    u_position: deviceData.ur_start,
                    u_height: deviceData.ur_height,
                    watts: deviceData.consumo
                };
                return {
                    ...rack,
                    devices: [...rack.devices, newDevice]
                };
            }
            return rack;
        }));
        showNotification('Dispositivo añadido. Presione Guardar para sincronizar.', 'info');
    }

    return {
        assets,
        setAssets,
        isSaving,
        isLoading,
        saveStatus,
        notification,
        clearNotification,
        handleSaveInventory,
        handleClearAllInventory,
        availableSites,
        importFromExcel,
        confirmImport,
        deleteAsset,
        updateAssetDevices,
        addAsset,
        addDeviceToRack
    }
}
