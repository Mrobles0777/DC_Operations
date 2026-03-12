import { useState, useEffect, useMemo, useCallback } from 'react'
import { RackAsset, Device, parseAssetExcel } from '../utils/excelUtils'
import { supabase } from '../lib/supabase'

export const useInventory = (initialAssets: RackAsset[]) => {
    const [assets, setAssets] = useState<RackAsset[]>(initialAssets)
    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    // Fetch from Supabase on mount or when user changes
    const fetchInventory = useCallback(async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Rooms
            const { data: roomsData, error: roomsError } = await supabase
                .from('rooms')
                .select('*');

            if (roomsError) throw roomsError;

            // 2. Fetch Assets (Racks and Devices)
            const { data: assetsData, error: assetsError } = await supabase
                .from('assets')
                .select('*');

            if (assetsError) throw assetsError;

            // 3. Map Flat Data to Hierarchical Structure
            const roomsMap = new Map();
            roomsData.forEach(r => roomsMap.set(r.id, r));

            const allAssets: RackAsset[] = [];
            
            // First, find all Racks
            const racks = assetsData.filter(a => a.type === 'rack');
            const devices = assetsData.filter(a => a.type !== 'rack');

            racks.forEach(r => {
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

                allAssets.push({
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
                });
            });

            if (allAssets.length > 0) {
                setAssets(allAssets);
            }
        } catch (e) {
            console.error("Error fetching inventory from Supabase:", e);
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
            for (const rack of assets) {
                // 1. Ensure Room exists
                let roomId;
                const { data: existingRooms } = await supabase
                    .from('rooms')
                    .select('id')
                    .eq('name', rack.sala || '')
                    .eq('site', rack.sitio || '')
                    .limit(1);

                if (existingRooms && existingRooms.length > 0) {
                    roomId = existingRooms[0].id;
                } else {
                    const { data: newRoom, error: roomError } = await supabase
                        .from('rooms')
                        .insert({
                            name: rack.sala || 'SALA GENERAL',
                            site: rack.sitio || 'SITIO GENERAL',
                            floor: parseInt(rack.piso || '1') || 1
                        })
                        .select()
                        .single();
                    if (roomError) throw roomError;
                    roomId = newRoom.id;
                }

                // 2. Upsert Rack
                const rackData = {
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
                };

                const { data: savedRack, error: rackError } = await supabase
                    .from('assets')
                    .upsert({ id: rack.id.startsWith('manual-') || rack.id.startsWith('rack-') ? undefined : rack.id, ...rackData })
                    .select()
                    .single();

                if (rackError) throw rackError;

                // 3. Update Devices
                if (rack.devices && rack.devices.length > 0) {
                    const devicesToUpsert = rack.devices.map(d => ({
                        id: d.id.startsWith('dev-') ? undefined : d.id,
                        parent_id: savedRack.id,
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
                    }));

                    const { error: deviceError } = await supabase
                        .from('assets')
                        .upsert(devicesToUpsert);

                    if (deviceError) throw deviceError;
                }
            }
            setSaveStatus('saved');
            // Refresh local state to get real UUIDs
            fetchInventory();
        } catch (e) {
            console.error("Error saving to Supabase:", e);
            setSaveStatus('error');
        } finally {
            setTimeout(() => {
                setSaveStatus('idle');
                setIsSaving(false);
            }, 3000);
        }
    };

    const handleClearAllInventory = async () => {
        if (!confirm('¿Está seguro de que desea eliminar TODO el inventario de la base de datos?')) return;
        
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('assets')
                .delete()
                .neq('tag_id', 'FORCE_DELETE_ALL'); // Delete all 

            if (error) throw error;
            setAssets([]);
        } catch (e) {
            console.error("Error clearing inventory:", e);
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
    }

    const deleteAsset = async (assetId: string) => {
        try {
            const { error } = await supabase.from('assets').delete().eq('id', assetId);
            if (error) throw error;
            setAssets(prev => prev.filter(a => a.id !== assetId))
        } catch (e) {
            console.error("Error deleting asset:", e);
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
    }

    return {
        assets,
        setAssets,
        isSaving,
        isLoading,
        saveStatus,
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
