CREATE TABLE vivencia (
 id UUID PRIMARY KEY, version BIGINT,
 titulo VARCHAR(160) NOT NULL, descricao TEXT NOT NULL,
 duracao VARCHAR(100) NOT NULL, publicada BOOLEAN NOT NULL DEFAULT false,
 imovel_id UUID REFERENCES imovel(id) ON DELETE SET NULL,
 cliente VARCHAR(100) NOT NULL, nota INTEGER NOT NULL CHECK (nota BETWEEN 0 AND 5),
 comentario TEXT NOT NULL, hospedagem VARCHAR(160) NOT NULL,
 contato VARCHAR(160) NOT NULL DEFAULT '', foto_chave VARCHAR(255) NOT NULL,
 criado_em TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX vivencia_publicada_criado_idx ON vivencia(publicada, criado_em DESC, id);
ALTER TABLE midia ALTER COLUMN imovel_id DROP NOT NULL;
ALTER TABLE midia ADD COLUMN vivencia_id UUID REFERENCES vivencia(id) ON DELETE CASCADE;
ALTER TABLE midia ADD CONSTRAINT midia_um_proprietario CHECK ((imovel_id IS NOT NULL) <> (vivencia_id IS NOT NULL));
CREATE UNIQUE INDEX midia_unica_principal_vivencia ON midia(vivencia_id) WHERE principal = true;
