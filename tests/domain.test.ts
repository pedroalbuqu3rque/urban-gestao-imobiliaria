import assert from 'node:assert/strict';
import {test} from 'node:test';
import {change, empty, filterState, stages, type Kind, type Member, type State} from '../lib/domain';

const admin: Member = {id:'admin-vale', name:'João Silva', email:'joao@vale.example', role:'admin', team:'Gestão'};
const ana: Member = {id:'ana', name:'Ana Souza', email:'ana@vale.example', role:'broker', team:'Vendas'};
const rita: Member = {...ana,id:'rita',name:'Rita Nunes',email:'rita@vale.example'};
const now='2026-11-19T10:00:00.000Z';
const property = {name:'Apartamento Alameda',code:' im-049 ',type:'Apartamento',mode:'Venda',street:'Rua das Acácias, 204',district:'Setor Bueno',price:'450000',status:'Disponível',published:'Sim'};
const client = {name:'Helena Costa',email:'helena@cliente.example',interest:'Comprar'};
const save=(s:State,k:Kind,data:Record<string,string>,m=ana,id?:string)=>change(s,m,{action:'save',kind:k,id,data},now);
const advance=(s:State,k:Kind,id:string,m=ana)=>change(s,m,{action:'advance',kind:k,id,data:{}},now);
function opportunity(mode='Venda') {
  let s=save(empty('Imobiliária Vale'),'properties',{...property,mode});
  s=save(s,'clients',{...client,propertyId:s.properties[0].id});
  return save(s,'deals',{name:property.name,clientId:s.clients[0].id,propertyId:s.properties[0].id,price:property.price});
}
function closed(mode='Venda'){
  let s=opportunity(mode);
  for(let i=1;i<stages.length;i++) s=advance(s,'deals',s.deals[0].id);
  return s;
}
function agreement(s:State,end='') {
  return {seller:'Paulo Mendes',dealId:s.deals[0].id,start:'2026-11-19',end};
}

test('UR-QA-01/03: property code is normalized, a valid edit keeps identity and prior state untouched',()=>{
  const blank=empty('Vale');
  const s=save(blank,'properties',property);
  assert.equal(blank.properties.length,0);
  assert.equal(s.properties[0].data.code,'IM-049');
  const id=s.properties[0].id;
  const updated=save(s,'properties',{...property,price:'440000',status:'Reservado'},ana,id);
  assert.equal(updated.properties[0].id,id);
  assert.equal(updated.properties[0].data.price,'440000');
  assert.equal(updated.properties[0].data.status,'Reservado');
  assert.equal(s.properties[0].data.price,'450000');
  assert.match(updated.properties[0].history[0],/Ana Souza/);
});

test('UR-QA-02: incomplete properties, invalid prices and duplicated codes are rejected',()=>{
  const s=save(empty('Vale'),'properties',property);
  for(const price of ['0','-5','NaN','Infinity']) assert.throws(()=>save(s,'properties',{...property,code:'IM-050',price}));
  assert.throws(()=>save(s,'properties',{...property,name:'  '}));
  assert.throws(()=>save(s,'properties',{...property,code:'Im-049'}),/Código/);
  assert.equal(s.properties.length,1);
  assert.doesNotThrow(()=>save(empty('Outra imobiliária'),'properties',property));
});

test('UR-QA-05/06: customer property link is validated, retained, and the contact log records the agent',()=>{
  let s=save(empty('Vale'),'properties',property);
  assert.throws(()=>save(s,'clients',{...client,email:'inválido'}));
  assert.throws(()=>save(s,'clients',{...client,propertyId:'inexistente'}),/encontrado/);
  s=save(s,'clients',{...client,propertyId:s.properties[0].id});
  assert.equal(s.clients[0].data.propertyId,s.properties[0].id);
  assert.ok(s.clients[0].history.some(entry=>entry.includes('IM-049')&&entry.includes('Apartamento Alameda')));
  const noted=change(s,ana,{action:'note',kind:'clients',id:s.clients[0].id,data:{note:'Visita confirmada.'}},now);
  assert.match(noted.clients[0].history[0],/Ana Souza.*Visita confirmada/);
  assert.equal(noted.clients[0].owner,ana.id);
});

test('UR-QA-08/09/10: opportunities advance one stage at a time and retain all references',()=>{
  let s=opportunity();
  const {id,data}=s.deals[0];
  assert.equal(data.clientId,s.clients[0].id);
  assert.equal(data.propertyId,s.properties[0].id);
  assert.equal(data.stage,stages[0]);
  for(const next of stages.slice(1)) {
    s=advance(s,'deals',id);
    assert.equal(s.deals[0].data.stage,next);
    assert.ok(s.deals[0].history[0].includes(next));
  }
  assert.throws(()=>advance(s,'deals',id),/fechada/);
  assert.throws(()=>save(s,'deals',data,ana,id),/etapa/);
});

test('UR-QA-11: sale carries the client, property, broker and price through contract completion',()=>{
  const open=opportunity();
  assert.throws(()=>save(open,'contracts',agreement(open)),/Feche/);
  let s=closed();
  s=save(s,'contracts',agreement(s),admin);
  const c=s.contracts[0];
  assert.equal(c.owner,ana.id);
  for(const key of ['clientId','propertyId','price','mode']) assert.equal(c.data[key],s.deals[0].data[key]);
  assert.equal(c.data.status,'Em elaboração');
  assert.throws(()=>save(s,'contracts',agreement(s)),/já possui contrato/);
  for(const expected of ['Em assinatura','Assinado','Concluído']) {
    s=advance(s,'contracts',c.id);
    assert.equal(s.contracts[0].data.status,expected);
  }
  assert.equal(s.contracts[0].data.completed,'2026-11-19');
  assert.equal(s.properties[0].data.status,'Vendido');
  assert.equal(s.properties[0].data.published,'Não');
  assert.throws(()=>advance(s,'contracts',c.id),/concluída/);
});

test('UR-QA-12: a lease requires a calendar-valid end date strictly after its start',()=>{
  const s=closed('Locação');
  for(const end of ['','2026-11-19','2026-11-18','2026-11-31']) {
    assert.throws(()=>save(s,'contracts',agreement(s,end)));
  }
  let rented=save(s,'contracts',agreement(s,'2027-11-18'));
  const id=rented.contracts[0].id;
  for(let i=0;i<3;i++)rented=advance(rented,'contracts',id);
  assert.equal(rented.properties[0].data.status,'Locado');
});

test('UR-QA-15: broker sees the shared catalog, only their own portfolio, and cannot administer another account',()=>{
  const s=opportunity();
  const v=filterState(s,rita);
  assert.equal(v.properties.length,1);
  assert.equal(v.clients.length,0);
  assert.equal(v.deals.length,0);
  assert.equal(filterState(s,admin).deals.length,1);
  assert.throws(()=>advance(s,'deals',s.deals[0].id,rita),/restrita/);
  assert.throws(()=>change(s,rita,{action:'note',kind:'clients',id:s.clients[0].id,data:{note:'Outro atendimento'}}),/restrita/);
  assert.throws(()=>save(s,'deals',{...s.deals[0].data},rita),/restrita/);
  assert.throws(()=>change(s,rita,{action:'settings',data:{name:'Outra',city:'Goiânia'}}),/restrito/);
});
