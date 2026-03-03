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
    devices: Device[];
}

const safeParseNumber = (val: any): number | undefined => {
    if (val === undefined || val === null || val === '') return undefined;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
};

// Helper mapping for common column names in different languages/formats
const COLUMN_MAP: Record<string, string[]> = {
    sala: ['SALA', 'Room', 'Ubication'],
    sitio: ['SITIO', 'Site', 'Location Name'],
    rack: ['Rack', 'ID RACK', 'TAG ID', 'Rack Name', 'Coordenada\r\nNuevo ID', 'Nombre Rack Anterior', 'TAG', 'Bastidor', 'Rack Solución'],
    coordenada: ['Coordenada', 'Location'],
    piso: ['PISO', 'Floor'],
    tipo: ['TIPO', 'TYPE', 'Tipo de Equipo', 'Device Type'],
    marca: ['MARCA', 'FABRICANTE', 'BRAND', 'Manufacturer', 'Vendor'],
    modelo: ['MODELO', 'MODEL', 'Modelo'],
    serie: ['SERIE', 'S/N', 'SN', 'Número de Serie', 'Serial'],
    pos_u: ['P.U', 'Posicion U', 'U Position', 'U-Pos', 'Ubicación en Rack'],
    altura: ['ALTURA', 'HEIGHT', 'U Height', 'Size (U)', 'UR Utilizada'],
    estado: ['ESTADO', 'STATUS', 'Estado', 'Estado de Rack'],
    watts: ['WATTS', 'Power', 'Consumo', 'Potencia Consumida (WATTS)'],
    ip: ['IP', 'IP GESTION', 'Management IP', 'IP Address'],
    contrato: ['CONTRATO', 'Contract'],
    propietario: ['PROPIETARIO', 'OWNER', 'Cliente', 'Customer'],
    fecha_inst: ['FECHA INSTALACION', 'Install Date', 'Fecha'],
    comentarios: ['COMENTARIOS', 'OBSERVACIONES', 'Notes', 'Comments', 'Comentario ALARMAS', 'Observación General']
};

const RACK_TERMS = ['RACK', 'BASTIDOR', 'RACK SOLUCIÓN', 'RACK SOLUCION', 'GABINETE', 'CABINET', 'STAND'];

