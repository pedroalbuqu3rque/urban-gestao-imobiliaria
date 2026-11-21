import {expect,test,type Page} from '@playwright/test';

async function openModule(page:Page, name:string) {
  const menu=page.getByRole('button',{name:'Abrir menu'});
  if(await menu.isVisible()) await menu.click();
  await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();
}

test('A landing apresenta o produto e direciona ao cadastro e ao login',async({page})=>{
  await page.goto('/');
  await page.getByRole('link',{name:'Conhecer recursos'}).click();
  await expect(page).toHaveURL(/#recursos$/);
  await page.getByRole('button',{name:'Cadastrar imobiliária',exact:true}).first().click();
  await expect(page.getByRole('heading',{name:'Crie sua conta'})).toBeVisible();
  await page.getByRole('button',{name:'Voltar ao login'}).click();
  await expect(page.getByRole('heading',{name:'Entre na sua conta'})).toBeVisible();
});

test('Cadastro exige dados válidos antes de enviar',async({page})=>{
  await page.goto('/?page=signup');
  await page.getByRole('button',{name:'Criar conta',exact:true}).click();
  await expect(page.getByText('Campo obrigatório.',{exact:true})).toHaveCount(3);
  await page.getByLabel(/Nome completo/).fill('Teste QA');
  await page.getByLabel(/E-mail/).fill('qa@example.invalid');
  await page.getByLabel(/Senha/).fill('curta');
  await page.getByRole('button',{name:'Criar conta',exact:true}).click();
  await expect(page.locator('form').getByRole('alert')).toContainText('8 caracteres');
});

test('A carteira e o primeiro acesso exigem sessão',async({page,request})=>{
  for(const path of ['/?tab=properties','/?page=org']){
    await page.goto(path);
    await expect(page.getByRole('heading',{name:'Entre na sua conta'})).toBeVisible();
  }
  expect((await request.get('/api/workspace')).status()).toBe(401);
  await page.getByRole('button',{name:'Esqueci minha senha'}).click();
  await expect(page.getByRole('heading',{name:'Recuperar senha'})).toBeVisible();
});

test('Conta de QA persiste imóvel e conclui uma venda',async({page})=>{
  test.skip(!process.env.URBAN_QA_EMAIL || !process.env.URBAN_QA_PASSWORD,'Requer uma conta de QA confirmada em uma imobiliária de testes.');
  test.setTimeout(150000);
  const suffix=Date.now().toString();
  const property='Imóvel QA '+suffix, client='Cliente QA '+suffix, deal='Negociação QA '+suffix;
  await page.goto('/?page=login');
  await page.getByLabel(/E-mail/).fill(process.env.URBAN_QA_EMAIL!);
  await page.getByLabel(/Senha/).fill(process.env.URBAN_QA_PASSWORD!);
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Dashboard',exact:true})).toBeVisible({timeout:30000});
  await openModule(page,'Imóveis');
  await page.getByRole('button',{name:'Cadastrar imóvel'}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel(/Nome do imóvel/).fill(property);
  await dialog.getByLabel(/Código/).fill('QA-'+suffix);
  await dialog.getByLabel(/Valor anunciado/).fill('450000');
  await dialog.getByLabel(/Endereço/).fill('Rua QA, 204');
  await dialog.getByLabel(/Bairro/).fill('Centro');
  const save=()=>dialog.getByRole('button',{name:'Salvar',exact:true}).click();
  await save();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button',{name:property,exact:true})).toBeVisible();
  await openModule(page,'Clientes');
  await page.getByRole('button',{name:'Cadastrar cliente'}).click();
  await dialog.getByLabel(/Nome completo/).fill(client);
  await dialog.getByLabel(/E-mail/).fill('cliente-'+suffix+'@example.invalid');
  await dialog.getByLabel(/Imóvel de interesse/).selectOption({label:'QA-'+suffix+' · '+property});
  await save();
  await expect(dialog).toHaveCount(0);
  await openModule(page,'Negociações');
  await page.getByRole('button',{name:'Nova negociação'}).click();
  await dialog.getByLabel(/Nome da negociação/).fill(deal);
  await dialog.getByLabel(/Cliente/).selectOption({label:client});
  await dialog.getByLabel(/Imóvel/).selectOption({label:'QA-'+suffix+' · '+property});
  await dialog.getByLabel(/Valor negociado/).fill('450000');
  await save();
  const openDeal=()=>page.getByRole('button',{name:new RegExp(deal)}).click();
  await openDeal();
  for(const stage of ['Em atendimento','Proposta enviada','Negociação final','Fechada']){
    await dialog.getByRole('button',{name:'Avançar para '+stage}).click();
    await expect(dialog.locator('dd').getByText(stage,{exact:true})).toBeVisible();
  }
  await dialog.getByRole('button',{name:'Gerar contrato'}).click();
  await dialog.getByLabel(/Proprietário ou vendedor/).fill('Proprietário QA');
  await save();
  await openDeal();
  await dialog.getByRole('button',{name:'Ver contrato'}).click();
  for(const action of ['Enviar para assinatura','Registrar assinaturas','Concluir operação']){
    await dialog.getByRole('button',{name:action}).click();
  }
  await expect(dialog.locator('dd').getByText('Concluído',{exact:true})).toBeVisible();
  await dialog.getByRole('button',{name:'Fechar',exact:true}).click();
  await openModule(page,'Imóveis');
  await page.getByRole('textbox',{name:'Buscar na carteira'}).fill('QA-'+suffix);
  await expect(page.locator('tbody tr').getByText('Vendido',{exact:true})).toBeVisible();
});
