-- Mantém intactas as configurações e as mídias já cadastradas.
ALTER TABLE configuracao ADD COLUMN hero_chave varchar(300);
ALTER TABLE configuracao ADD COLUMN hero_content_type varchar(100);
