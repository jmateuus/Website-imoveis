-- Atualiza apenas os exemplos gerados pela carga original; preserva anúncios reais,
-- descrições personalizadas, slugs, fotos e configurações do proprietário.
UPDATE imovel SET
  titulo = CASE titulo
    WHEN 'Casa com jardim e varanda' THEN 'Casa para uma temporada em Casa Forte'
    WHEN 'Apartamento para viver perto do mar' THEN 'Apartamento para dias leves em Boa Viagem'
    WHEN 'Uma casa cheia de boas histórias' THEN 'Refúgio com varanda em Bairro Novo'
    WHEN 'Seu novo espaço em Boa Viagem' THEN 'Uma estadia especial em Boa Viagem'
    WHEN 'Casa tranquila com espaço ao ar livre' THEN 'Casa para descansar em Piedade'
    WHEN 'Aconchego e praticidade em Olinda' THEN 'Dias de descanso em Olinda'
    ELSE titulo END,
  hospedes = COALESCE(hospedes, quartos * 2),
  descricao = 'Hospedagem demonstrativa, com imagem ilustrativa gerada para apresentação do catálogo. Não representa uma oferta real.

Um espaço acolhedor para uma estadia com conforto, momentos em família e uma pausa na rotina. Conheça os ambientes e as comodidades e consulte o período da sua viagem pelo WhatsApp.'
WHERE descricao = 'Imóvel demonstrativo, com imagem ilustrativa gerada para apresentação do catálogo. Não constitui uma oferta real de aluguel.

Um espaço acolhedor e bem iluminado, com ambientes que convidam a viver com calma. Próximo a serviços do dia a dia, combina conforto e praticidade. Entre em contato para conhecer o funcionamento do site.';
