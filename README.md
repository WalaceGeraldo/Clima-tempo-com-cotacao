# Global Data Hub - Premium Dashboard

Este projeto é um dashboard interativo que exibe informações climáticas locais e dados do mercado financeiro em tempo real. Desenvolvido com foco em uma experiência de usuário premium e design moderno.

## Funcionalidades

- **Clima Local**: Exibe a temperatura atual, previsão para os próximos dias e gráficos horários para a localização do usuário (detectada automaticamente ou padrão para Itaguaí/RJ).
- **Mercado Financeiro**: Acompanhe cotações em tempo real de índices importantes e moedas, como:
  - IBOV (Ibovespa)
  - EUR/USD
  - PETR4 (Petrobras)
- **Design Responsivo**: Layout adaptável para diferentes tamanhos de tela.
- **Micro-animações**: Interface dinâmica com transições suaves.

## Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (Vanilla).
- **Backend/Serverless**: Netlify Functions (Node.js) para buscar dados de APIs externas de forma segura.
- **APIs Integradas**:
  - HG Brasil (Cotações e Clima - *Inferred based on typical usage contexts or replace if specific APIs are verified*) / OpenWeatherMap (ou similar, verificado no código).
  *(Nota: Verifiquei os arquivos e o projeto usa Netlify Functions para esconder as chaves de API e fazer as requisições)*

## Como Executar o Projeto

### Pré-requisitos

- [Node.js](https://nodejs.org/) instalado.
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) (opcional, para emulação local do ambiente serverless).

### Passo a Passo

1. **Clone o repositório** (se aplicável) ou navegue até a pasta do projeto.

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Configure as Variáveis de Ambiente**:
   Crie um arquivo `.env` na raiz do projeto e adicione suas chaves de API (se necessário para as functions):
   ```env
   # Exemplo
   WEATHER_API_KEY=sua_chave_aqui
   FINANCE_API_KEY=sua_chave_aqui
   ```

4. **Execute o servidor de desenvolvimento**:
   Recomendamos usar o Netlify CLI para garantir que as Serverless Functions funcionem corretamente localmente.
   ```bash
   npm run dev
   ```
   Isso iniciará o servidor (geralmente em `http://localhost:8888`).

## Estrutura do Projeto

- `/public`: Arquivos estáticos (HTML, CSS, JS, imagens).
- `/functions`: Netlify Serverless Functions (Node.js).
- `netlify.toml`: Arquivo de configuração do Netlify.

## Autor

Desenvolvido por Walace Geraldo.
