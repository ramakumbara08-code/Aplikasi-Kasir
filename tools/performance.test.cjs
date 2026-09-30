const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('gas/Code.gs', 'utf8');
function context(globals = {}) { const c = vm.createContext(globals); vm.runInContext(source,c); return c; }
{
 const c=context(); const reads=[];
 c.readList_=name=>{ reads.push(name); return name==='tenants' ? [{id:'a'}] : []; };
 c.readListByTenant_=(name,id)=>{ reads.push(name); return [{tenantId:id,id:name}]; };
 const result=c.bootstrap_({role:'owner',tenantId:'a'},'essential');
 assert.equal(result.bootstrapPhase,'essential');
 assert.ok(!reads.includes('transactions') && !reads.includes('activityLogs'));
 reads.length=0;
 const history=c.bootstrap_({role:'owner',tenantId:'a'},'history');
 assert.deepEqual(reads,['transactions','expenses','activityLogs']);
 assert.equal(history.transactions[0].tenantId,'a');
 assert.throws(()=>c.bootstrap_({role:'cashier',tenantId:'a'},'history'),/Akses ditolak/);
 const full=c.bootstrap_({role:'owner',tenantId:'a'});
 assert.ok(full.transactions && full.products); // Existing frontends still get the full response.
}
{
 let opens=0, lookups=0, dataReads=0;
 const sheet={getDataRange:()=>({getValues:()=>{dataReads++;return [['ID','Nama'],['p1','Laundry']];}})};
 const ss={getSheetByName:()=>{lookups++;return sheet;}};
 const c=context({PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'sheet-id'})},SpreadsheetApp:{openById:()=>{opens++;return ss;}},CacheService:{getScriptCache:()=>({get:()=> '1'})}});
 assert.equal(c.readList_('products')[0].name,'Laundry');
 c.readList_('products');
 assert.equal(opens,1); assert.equal(lookups,1); assert.equal(dataReads,2); // Fresh values, reused handles.
}
{
 const c=context(); let fullRead=false;
 c.sheet_=()=>({getRange:()=>({getValues:()=>[['token','token','u','e','n','owner','a',new Date(Date.now()+60000).toISOString()]]})});
 c.findRowNumber_=()=>2;
 c.sheetHeaders_=()=>['id','token','userId','email','name','role','tenantId','expiresAt'];
 c.readList_=()=>{fullRead=true;throw Error('Should not read the entire token table');};
 assert.equal(c.requireAuth_('token').tenantId,'a'); assert.equal(fullRead,false);
 c.findRowNumber_=()=>0; assert.throws(()=>c.requireAuth_('missing'),/Token tidak valid/);
 c.findRowNumber_=()=>2;
 c.sheet_=()=>({getRange:()=>({getValues:()=>[['token','token','u','e','n','owner','a','2000-01-01']]})});
 assert.throws(()=>c.requireAuth_('token'),/Token kedaluwarsa/);
}
console.log('Performance regression tests passed: phased bootstrap, tenant scope, token expiry, spreadsheet I/O.');
