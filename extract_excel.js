import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = 'REF/Base de datos DC.xlsx';

try {
    const fileBuffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    const result = {};
    workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 'A', range: 0 });
        result[sheetName] = {
            sampleRows: jsonData.slice(0, 10)
        };
    });
    
    console.log(JSON.stringify(result, null, 2));
} catch (error) {
    console.error('Error:', error);
}
