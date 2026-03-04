import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'ref', 'Base de datos DC.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // header: 'A' maps columns to A, B, C...
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', header: 'A' });

    console.log(`Analyzing ${jsonData.length} rows...`);

    const racksByI = new Set();
    const rowsWithRackInC = [];

    jsonData.forEach((row, index) => {
        const type = String(row['C'] || '').trim().toUpperCase();
        const rackId = String(row['I'] || '').trim();

        if (type.includes('RACK')) {
            rowsWithRackInC.push({ index, rackId, type });
        }

        if (rackId && rackId !== '' && rackId !== 'Coordenada / Nuevo ID') {
            racksByI.add(rackId);
        }
    });

    console.log('--- COLUMN C (TIPO) & I (RACK ID) ---');
    console.log(`Rows with "RACK" in Column C: ${rowsWithRackInC.length}`);
    console.log(`Unique values in Column I: ${racksByI.size}`);

    console.log('--- SAMPLE ROWS (Column I and C) ---');
    jsonData.slice(0, 10).forEach((row, i) => {
        console.log(`Row ${i} [A:${row['A']}] [C:${row['C']}] [I:${row['I']}] [R:${row['R']}] [S:${row['S']}] [T:${row['T']}] [U:${row['U']}]`);
    });

    // Check alarm columns specifically
    const hardwareAlarms = jsonData.filter(r => String(r['R']).trim().toUpperCase() === 'SI').length;
    const ventAlarms = jsonData.filter(r => String(r['S']).trim().toUpperCase() === 'SI').length;
    const powerAlarms = jsonData.filter(r => String(r['T']).trim().toUpperCase() === 'SI').length;
    const hddAlarms = jsonData.filter(r => String(r['U']).trim().toUpperCase() === 'SI').length;

    console.log('--- ALARM COUNTS (SI) ---');
    console.log(`R (Hardware): ${hardwareAlarms}`);
    console.log(`S (Ventilador): ${ventAlarms}`);
    console.log(`T (Fuente): ${powerAlarms}`);
    console.log(`U (HDD): ${hddAlarms}`);

} catch (error) {
    console.error('Error:', error.message);
}
