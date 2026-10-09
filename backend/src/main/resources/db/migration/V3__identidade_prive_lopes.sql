-- Mantém configurações personalizadas; atualiza apenas os valores iniciais da marca antiga.
UPDATE configuracao SET nome = 'Privê Lopes | Hospedagens' WHERE id = 1 AND nome = 'Morada';
UPDATE configuracao SET whatsapp = '5581995809198' WHERE id = 1 AND (whatsapp IS NULL OR whatsapp = '');
UPDATE configuracao SET titulo_principal = 'Seu próximo destino começa aqui.' WHERE id = 1 AND titulo_principal = 'Um novo lugar para chamar de seu.';
UPDATE configuracao SET texto_principal = 'Descubra hospedagens incríveis nas praias do Nordeste e aproveite cada momento da sua viagem.' WHERE id = 1 AND texto_principal = 'Encontre um imóvel que combina com o seu próximo capítulo. Converse diretamente com quem cuida dele.';
UPDATE configuracao SET rodape = 'Privê Lopes | Hospedagens — encontre seu refúgio para férias, finais de semana e feriados.' WHERE id = 1 AND rodape = 'Bons lugares. Novos começos.';
