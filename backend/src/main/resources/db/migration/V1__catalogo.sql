CREATE TABLE administrador (
 id uuid PRIMARY KEY, email varchar(254) NOT NULL UNIQUE, senha_hash varchar(100) NOT NULL
);
CREATE TABLE imovel (
 id uuid PRIMARY KEY, titulo varchar(160) NOT NULL, slug varchar(180) NOT NULL UNIQUE,
 descricao text NOT NULL, tipo varchar(20) NOT NULL, aluguel numeric(12,2) NOT NULL CHECK (aluguel > 0),
 condominio numeric(12,2), iptu numeric(12,2), area numeric(10,2), quartos integer, suites integer,
 banheiros integer, vagas integer, hospedes integer, cidade varchar(100) NOT NULL, estado varchar(2) NOT NULL,
 bairro varchar(100) NOT NULL, endereco varchar(255), publicar_endereco boolean NOT NULL DEFAULT false,
 mobiliado boolean NOT NULL, aceita_animais boolean NOT NULL, destaque boolean NOT NULL,
 status varchar(20) NOT NULL CHECK (status IN ('RASCUNHO','DISPONIVEL','INDISPONIVEL')),
 criado_em timestamptz NOT NULL, atualizado_em timestamptz NOT NULL
);
CREATE INDEX imovel_status_criado ON imovel(status, criado_em DESC);
CREATE INDEX imovel_localizacao ON imovel(cidade, bairro);
CREATE TABLE comodidade (id uuid PRIMARY KEY, nome varchar(80) NOT NULL UNIQUE);
CREATE TABLE imovel_comodidade (
 imovel_id uuid NOT NULL REFERENCES imovel(id) ON DELETE CASCADE,
 comodidade_id uuid NOT NULL REFERENCES comodidade(id), PRIMARY KEY (imovel_id, comodidade_id)
);
CREATE TABLE midia (
 id uuid PRIMARY KEY, imovel_id uuid NOT NULL REFERENCES imovel(id) ON DELETE CASCADE,
 tipo varchar(10) NOT NULL, chave varchar(300) NOT NULL UNIQUE, miniatura varchar(300),
 nome_original varchar(255) NOT NULL, content_type varchar(100) NOT NULL,
 tamanho bigint NOT NULL, ordem integer NOT NULL, principal boolean NOT NULL DEFAULT false, criado_em timestamptz NOT NULL
);
CREATE UNIQUE INDEX midia_unica_principal ON midia(imovel_id) WHERE principal = true;
CREATE TABLE configuracao (
 id integer PRIMARY KEY CHECK (id = 1), nome varchar(120) NOT NULL, whatsapp varchar(15) NOT NULL DEFAULT '',
 email varchar(254), titulo_principal varchar(160) NOT NULL, texto_principal varchar(500) NOT NULL,
 rodape varchar(500) NOT NULL, logo_chave varchar(300), logo_content_type varchar(100)
);
INSERT INTO configuracao(id, nome, titulo_principal, texto_principal, rodape)
 VALUES(1, 'Morada', 'Um novo lugar para chamar de seu.', 'Encontre um imóvel que combina com o seu próximo capítulo. Converse diretamente com quem cuida dele.', 'Bons lugares. Novos começos.');
INSERT INTO comodidade(id, nome) VALUES
 ('10000000-0000-0000-0000-000000000001', 'Varanda'),
 ('10000000-0000-0000-0000-000000000002', 'Piscina'),
 ('10000000-0000-0000-0000-000000000003', 'Elevador'),
 ('10000000-0000-0000-0000-000000000004', 'Portaria 24h'),
 ('10000000-0000-0000-0000-000000000005', 'Ar-condicionado'),
 ('10000000-0000-0000-0000-000000000006', 'Área de serviço'),
 ('10000000-0000-0000-0000-000000000007', 'Churrasqueira'),
 ('10000000-0000-0000-0000-000000000008', 'Academia'),
 ('10000000-0000-0000-0000-000000000009', 'Próximo à praia'),
 ('10000000-0000-0000-0000-000000000010', 'Jardim');
CREATE TABLE exclusao_objeto (chave varchar(300) PRIMARY KEY, criado_em timestamptz NOT NULL DEFAULT now());
