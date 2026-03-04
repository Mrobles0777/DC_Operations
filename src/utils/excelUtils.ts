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

                jsonData.forEach((row, index) => {
                    // Skip head (index 0 is usually headers like "SALA", "SITIO", "TIPO")
                    if (index === 0) return;

                    const site = String(row['A'] || '').trim() || 'SITIO GENERAL';
                    const room = String(row['B'] || '').trim() || 'SALA GENERAL';
                    const typeRaw = String(row['C'] || '').trim().toUpperCase();
                    const rackIdRaw = String(row['I'] || '').trim();

                    // If it's a "RACK" row according to Column C, we create/initialize the rack
                    const isRackHeader = typeRaw.includes('RACK');

                    if (!rackIdRaw || rackIdRaw === '' || rackIdRaw.toUpperCase() === 'N/A' || rackIdRaw === 'Coordenada / Nuevo ID') {
                        return;
                    }

                    const rackId = rackIdRaw;
                    // Composite key to handle multiple sites/rooms with same coordinates - Normalizing to Uppercase
                    const rackKey = `${site.toUpperCase()}-${room.toUpperCase()}-${rackId.toUpperCase()}`;

                    if (!racksMap[rackKey] && isRackHeader) {
                        const inferredCoords = parseCoords(rackId);

                        racksMap[rackKey] = {
                            id: `rack-${rackKey}-${index}`,
                            tag_id: rackId,
                            type: 'rack',
                            sala: room,
                            sitio: site,
                            piso: String(row['D'] || '').trim(),
                            estado: String(row['P'] || 'Operativo'), // Status from Column P
                            propietario: String(row['L'] || '').trim(),
                            pos_x: inferredCoords ? inferredCoords.x : (Object.keys(racksMap).length % 20) * 2 + 1,
                            pos_z: inferredCoords ? inferredCoords.z : Math.floor(Object.keys(racksMap).length / 20) * 3 + 1,
                            consumo: safeParseNumber(row['AD']) || 0, // Initial from AD
                            alarm_hardware: safeParseAlarm(row['R']),
                            alarm_ventilador: safeParseAlarm(row['S']),
                            alarm_fuente: safeParseAlarm(row['T']),
                            alarm_hdd: safeParseAlarm(row['U']),
                            devices: []
                        };
                    } else if (racksMap[rackKey]) {
                        // If the rack exists, we process additional info or devices
                        const marca = String(row['E'] || '').trim(); // Marca seems to be E
                        const modelo = String(row['F'] || '').trim(); // Modelo seems to be F
                        const deviceWatts = safeParseNumber(row['AD']);

                        if (!isRackHeader && (marca || modelo || row['G'])) {
                            const device: Device = {
                                id: `dev-${index}-${Math.random().toString(36).substr(2, 5)}`,
                                type: typeRaw.toLowerCase() || 'equipo',
                                modelo: modelo,
                                fabricante: marca,
                                serie: String(row['G'] || '').trim(), // SN seems to be G
                                u_position: safeParseNumber(row['M']),
                                u_height: safeParseNumber(row['O']) || 1, // Heights in O
                                watts: deviceWatts, // Consumption in Watts from Column AD
                                ip_gestion: String(row['V'] || '').trim(),
                                contrato: String(row['W'] || '').trim(),
                                owner: String(row['L'] || '').trim(),
                                f_instalacion: String(row['N'] || '').trim(),
                                comentarios: String(row['Y'] || '').trim()
                            };
                            racksMap[rackKey].devices.push(device);

                            // Sum to rack total if we just added a device with watts
                            if (deviceWatts) {
                                racksMap[rackKey].consumo = (racksMap[rackKey].consumo || 0) + deviceWatts;
                            }
                        } else if (isRackHeader) {
                            // Update header info if multiple rack rows exist for same ID
                            if (marca) racksMap[rackKey].fabricante = marca;
                            if (modelo) racksMap[rackKey].modelo = modelo;
                            if (deviceWatts) racksMap[rackKey].consumo = deviceWatts;
                        }
                    }
                });

                const finalRacks = Object.values(racksMap);
                console.log(`Import complete: ${finalRacks.length} unique racks identified across sites.`);
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
