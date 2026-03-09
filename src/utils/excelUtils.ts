import * as XLSX from 'xlsx';

export const U_TOTAL = 42;

export interface Device {
    id: string;
    type: string;
    modelo?: string;
    fabricante?: string;
    serie?: string;
    u_position?: number;
    u_height?: number;
    watts?: number;
    ip_gestion?: string;
    contrato?: string;
    owner?: string;
    f_instalacion?: string;
    comentarios?: string;
}

export interface RackAsset {
    id: string;
    tag_id: string;
    type: 'rack';
    modelo?: string;
    fabricante?: string;
    serie?: string;
    sala?: string;
    piso?: string;
    sitio?: string;
    pos_x: number;
    pos_z: number;
    estado?: string;
    consumo?: number;
    propietario?: string;
    alarm_hardware?: number;
    alarm_ventilador?: number;
    alarm_fuente?: number;
    alarm_hdd?: number;
    devices: Device[];
}

const safeParseNumber = (val: any): number | undefined => {
    if (val === undefined || val === null || val === '') return undefined;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
};

const safeParseAlarm = (val: any): number | undefined => {
    if (val === undefined || val === null || String(val).trim() === '') return undefined;
    const str = String(val).trim().toUpperCase();
    if (str === 'SI') return 1;
    if (str === 'NO') return 0;
    return undefined;
};


const parseCoords = (val: string) => {
    const match = val.match(/([A-Z]+)-?(\d+)/i);
    if (match) {
        const rowPart = match[1].toUpperCase();
        const colPart = parseInt(match[2]);

        let rowNum = 0;
        for (let i = 0; i < rowPart.length; i++) {
            rowNum = rowNum * 26 + (rowPart.charCodeAt(i) - 64);
        }

        return { x: colPart, z: rowNum };
    }
    return null;
};

