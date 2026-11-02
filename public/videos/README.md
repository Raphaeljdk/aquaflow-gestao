# Vídeos oficiais — Ducha Elitte

Esta pasta deve conter os dois arquivos finais do treinamento. A página **Como usar** verifica
se os MP4 estão disponíveis e passa a mostrá-los automaticamente, sem alterar os cadastros
do ERP, bancos individuais ou configurações de cobrança.

| Arquivo | Duração | Tamanho | Finalidade |
| --- | --- | --- | --- |
| `ducha_elitte_guia_rapido_todas_abas.mp4` | 40,1 s | 1.114.477 bytes | Vídeo principal |
| `ducha_elitte_treinamento_abas_suporte_chamados.mp4` | 114,45 s | 2.656.373 bytes | Treinamento completo |

**Importante:** usar os MP4s aprovados pelo proprietário (fornecidos na conversa do ChatGPT).
Não substituir por animações diferentes nem pelo antigo vídeo de 6min23s.
Os vídeos originais estão somente na conversa; um link `sandbox:` não é um endereço
público válido para incorporar na Vercel.

## Publicação

1. Adicione os dois MP4s aqui, com estes nomes exatos.
2. Faça commit na mesma branch da mudança da Central de Ajuda.
3. Confirme que a Vercel retorna `200` e `Content-Type: video/mp4` em `/videos/<nome>.mp4` para ambos.
4. Confira reprodução, duração, áudio e controles no desktop e no iPhone.
5. Publique a branch depois dos testes. O treinamento de 6min23s fica como fallback
   enquanto os dois novos arquivos não forem publicados.

Nenhum segredo, credencial, dado de cliente ou alteração de banco é necessário.
