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

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', header: 'A' });
    console.log(`\n=== TOTAL ROWS IN EXCEL: ${jsonData.length} ===\n`);

    // --- PHASE 1: Identify RACK rows (col C) ---
    const rackRows = [];
    const deviceRows = [];
    const skippedNoId = [];
    const skippedNoPayload = [];

    const racksMap = {};

    jsonData.forEach((row, index) => {
        if (index === 0) return; // skip header

        const site   = String(row['A'] || '').trim() || 'SITIO GENERAL';
        const room   = String(row['B'] || '').trim() || 'SALA GENERAL';
        const typeRaw = String(row['C'] || '').trim().toUpperCase();
        const rackIdRaw = String(row['I'] || '').trim();
        const marca  = String(row['E'] || '').trim();
        const modelo = String(row['F'] || '').trim();
        const serial = String(row['G'] || '').trim();

        const isRackHeader = typeRaw.includes('RACK');

        // Guard: skip rows with no rack ID
        if (!rackIdRaw || rackIdRaw === '' || rackIdRaw.toUpperCase() === 'N/A' || rackIdRaw === 'Coordenada / Nuevo ID') {
            skippedNoId.push({ index: index + 1, type: typeRaw, rackIdRaw });
            return;
        }

        const rackKey = `${site.toUpperCase()}-${room.toUpperCase()}-${rackIdRaw.toUpperCase()}`;

        if (isRackHeader) {
            rackRows.push({ row: index + 1, site, room, rackId: rackIdRaw, type: typeRaw });
            if (!racksMap[rackKey]) {
                racksMap[rackKey] = { rackId: rackIdRaw, site, room, devices: [], skipped: [] };
            } else {
                racksMap[rackKey].multipleHeaders = (racksMap[rackKey].multipleHeaders || 0) + 1;
            }
        } else {
            // Device rows
            const hasPayload = marca || modelo || serial;
            if (hasPayload) {
                deviceRows.push({ row: index + 1, rackKey, type: typeRaw, marca, modelo });
                if (!racksMap[rackKey]) {
                    // Rack was never declared with type RACK — orphan device
                    racksMap[rackKey] = { rackId: rackIdRaw, site, room, devices: [], skipped: [], orphan: true };
                }
                racksMap[rackKey].devices.push({ row: index+1, type: typeRaw, marca, modelo, serial });
            } else {
                // SILENTLY DISCARDED by current logic
                skippedNoPayload.push({ row: index + 1, rackKey, type: typeRaw });
                if (racksMap[rackKey]) {
                    racksMap[rackKey].skipped.push({ row: index+1, type: typeRaw });
                }
            }
        }
    });

    const uniqueRacks = Object.keys(racksMap).length;
    const orphanRacks = Object.values(racksMap).filter(r => r.orphan).length;
    const racksWithMultiHeaders = Object.values(racksMap).filter(r => r.multipleHeaders > 0).length;

    console.log('=== RACK ANALYSIS (Column C contains RACK) ===');
    console.log(`  Rows with RACK in Col C:     ${rackRows.length}`);
    console.log(`  Unique Rack containers:      ${uniqueRacks}`);
    console.log(`  Racks with RACK row header:  ${uniqueRacks - orphanRacks}`);
    console.log(`  Orphan racks (no RACK row):  ${orphanRacks}`);
    console.log(`  Racks with >1 RACK header:   ${racksWithMultiHeaders}`);
    console.log('');
    console.log('=== DEVICE ANALYSIS ===');
    console.log(`  Device rows (imported):      ${deviceRows.length}`);
    console.log(`  Device rows SILENTLY SKIPPED (no marca/modelo/serial): ${skippedNoPayload.length}`);
    console.log(`  Rows skipped (no Rack ID):   ${skippedNoId.length}`);
    console.log('');

    // Show skipped device types breakdown
    const skippedByType = {};
    skippedNoPayload.forEach(r => {
        skippedByType[r.type || '(empty)'] = (skippedByType[r.type || '(empty)'] || 0) + 1;
    });
    if (Object.keys(skippedByType).length > 0) {
        console.log('=== SKIPPED DEVICE TYPES (currently lost) ===');
        Object.entries(skippedByType).sort((a,b) => b[1]-a[1]).forEach(([t, c]) => {
            console.log(`  ${t.padEnd(25)} : ${c}`);
        });
        console.log('');
    }

    // Show top 5 racks by device count
    const sorted = Object.values(racksMap).sort((a,b) => b.devices.length - a.devices.length);
    console.log('=== TOP 10 RACKS BY DEVICE COUNT ===');
    sorted.slice(0, 10).forEach(r => {
        const tag = `${r.rackId} (${r.site}/${r.room})`;
        console.log(`  ${tag.padEnd(45)} devices: ${r.devices.length}  skipped: ${r.skipped.length}`);
    });

    // Show orphan racks
    const orphans = Object.values(racksMap).filter(r => r.orphan);
    if (orphans.length > 0) {
        console.log(`\n=== ORPHAN RACKS (devices with no RACK header row) ===`);
        orphans.forEach(r => {
            console.log(`  ${r.rackId} (${r.site}/${r.room}) — ${r.devices.length} devices`);
        });
    }

    console.log('\n=== SUMMARY ===');
    console.log(`  Excel rows total:            ${jsonData.length}`);
    console.log(`  RACK header rows (Col C):    ${rackRows.length}  → user says 111`);
    console.log(`  Final unique rack containers:${uniqueRacks}`);
    console.log(`  Total devices imported:      ${deviceRows.length}`);
    console.log(`  Total devices LOST (silent): ${skippedNoPayload.length}`);

} catch (error) {
    console.error('Error:', error.message);
}
