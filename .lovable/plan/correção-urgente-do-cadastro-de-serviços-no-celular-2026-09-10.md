# Correção urgente do cadastro de serviços no celular

## Diagnóstico confirmado

- A tela mostra muitos elementos de qualidade antes dos campos, empurrando o preenchimento para baixo e dificultando a leitura no celular.
- O anúncio pode ser bloqueado por pontuação baixa, embora descrição e foto apareçam como opcionais; a foto só é oferecida depois da publicação. Essa contradição impede cadastros legítimos.
- A validação de termos muda entre etapas: qualquer ocorrência bloqueia o avanço, mas a regra final tolera até três.
- A barra inferior permanece sobre o painel de cadastro e pode cobrir campos e ações.
- O auxílio existente fica em links pequenos e exige que a pessoa saia para outro site; não funciona como assistente visível de preenchimento.

## Implementação

1. **Simplificar a primeira etapa**
   - Mostrar primeiro título, categoria e um botão destacado “Preencher com ajuda”.
   - Recolher pontuação e prévia em uma seção opcional, sem ocupar o primeiro enquadramento do celular.
   - Organizar preço e categoria em uma coluna no celular.

2. **Assistente de preenchimento na própria tela**
   - Criar um painel guiado com opções grandes baseadas na categoria escolhida.
   - Ao escolher uma opção, preencher título e descrição localmente, sem IA paga e sem sair da página.
   - Exibir instrução curta para cada etapa e indicar claramente o único próximo passo.

3. **Desbloquear publicação legítima**
   - Transformar a pontuação de qualidade em recomendação, não impedimento.
   - Manter bloqueio apenas para excesso real de termos proibidos, com correção em um toque.
   - Tornar descrição, foto, preço, redes sociais e palavras-chave explicitamente opcionais.
   - Usar “A combinar” quando horários não forem informados.

4. **Corrigir experiência mobile**
   - Garantir largura integral sem corte horizontal.
   - Colocar o painel acima da barra inferior global e manter ações sempre visíveis.
   - Aumentar áreas de toque e ajustar textos longos para telas estreitas e zoom de 150%.
   - Levar a pessoa diretamente ao campo com erro.

5. **Validação**
   - Adicionar testes para publicação com dados mínimos, assistente local, descrição vazia e termos proibidos.
   - Testar o fluxo autenticado em celular e desktop, incluindo criação, confirmação e reaparecimento na lista.
