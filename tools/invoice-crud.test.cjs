const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('js/app.js', 'utf8');
function fn(name) {
  const match = new RegExp('^  (?:async )?function '+name+'\\(', 'm').exec(source);
  assert.ok(match, name);
  const rest = source.slice(match.index);
  const next = /\n  (?:async )?function /.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}
async function main() {
  let opened, notice;
  const tx = {id:'INV-1',customerId:'c',customerSnapshot:{phone:'08111111111'},items:[{name:'Laundry',qty:4.5,price:7500,total:33750}],total:33750,paymentStatus:'pending'};
  const context = vm.createContext({
    ui:{},state:{session:{role:'owner'}},window:{open:()=>opened={location:{},close(){throw Error('Unexpected close');}},location:{}},
    tenantTransactions:()=>[tx],customerById:()=>({name:'Pelanggan',phone:'08222222222'}),
    money:n=>String(n),storeProfile:()=>({storeName:'Toko'}),currentTenantId:()=> 'tenant',
    render:()=>{},toast:s=>notice=s,backendUrl:()=> '',ensureGasPdf:async()=>'',esc:s=>s,
  });
  vm.runInContext(['normalizeWa','waLink','invoiceMessage','sendInvoiceWa','invoiceWaButton'].map(fn).join('\n'),context);
  assert.equal(context.normalizeWa('08 123-456'), '628123456');
  assert.equal(context.normalizeWa('+62 8123456'), '628123456');
  await context.sendInvoiceWa(tx.id);
  assert.match(opened.location.href,/wa.me\/628222222222/);
  assert.match(decodeURIComponent(opened.location.href), /Laundry — 4.5 x 7500 = 33750/);
  assert.match(notice,/rincian invoice/);
  context.backendUrl=()=> 'backend';
  await context.sendInvoiceWa(tx.id); // failed PDF must still open WA
  assert.match(opened.location.href,/wa.me/);
  tx.pdfUrl='https://example.com/invoice.pdf';
  await context.sendInvoiceWa(tx.id);
  assert.match(decodeURIComponent(opened.location.href),/PDF invoice: https:\/\/example.com/);

  const gas = vm.createContext({});
  vm.runInContext(fs.readFileSync('gas/Code.gs','utf8'), gas);
  let stored={id:'INV',tenantId:'tenant',returnStatus:'none',paymentStatus:'paid',items:[{productId:'p',qty:2}],pdfUrl:'old'};
  let stock=10,locks=0;
  gas.LockService={getScriptLock:()=>({waitLock(){locks++;},releaseLock(){locks--;}})};
  gas.getById_=(collection)=>collection==='transactions'?stored:null;
  gas.put_=(collection,id,row)=>{if(collection==='transactions')stored=row;};
  gas.adjustStock_=(items,direction)=>{stock+=items.reduce((sum,i)=>sum+i.qty*direction,0);};
  const revised={...stored,items:[{productId:'p',qty:4.5,price:7500}],discount:1000,paymentStatus:'pending'};
  gas.editTransaction_(revised,{tenantId:'tenant'});
  assert.equal(stock,7.5); assert.equal(stored.total,32750); assert.equal(stored.pdfUrl,'');
  assert.equal(stored.paymentStatus,'pending'); assert.equal(locks,0);
  gas.editTransaction_(revised,{tenantId:'tenant'});
  assert.equal(stock,7.5,'retry must not double-adjust stock');
  assert.throws(()=>gas.editTransaction_(revised,{tenantId:'other'}),/tidak ditemukan/);
  assert.throws(()=>gas.editTransaction_({...revised,items:[{qty:0,price:1}]},{tenantId:'tenant'}),/tidak valid/);
  stored.returnStatus='returned';
  assert.throws(()=>gas.editTransaction_(revised,{tenantId:'tenant'}),/return/);
  assert.equal(locks,0);
  const customer={id:'c',name:'Before'},product={id:'p',name:'Before',price:10},expense={id:'e',amount:1};
  let remoteFailure=false;
  Object.assign(context, {
    FormData:class { constructor(form){this.form=form;} entries(){return Object.entries(this.form);} },
    customerById:()=>customer,productById:()=>product,tenantExpenses:()=>[expense],
    api:async()=>{if(remoteFailure)throw Error('Server failed');return {};},
    nowIso:()=> '2026-10-10T00:00:00Z',saveState:()=>{},clearEditMode:()=>{},logActivity:async()=>{},
    topCategoryId:id=>id,normalizedSubcategoryId:(id,sub)=>sub,categoryById:()=>({}),categoryLabel:()=>'',
    parseCurrency:s=>Number(s),numericValue:(s,d)=>Number(s)||d,expenseAmount:(price,qty)=>price*qty,
    productHppFromForm:form=>Number(form.cost),
  });
  context.state.session.token='token'; context.ui.cart=[{productId:'p'}];
  vm.runInContext(['handleCustomerEdit','handleProductEdit','handleExpenseEdit'].map(fn).join('\n'),context);
  await context.handleCustomerEdit({id:'c',name:'After',phone:'08123',address:'Address',notes:'Note'});
  assert.equal(customer.name,'After');
  await context.handleProductEdit({id:'p',name:'Product',sku:'SKU',categoryId:'cat',subcategoryId:'',price:'7500',cost:'2000',stock:'9',active:'true'});
  assert.equal(product.price,7500); assert.equal(context.ui.cart[0].price,7500);
  await context.handleExpenseEdit({id:'e',date:'2026-10-10',name:'Packaging',categoryId:'cat',subcategoryId:'',unitPrice:'2000',qty:'3',notes:''});
  assert.equal(expense.amount,6000);
  remoteFailure=true;
  await assert.rejects(context.handleCustomerEdit({id:'c',name:'Failed change',phone:'',address:'',notes:''}),/Server failed/);
  assert.equal(customer.name,'After','failed server edit must not change local data');
  Object.assign(context, {tenantCategories:()=>[],tenantProducts:()=>[],categoryById:()=>null,productById:()=>null,firstTopCategoryId:()=>'',categoryOptions:()=>'',subcategoryOptions:()=>''});
  vm.runInContext(fn('renderCategories'),context);
  context.ui.tab='categories';
  assert.match(context.renderCategories(),/id="category-form"/);
  assert.doesNotMatch(context.renderCategories(),/id="product-form"|id="hpp-form"/);
  context.ui.tab='products';
  assert.match(context.renderCategories(),/id="product-form"/);
  assert.doesNotMatch(context.renderCategories(),/id="category-form"|id="hpp-form"/);
  let submitHandler, submitted;
  Object.assign(context,{app:{addEventListener:(event,handler)=>submitHandler=handler},setFormSubmitting:()=>{},document:{body:{contains:()=>true}}});
  const submitStart=source.indexOf('  app.addEventListener("submit"');
  vm.runInContext(source.slice(submitStart,source.indexOf('  app.addEventListener("click"',submitStart)),context);
  for(const [formId,handler] of [['customer-edit-form','handleCustomerEdit'],['product-edit-form','handleProductEdit'],['expense-edit-form','handleExpenseEdit'],['transaction-edit-form','handleTransactionEdit'],['user-edit-form','handleUserEdit']]) {
    context[handler]=async()=>{submitted=formId;};
    const form={id:{value:'record-id'},getAttribute:()=>formId,dataset:{}};
    await submitHandler({target:{closest:()=>form},preventDefault(){}});
    assert.equal(submitted,formId,'hidden name=id must not block form dispatch');
  }
  console.log('CRUD tests passed: contacts, product/cart price, expense totals, failed server edit rollback.');
  let renewals=0, requests=0;
  Object.assign(context, {
    currentTenant:()=>({}),appSlug:()=> 'Laundry',
    showSessionRenewal:()=>renewals++,
    fetchWithTimeout:async()=>{requests++;return {ok:true,json:async()=>({success:false,error:'Token kedaluwarsa'})};},
    unwrapApiResult:data=>{if(!data.success)throw Error(data.error);return data.data;},
  });
  context.state.session={id:'owner',role:'owner',tenantId:'tenant',token:'expired'};
  vm.runInContext([fn('api'),fn('applyRenewedSession')].join('\n'),context);
  await assert.rejects(context.api('saveProduct',{product}),/Sesi login berakhir/);
  assert.equal(renewals,1); assert.equal(requests,1,'must not retry writes before login');
  await assert.rejects(context.api('loginOwner',{},false),/Token kedaluwarsa/);
  assert.equal(renewals,1,'failed login must not open recursive renewal dialogs');
  const prior={...context.state.session};
  assert.throws(()=>context.applyRenewedSession(prior,{token:'new',user:{id:'other',role:'owner',tenantId:'tenant'}}),/akun dan toko/);
  assert.equal(context.state.session.token,'expired');
  context.applyRenewedSession(prior,{token:'new',user:{id:'owner',role:'owner',tenantId:'tenant'}});
  assert.equal(context.state.session.token,'new');
  console.log('Session tests passed: expired-token recovery, no automatic write retry, account/tenant checks, successful token replacement.');
  console.log('Invoice/transaction tests passed: WA phone/text/PDF fallback, totals, stock delta, retry, tenant isolation, returned transaction rejection.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