export const parseAssetExcel = async (file: File): Promise<RackAsset[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', header: 'A' }) as any[];
                console.log(`Excel parsed: ${jsonData.length} rows found.`);

                const racksMap: Record<string, RackAsset> = {};

                        // --- Import tracking counters ---
                let skippedNoId = 0;
                let devicesImported = 0;
                let rackHeaderRows = 0;
                const orphanRackKeys = new Set<string>();

                jsonData.forEach((row, index) => {
                    // Skip header row (index 0 has column names like "SALA", "SITIO", "TIPO")
                    if (index === 0) return;

                    const site    = String(row['A'] || '').trim() || 'SITIO GENERAL';
                    const room    = String(row['B'] || '').trim() || 'SALA GENERAL';
                    const typeRaw = String(row['C'] || '').trim().toUpperCase();
                    const rackIdRaw = String(row['I'] || '').trim();

                    // Col C with RACK → this row IS the rack container (asset madre)
                    const isRackHeader = typeRaw.includes('RACK');

                    // Guard: rows without a Rack ID cannot be placed anywhere
                    if (!rackIdRaw || rackIdRaw === '' || rackIdRaw.toUpperCase() === 'N/A' || rackIdRaw === 'Coordenada / Nuevo ID') {
                        skippedNoId++;
                        return;
                    }

                    // Composite key: prevents collision between racks with same ID in different sites/rooms
                    const rackKey = `${site.toUpperCase()}-${room.toUpperCase()}-${rackIdRaw.toUpperCase()}`;

                    // --- Create rack container if it doesn't exist yet ---
                    if (!racksMap[rackKey]) {
                        const inferredCoords = parseCoords(rackIdRaw);
                        racksMap[rackKey] = {
                            id: `rack-${rackKey}-${index}`,
                            tag_id: rackIdRaw,
                            type: 'rack',
                            sala: room,
                            sitio: site,
                            piso:         String(row['D'] || '').trim(),
                            estado:       isRackHeader ? String(row['P'] || 'Operativo') : 'Operativo',
                            propietario:  String(row['L'] || '').trim(),
                            pos_x: inferredCoords ? inferredCoords.x : (Object.keys(racksMap).length % 20) * 2 + 1,
                            pos_z: inferredCoords ? inferredCoords.z : Math.floor(Object.keys(racksMap).length / 20) * 3 + 1,
                            consumo:          isRackHeader ? (safeParseNumber(row['AD']) || 0) : 0,
                            alarm_hardware:   isRackHeader ? safeParseAlarm(row['R']) : undefined,
                            alarm_ventilador: isRackHeader ? safeParseAlarm(row['S']) : undefined,
                            alarm_fuente:     isRackHeader ? safeParseAlarm(row['T']) : undefined,
                            alarm_hdd:        isRackHeader ? safeParseAlarm(row['U']) : undefined,
                            devices: []
                        };

                        // If first encounter is NOT a RACK row → orphan rack (container inferred from device)
                        if (!isRackHeader) {
                            orphanRackKeys.add(rackKey);
                        }
                    }

                    if (isRackHeader) {
                        rackHeaderRows++;
                        // Update header info if rack already existed (e.g. multiple RACK rows for same ID)
                        const marca  = String(row['E'] || '').trim();
                        const modelo = String(row['F'] || '').trim();
                        const deviceWatts = safeParseNumber(row['AD']);
                        if (marca)        racksMap[rackKey].fabricante = marca;
                        if (modelo)       racksMap[rackKey].modelo = modelo;
                        if (deviceWatts)  racksMap[rackKey].consumo = deviceWatts;
                        // Enrich header fields regardless of order
                        if (!racksMap[rackKey].estado || racksMap[rackKey].estado === 'Operativo') {
                            racksMap[rackKey].estado = String(row['P'] || 'Operativo');
                        }
                        racksMap[rackKey].alarm_hardware   = safeParseAlarm(row['R']) ?? racksMap[rackKey].alarm_hardware;
                        racksMap[rackKey].alarm_ventilador = safeParseAlarm(row['S']) ?? racksMap[rackKey].alarm_ventilador;
                        racksMap[rackKey].alarm_fuente     = safeParseAlarm(row['T']) ?? racksMap[rackKey].alarm_fuente;
                        racksMap[rackKey].alarm_hdd        = safeParseAlarm(row['U']) ?? racksMap[rackKey].alarm_hdd;

                    } else {
                        // --- Device row: accept ALL non-rack rows that have a valid rackId ---
                        // Previously only accepted rows with marca/modelo/serial — this lost real devices
                        const marca       = String(row['E'] || '').trim();
                        const modelo      = String(row['F'] || '').trim();
                        const deviceWatts = safeParseNumber(row['AD']);

                        const device: Device = {
                            id:           `dev-${index}-${Math.random().toString(36).substr(2, 5)}`,
                            type:         typeRaw.toLowerCase() || 'equipo',
                            modelo:       modelo || undefined,
                            fabricante:   marca || undefined,
                            serie:        String(row['G'] || '').trim() || undefined,
                            u_position:   safeParseNumber(row['M']),
                            u_height:     safeParseNumber(row['O']) || 1,
                            watts:        deviceWatts,
                            ip_gestion:   String(row['V'] || '').trim() || undefined,
                            contrato:     String(row['W'] || '').trim() || undefined,
                            owner:        String(row['L'] || '').trim() || undefined,
                            f_instalacion:String(row['N'] || '').trim() || undefined,
                            comentarios:  String(row['Y'] || '').trim() || undefined,
                        };
                        racksMap[rackKey].devices.push(device);
                        devicesImported++;

                        // Accumulate watt consumption per device into rack total
                        if (deviceWatts) {
                            racksMap[rackKey].consumo = (racksMap[rackKey].consumo || 0) + deviceWatts;
                        }
                    }
                });

                // --- Post-process: log orphans so they are visible (not silent) ---
                if (orphanRackKeys.size > 0) {
                    console.warn(`[Import] ⚠️ ${orphanRackKeys.size} ORPHAN rack(s) detected (devices found but no RACK row in Col C):`);
                    orphanRackKeys.forEach(k => {
                        const r = racksMap[k];
                        console.warn(`  → ${r.tag_id} (${r.sitio}/${r.sala}) — ${r.devices.length} device(s) assigned`);
                    });
                }

                const finalRacks = Object.values(racksMap);
                console.log(
                    `[Import] ✅ DONE\n` +
                    `  RACK header rows (Col C): ${rackHeaderRows}\n` +
                    `  Unique rack containers:   ${finalRacks.length}\n` +
                    `  ├─ With RACK header:       ${finalRacks.length - orphanRackKeys.size}\n` +
                    `  └─ Orphan (inferred):      ${orphanRackKeys.size}\n` +
                    `  Devices imported:          ${devicesImported}\n` +
                    `  Rows skipped (no ID):      ${skippedNoId}`
                );
                resolve(finalRacks);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

export const downloadTemplate = () => {
    const data = [
        {
            'SALA': 'GSM',
            'Rack': 'O-17',
            'PISO': 'PISO 1',
            'MARCA': 'APC',
            'MODELO': 'NetShelter',
            'NUMERO DE SERIE': 'SN-RACK-001',
            'TIPO': 'RACK',
            'ESTADO': 'OPERATIVO',
            'PROPIETARIO': 'DC CORE'
        },
        {
            'SALA': 'GSM',
            'Rack': 'O-17',
            'TIPO': 'SERVER',
            'MARCA': 'DELL',
            'MODELO': 'R740',
            'NUMERO DE SERIE': 'SN-SRV-01',
            'P.U': 42,
            'ALTURA': 1,
            'WATTS': 750,
            'IP GESTION': '10.0.0.1',
            'CONTRATO': 'PREMIUM-2026',
            'FECHA INSTALACION': '2024-05-10'
        },
        {
            'SALA': 'GSM',
            'Rack': 'O-17',
            'TIPO': 'SWITCH',
            'MARCA': 'CISCO',
            'MODELO': '9300',
            'NUMERO DE SERIE': 'SN-SW-01',
            'P.U': 1,
            'ALTURA': 1,
            'WATTS': 150,
            'IP GESTION': '10.0.0.2'
        }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario');
    XLSX.writeFile(workbook, 'Plantilla_Inventario_DC.xlsx');
};
