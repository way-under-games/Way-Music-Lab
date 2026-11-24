import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
const contract=JSON.parse(await readFile(new URL('../docs/ui-control-contract.json',import.meta.url),'utf8'));
test('all pre-redesign control IDs remain addressable without duplicate IDs',async()=>{
 for(const [file,expected]of Object.entries(contract.screens)){const html=await readFile(new URL('../web/'+file,import.meta.url),'utf8'),ids=[...html.matchAll(/\sid=["']([^"']+)["']/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,file+' duplicates IDs');for(const id of expected)assert.ok(ids.includes(id),file+' lost '+id);}
});
test('tutorial blocks are removed and the reorganized workflows retain their focused entry points',async()=>{
 const html=await readFile(new URL('../web/studio.html',import.meta.url),'utf8');assert.ok(!html.includes('guide-card'));for(const marker of ['part-picker','project-files','record-mode','data-editor-panel="rhythm"','data-game-panel="connections"','data-classic-panel="modulation"','roll-range'])assert.ok(html.includes(marker),marker);
});
