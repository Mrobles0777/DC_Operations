import { useState, useEffect, useMemo } from 'react'
import { RackAsset, parseAssetExcel } from '../utils/excelUtils'

export const useInventory = (initialAssets: RackAsset[]) => {
    const [assets, setAssets] = useState<RackAsset[]>(initialAssets)
    const [isSaving, setIsSaving] = useState(false)
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

    // Load from localStorage on mount
    useEffect(() => {
        const savedAssets = localStorage.getItem('dc-inventory');
        if (savedAssets) {
            try {
                setAssets(JSON.parse(savedAssets));
            } catch (e) {
                console.error("Error loading inventory:", e);
            }
        }
    }, [])

    const handleSaveInventory = async () => {
        setSaveStatus('saving');
        setIsSaving(true);

        // Simulate network delay for premium feel
        await new Promise(resolve => setTimeout(resolve, 1200));

        localStorage.setItem('dc-inventory', JSON.stringify(assets));

        setSaveStatus('saved');
        setTimeout(() => {
            setSaveStatus('idle');
            setIsSaving(false);
        }, 3000);
    };

    const handleClearAllInventory = () => {
        setAssets([])
        localStorage.removeItem('dc-inventory')
    }

    const availableSites = useMemo(() => {
        const sites = new Set(assets.map(a => a.sitio).filter(Boolean));
        return Array.from(sites) as string[];
    }, [assets]);

    const importFromExcel = async (file: File) => {
        const data = await parseAssetExcel(file)
        if (data.length > 0) {
            return data
        }
        return []
    }

    const confirmImport = (importedRacks: RackAsset[]) => {
        setAssets(prev => {
            const toKey = (a: RackAsset) =>
                `${(a.sitio || '').toUpperCase()}-${(a.sala || '').toUpperCase()}-${a.tag_id.toUpperCase()}`;

            const assetMap = new Map(prev.map(a => [toKey(a), a]));
            importedRacks.forEach(rack => {
                assetMap.set(toKey(rack), rack);
            });
            const merged = Array.from(assetMap.values());
            console.log(`[Import Merge] prev: ${prev.length} | imported: ${importedRacks.length} | merged unique: ${merged.length}`);
            return merged;
        });
    }

    const deleteAsset = (assetId: string) => {
        setAssets(prev => prev.filter(a => a.id !== assetId))
    }

    const updateAssetDevices = (rackId: string, devices: any[]) => {
        setAssets(prev => prev.map(rack => 
            rack.id === rackId ? { ...rack, devices: [...devices] } : rack
        ))
    }

    return {
        assets,
        setAssets,
        isSaving,
        saveStatus,
        handleSaveInventory,
        handleClearAllInventory,
        availableSites,
        importFromExcel,
        confirmImport,
        deleteAsset,
        updateAssetDevices
    }
}
