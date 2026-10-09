# Redirecionamento do domínio canônico

O domínio canônico do projeto é `https://regularizafgts.com.br`.

## Netlify

O arquivo `_redirects` na raiz do projeto já contém regras para `www`, HTTP e HTTPS. Publique o projeto e confirme que o certificado cobre `www.regularizafgts.com.br`.

## Nginx

Adicione um bloco separado para o host `www` (com certificado válido para os dois nomes):

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.regularizafgts.com.br;

    ssl_certificate     /caminho/para/fullchain.pem;
    ssl_certificate_key /caminho/para/privkey.pem;

    return 301 https://regularizafgts.com.br$request_uri;
}
```

Também redirecione HTTP para HTTPS e teste a configuração:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Apache

No `.htaccess` da raiz pública:

```apache
RewriteEngine On
RewriteCond %{HTTPS} !=on [OR]
RewriteCond %{HTTP_HOST} ^www\.regularizafgts\.com\.br$ [NC]
RewriteRule ^ https://regularizafgts.com.br%{REQUEST_URI} [R=301,L,NE]
```

## Validação

```bash
curl -I https://www.regularizafgts.com.br/
curl -I http://www.regularizafgts.com.br/
curl -IL 'https://www.regularizafgts.com.br/fgts-para-empresas/?utm_source=test'
```

O resultado esperado é um único `301` para o mesmo caminho no domínio sem `www`, seguido de `200` na URL final.
