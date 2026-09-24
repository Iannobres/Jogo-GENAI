# Prompts de imagem: Bing Image Creator (DALL·E 3)

Guia para gerar todos os assets visuais do CASO 404 com o mesmo estilo dos dois que já existem (João Silva e Sala 404).

**Como usar:**
1. Abra https://www.bing.com/images/create.
2. Copie o prompt, gere a imagem e baixe a melhor variação.
3. Salve com **exatamente** o nome e a pasta indicados. O jogo carrega a imagem sozinho; enquanto ela não existir, aparece um placeholder.
4. Ao trocar uma **cena**, reposicione os hotspots (seção final).

Todos os prompts seguem a mesma "ficha de estilo" para manter a consistência entre gerações. Essa foi a mitigação proposta na seção 2.2 do documento do CP4.

> **Ficha de estilo (já inclusa em cada prompt):** fotografia realista, luz fria azulada, estilo still de investigação policial, alta qualidade, sem texto legível, sem marcas d'água.

---

## 1. Retratos: `client/public/assets/case-001/characters/`

Formato: quadrado ou retrato (3:4), plano fechado no rosto. O jogo recorta com `object-cover`.

| Arquivo | Status |
|---|---|
| `joao-silva.png` | ✅ pronto (Figura 1 do CP4) |
| `carlos-mendes.png` | ⬜ gerar |
| `helena-mendes.png` | ⬜ gerar |
| `mariana-costa.png` | ⬜ gerar |
| `ricardo-alves.png` | ⬜ gerar |
| `felipe-rocha.png` | ⬜ gerar |

**carlos-mendes.png** (vítima, foto de arquivo corporativa, viva)
```
Fotografia realista de um empresário branco de 52 anos, cabelo grisalho penteado para trás, rosto sério e exigente, terno azul-marinho impecável e gravata vinho, foto corporativa de arquivo em escritório com luz fria, estilo still de investigação policial, alta qualidade, foco no rosto, plano fechado.
```

**helena-mendes.png**
```
Fotografia realista de uma mulher branca de 48 anos, cabelo castanho escuro preso em coque baixo, blazer preto, brincos discretos de pérola, expressão fria e contida com olhos levemente marejados, olhando para a câmera em uma sala de interrogatório com luz fria, estilo still de investigação policial, alta qualidade, foco no rosto, plano fechado.
```

**mariana-costa.png**
```
Fotografia realista de uma mulher parda de 29 anos, cabelo cacheado na altura dos ombros, camisa social branca e crachá corporativo, olhos inchados de choro, expressão ansiosa e assustada, olhando para a câmera em um ambiente de escritório com luz fria, estilo still de investigação policial, alta qualidade, foco no rosto, plano fechado.
```

**ricardo-alves.png**
```
Fotografia realista de um homem negro de 38 anos, cabeça raspada, uniforme de segurança azul-marinho com rádio comunicador no ombro, expressão cansada e respeitosa, olhando para a câmera no saguão de um prédio comercial à noite com luz fria, estilo still de investigação policial, alta qualidade, foco no rosto, plano fechado.
```

**felipe-rocha.png**
```
Fotografia realista de um homem branco de 33 anos, cabelo castanho bagunçado, óculos de armação preta, moletom cinza com capuz, expressão sarcástica e desconfiada, meio sorriso de canto, olhando para a câmera em uma sala de interrogatório com luz fria, estilo still de investigação policial, alta qualidade, foco no rosto, plano fechado.
```

---

## 2. Cenas: `client/public/assets/case-001/scenes/`

Formato: **16:9**, plano aberto. São as telas de exploração.

| Arquivo | Status |
|---|---|
| `sala-404.png` | ✅ pronto (Figura 2 do CP4) |
| `corredor-copa.png` | ⬜ gerar |
| `monitoramento.png` | ⬜ gerar |

**corredor-copa.png**
```
Fotografia realista de um corredor de escritório corporativo à noite, luz fria e dramática, à esquerda a porta de um elevador de metal, ao centro uma pequena copa com bancada, garrafa de whisky e copos, à direita uma lixeira de metal ao lado da bancada, em primeiro plano uma mesa de assistente com papéis, atmosfera de cena de crime investigativa, estilo cinematográfico, plano aberto, 16:9.
```

**monitoramento.png**
```
Fotografia realista de uma sala de monitoramento de segurança no térreo de um prédio comercial à noite, parede com vários monitores de câmeras de vigilância no centro, à direita um painel de controle de acesso por crachá e um rack de servidor com luzes piscando, à esquerda uma mesa com um livro de ocorrências aberto e uma caneta, luz fria azulada, atmosfera de investigação policial, estilo cinematográfico, plano aberto, 16:9.
```

---

## 3. Evidências: `client/public/assets/case-001/evidence/`

Formato: 4:3, close de objeto sobre fundo escuro, como foto de perícia.

Base comum (cole no início de cada prompt):
```
Fotografia realista de perícia forense, close de objeto sobre superfície escura, luz fria lateral, etiqueta numerada amarela de evidência ao lado, fundo desfocado, alta qualidade, sem texto legível:
```

| Arquivo | Complemento do prompt |
|---|---|
| `copo.png` | um copo de whisky de vidro tombado sobre mesa de vidro, com resíduo esbranquiçado no fundo |
| `caixa-digoxina.png` | uma caixa de remédio branca aberta com uma única cartela de comprimidos dentro |
| `celular.png` | um smartphone preto com a tela acesa mostrando uma conversa de mensagens borrada |
| `contrato.png` | um contrato de várias páginas grampeado com anotação à caneta vermelha na margem |
| `agenda.png` | uma agenda de couro marrom aberta com anotações à mão, caneta tinteiro ao lado |
| `fechadura.png` | a maçaneta e a fechadura de uma porta de madeira escura com uma chave caída no carpete |
| `log-cameras.png` | um monitor de segurança mostrando uma grade de câmeras com imagens de corredor em preto e branco |
| `log-cartoes.png` | a tela de um sistema de controle de acesso com uma lista de registros e um crachá corporativo ao lado |
| `log-servidor.png` | um terminal de computador com linhas de log em texto verde e um alerta vermelho |
| `cartela.png` | uma cartela de comprimidos vazia e amassada no fundo de uma lixeira de metal, com pó branco |

---

## 4. Reposicionar hotspots ao trocar uma cena

Os pontos clicáveis ficam em `case-data/case-001/case.json` → `hotspots`, com `x`/`y` em **% da cena exibida em 16:9**.

1. Rode o jogo e abra `http://localhost:5173/?debug=1`.
2. Vá até a cena e clique sobre cada objeto: um aviso mostra `"x": .., "y": ..` (também sai no console).
3. Copie os valores para o hotspot correspondente no `case.json` e reinicie o servidor.

> Se a imagem não for 16:9, o jogo corta as bordas (`object-cover`). Por isso as coordenadas devem sempre ser medidas no jogo, não na imagem original.
