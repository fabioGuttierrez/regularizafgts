# Search Console e Google Analytics 4

## 1. Google Search Console

1. Acesse https://search.google.com/search-console com a conta Google que administrará o site.
2. Clique em **Adicionar propriedade**.
3. Escolha **Domínio**, não apenas prefixo de URL.
4. Informe `regularizafgts.com.br` sem `https://`.
5. Copie o registro TXT exibido pelo Search Console.
6. No provedor DNS do domínio, crie um registro:
   - Tipo: `TXT`
   - Host/Nome: `@` ou vazio, conforme o provedor
   - Valor: o token completo fornecido pelo Google
7. Salve o DNS, aguarde a propagação e clique em **Verificar**.
8. No Search Console, abra **Sitemaps** e envie:
   `https://regularizafgts.com.br/sitemap.xml`
9. Em **Inspeção de URL**, teste:
   - `https://regularizafgts.com.br/`
   - `https://regularizafgts.com.br/regularizacao-de-fgts/`
10. Clique em **Solicitar indexação** para a nova página depois que o deploy estiver público.
11. Após alguns dias, acompanhe **Desempenho**, **Indexação > Páginas**, **Experiência > Core Web Vitals** e **Links**.

Não é necessário inserir o código de verificação HTML se a propriedade de domínio for validada por DNS. Não remova o TXT depois da verificação: ele pode ser usado para confirmar a propriedade novamente.

## 2. Google Analytics 4

1. Acesse https://analytics.google.com.
2. Crie ou escolha a conta da empresa.
3. Em **Administrador**, clique em **Criar propriedade**.
4. Informe o nome `RegularizaFGTS`, fuso `Brasil` e moeda `BRL`.
5. Crie um fluxo de dados **Web**.
6. Informe `https://regularizafgts.com.br` e um nome como `Site RegularizaFGTS`.
7. Copie o **ID de medição**, no formato `G-XXXXXXXXXX`.
8. Não coloque esse ID no repositório público antes de revisar o consentimento e a política de privacidade.

O site já possui o ponto de extensão `loadAnalytics()` em `js/main.js`. Depois de obter o ID, substitua os placeholders nessa função por:

```js
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
const gaScript = document.createElement('script');
gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
gaScript.async = true;
document.head.appendChild(gaScript);

gaScript.onload = () => {
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    page_path: window.location.pathname
  });
};
```

Mantenha a chamada a `loadAnalytics()` somente depois do aceite de cookies. Se o visitante recusar, não carregue o script de Analytics.

## 3. Eventos de conversão

No envio bem-sucedido do formulário, depois de `saveLead(data)` retornar sucesso, registre um evento próprio:

```js
if (typeof gtag === 'function') {
  gtag('event', 'generate_lead', {
    method: 'formulario_diagnostico',
    page_location: window.location.href
  });
}
```

Para o WhatsApp, adicione um listener aos links `.whatsapp-float` e registre:

```js
gtag('event', 'contact', { method: 'whatsapp' });
```

No GA4, abra **Administrador > Eventos**, marque `generate_lead` como conversão. Crie também eventos para `whatsapp_click` e `form_start` somente se eles forem úteis para decisões comerciais.

Nunca envie nome, e-mail, telefone, CNPJ, mensagem ou qualquer outro dado pessoal para o GA4. Envie apenas o tipo de ação e informações técnicas não identificáveis.

## 4. Vincular Search Console ao GA4

1. No GA4, abra **Administrador**.
2. Na coluna da propriedade, selecione **Vínculos com outros produtos > Vínculos do Search Console**.
3. Clique em **Vincular**.
4. Selecione a propriedade `regularizafgts.com.br`.
5. Selecione o fluxo Web do site.
6. Confirme o vínculo.

Para isso, a conta precisa ter permissão de editor no GA4 e acesso à propriedade do Search Console.

## 5. Validação

Depois do deploy:

1. Abra o site em uma janela anônima.
2. Recuse cookies e confirme que o script do Google não é carregado antes do consentimento.
3. Aceite cookies.
4. No GA4, abra **Relatórios > Tempo real**.
5. Navegue para `/regularizacao-de-fgts/` e clique no CTA.
6. Envie um formulário de teste usando dados autorizados e fictícios.
7. Confirme o evento em **Administrador > DebugView** ou no relatório em tempo real.
8. No Search Console, confirme sitemap processado e solicitação de indexação.
