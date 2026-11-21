# QA da URBAN

## Casos manuais no Qase

O arquivo [qase-urban.csv](qase-urban.csv) contém 20 casos planejados para execução manual. A existência dos casos no repositório não significa que foram executados ou aprovados. UR-QA-01 a UR-QA-16 seguem os cenários do briefing. Os quatro restantes verificam duplicidade, isolamento por imobiliária, conclusão de venda e aceite de convite. Cada caso identifica o requisito e a prioridade originais na descrição.

No repositório de casos do Qase, use **Import Data**, selecione a origem **Qase.io**, escolha o CSV e indique a suíte de destino. Os cenários usam Gherkin no formato CSV v2. Ao criar uma execução, registre separadamente o ambiente, o commit, o navegador, o viewport e o resultado realmente observado. [Guia de importação do Qase](https://docs.qase.io/en/articles/5563719-import-test-cases)

## Execução local

Com as dependências do projeto instaladas, rode os testes de domínio e o conjunto de navegador.

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

O conjunto de navegador inicia o Next na porta 3100. A variável `PLAYWRIGHT_BASE_URL` aponta para outra instância já em execução. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` permite usar um Chromium instalado no computador. Em caso de falha, as capturas e o trace ficam em `test-results/`.

Os testes públicos cobrem a landing, a navegação de acesso, a validação de cadastro e a exigência de sessão para abrir a carteira. A suíte também inclui um fluxo autenticado de venda. Para executá-lo, use uma imobiliária exclusiva de QA e defina `URBAN_QA_EMAIL` e `URBAN_QA_PASSWORD` no ambiente com as credenciais de uma conta confirmada. A cada execução o teste cria registros identificados pelo prefixo QA. Sem as credenciais o Playwright identifica esse cenário como ignorado.

## Percurso manual com contas novas

1. Abra a landing em uma janela sem sessão. Cadastre um endereço de teste que possa receber mensagens. Abra o link recebido e confirme que a aplicação solicita os dados da imobiliária.
2. Crie a imobiliária e confira que a carteira começa vazia. Cadastre um imóvel e um cliente, saia, entre novamente e confirme a persistência.
3. Em Equipe, crie um convite para outro endereço controlado. Abra o link em outro perfil do navegador e conclua o cadastro com o endereço convidado. Confira o papel de corretor, a carteira compartilhada de imóveis e os limites de acesso a clientes e configurações.
4. Em outro perfil, crie uma segunda imobiliária independente e confira a separação das duas carteiras.
5. Registre atendimento, crie e avance uma negociação, conclua o contrato e confira o imóvel, as operações e o relatório exportado.
6. Solicite recuperação de senha. Siga o link recebido, defina outra senha e confirme o login com ela.

Registre no Qase a versão publicada, o navegador, o papel, a operação e o resultado observado. Use dados fictícios nos cadastros e endereços sob seu controle para os testes de mensagem. Para testar o banco separadamente, rode [schema.test.sql](../supabase/schema.test.sql) apenas em um banco de testes descartável.

## Antes de divulgar resultados

Mantenha separadas três informações: **casos planejados** (CSV), **testes automatizados implementados** (pasta `tests/`) e **resultados observados** (execuções e evidências no Qase). Não apresente os 20 casos como aprovados sem um ciclo efetivo de execução. Evite publicar tokens, credenciais, dados reais de clientes ou imagens de ambientes privados.