const getColumnValue = (row: any, keys: string[]) => {
    const rowKeys = Object.keys(row);

    // First try exact matches and variations from COLUMN_MAP
    for (const key of keys) {
        const cleanSearchKey = key.replace(/[\r\n]/g, ' ').trim().toUpperCase();
        const actualKey = rowKeys.find(k => {
            const cleanRowKey = k.replace(/[\r\n]/g, ' ').trim().toUpperCase();
            return cleanRowKey === cleanSearchKey;
        });
        if (actualKey !== undefined && row[actualKey] !== undefined) return row[actualKey];
    }

    // Special check for Column C mentioned by the user (usually index 2)
    // sheet_to_json doesn't give us indices by default, but we can try to find it
    // if the keys are generic like __EMPTY_1
    const colCKey = rowKeys[2]; // Index 2 is Column C
    if (colCKey && keys.includes('Rack')) { // If we're looking for a rack identifier
        const val = row[colCKey];
        if (val) return val;
    }

    return undefined;
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

                const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];
                const racksMap: Record<string, RackAsset> = {};

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

                jsonData.forEach((row, index) => {
                    let rackIdRaw = getColumnValue(row, COLUMN_MAP.rack);
                    const typeRaw = String(getColumnValue(row, COLUMN_MAP.tipo) || '').trim().toUpperCase();

                    // Specific check for Column C if it contains rack-like terms
                    const rowValues = Object.values(row);
                    const colCValue = String(rowValues[2] || '').trim().toUpperCase();

                    // If Column C or the type column contains rack terms, use it
                    const isRackRow = RACK_TERMS.some(term => typeRaw.includes(term) || colCValue.includes(term));

                    // Fallback logic for rack identification
                    if (!rackIdRaw || String(rackIdRaw).toUpperCase() === 'SIN TAG' || String(rackIdRaw).toUpperCase() === 'N/A') {
                        rackIdRaw = getColumnValue(row, COLUMN_MAP.coordenada) || getColumnValue(row, COLUMN_MAP.serie);
                    }

                    if (!rackIdRaw && !isRackRow) return;

                    const rackId = String(rackIdRaw || colCValue || `RACK-${index}`).trim();
                    const room = String(getColumnValue(row, COLUMN_MAP.sala) || '').trim();
                    const site = String(getColumnValue(row, COLUMN_MAP.sitio) || '').trim();

                    if (!racksMap[rackId]) {
                        const coordVal = String(getColumnValue(row, COLUMN_MAP.coordenada) || '').trim();
                        const inferredCoords = parseCoords(rackId) || parseCoords(coordVal);

                        racksMap[rackId] = {
                            id: `rack-${rackId}-${index}`,
                            tag_id: rackId,
                            type: 'rack',
                            sala: room,
                            sitio: site,
                            piso: String(getColumnValue(row, COLUMN_MAP.piso) || '').trim(),
                            estado: String(getColumnValue(row, COLUMN_MAP.estado) || 'Operativo'),
                            propietario: String(getColumnValue(row, COLUMN_MAP.propietario) || ''),
                            pos_x: inferredCoords ? inferredCoords.x : (Object.keys(racksMap).length % 10) * 3 + 1,
                            pos_z: inferredCoords ? inferredCoords.z : Math.floor(Object.keys(racksMap).length / 10) * 4 + 1,
                            devices: []
                        };
                    }

                    const marca = getColumnValue(row, COLUMN_MAP.marca);
                    const modelo = getColumnValue(row, COLUMN_MAP.modelo);

                    // If it's NOT a rack row definition, it's a device
                    if (!isRackRow && (typeRaw !== '' || marca || modelo)) {
                        const device: Device = {
                            id: `dev-${index}`,
                            type: typeRaw ? typeRaw.toLowerCase() : 'equipo',
                            modelo: String(modelo || '').trim(),
                            fabricante: String(marca || '').trim(),
                            serie: String(getColumnValue(row, COLUMN_MAP.serie) || '').trim(),
                            u_position: safeParseNumber(getColumnValue(row, COLUMN_MAP.pos_u)),
                            u_height: safeParseNumber(getColumnValue(row, COLUMN_MAP.altura)) || 1,
                            watts: safeParseNumber(getColumnValue(row, COLUMN_MAP.watts)),
                            ip_gestion: String(getColumnValue(row, COLUMN_MAP.ip) || ''),
                            contrato: String(getColumnValue(row, COLUMN_MAP.contrato) || ''),
                            owner: String(getColumnValue(row, COLUMN_MAP.propietario) || ''),
                            f_instalacion: String(getColumnValue(row, COLUMN_MAP.fecha_inst) || ''),
                            comentarios: String(getColumnValue(row, COLUMN_MAP.comentarios) || '')
                        };
                        racksMap[rackId].devices.push(device);
                    } else if (isRackRow) {
                        // Update rack head info
                        if (marca) racksMap[rackId].fabricante = String(marca).trim();
                        if (modelo) racksMap[rackId].modelo = String(modelo).trim();
                        if (getColumnValue(row, COLUMN_MAP.serie)) racksMap[rackId].serie = String(getColumnValue(row, COLUMN_MAP.serie)).trim();
                    }
                });

                // Post-processing: Calculate rack consumption from devices if not provided
                Object.values(racksMap).forEach(rack => {
                    if (rack.consumo === undefined || rack.consumo === 0) {
                        const totalWatts = rack.devices.reduce((sum, dev) => sum + (dev.watts || 0), 0);
                        if (totalWatts > 0) {
                            rack.consumo = totalWatts / 1000; // Convert to KW
                        }
                    }
                });

                resolve(Object.values(racksMap));
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
