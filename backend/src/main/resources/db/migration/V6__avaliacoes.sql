CREATE TABLE avaliacao (
    id UUID PRIMARY KEY,
    version BIGINT,
    cliente VARCHAR(100) NOT NULL,
    nota INTEGER NOT NULL CHECK (nota BETWEEN 0 AND 5),
    comentario TEXT NOT NULL,
    hospedagem VARCHAR(160) NOT NULL,
    contato VARCHAR(160) NOT NULL DEFAULT '',
    foto_chave VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX avaliacao_criado_em_idx ON avaliacao (criado_em DESC, id);
