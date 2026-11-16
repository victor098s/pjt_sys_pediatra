CREATE TABLE IF NOT EXISTS grupos (
    id SERIAL PRIMARY KEY,
    nome_grupo VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    email VARCHAR(100) NOT NULL,
    telefone VARCHAR(15) NOT NULL,
    senha VARCHAR(256) NOT NULL,
    grupo_id INT REFERENCES grupos(id) ON DELETE RESTRICT
);

insert into grupos (nome_grupo) values
('Convênio Bronze'),
('Particular Especial'),
('Atendimento especial')
ON CONFLICT (id) DO NOTHING;



-- 4. Inserção dos clientes com hash bcrypt
insert into clientes (nome, cpf, email, telefone, senha, grupo_id)
VALUES ('Administrador','123.456.789-00','admin@email.com','(10) 09209-2020','$2b$10$RPRvAT2wzYntmwkzShklsOxIwIuvx.lBKqbhRhUSteW1ILbU1L./G',1)
ON CONFLICT (cpf) DO NOTHING;

insert into clientes (nome, cpf, email, telefone, senha, grupo_id)
VALUES ('Joao full','222.000.111-99','jfull@email.com','(20) 20900-1111','$2b$10$RPRvAT2wzYntmwkzShklsOxIwIuvx.lBKqbhRhUSteW1ILbU1L./G',2)
ON CONFLICT (cpf) DO NOTHING;

insert into clientes (nome, cpf, email, telefone, senha, grupo_id)
VALUES ('Marlon full','000.900.700-80','mfull@email.com','(11) 40409-7799','$2b$10$RPRvAT2wzYntmwkzShklsOxIwIuvx.lBKqbhRhUSteW1ILbU1L./G',3)
ON CONFLICT (cpf) DO NOTHING;

create view vw_cliente_completa AS
SELECT c.id, c.nome, c.cpf, c.email, c.telefone, c.senha, g.nome_grupo
FROM clientes AS c
INNER JOIN grupos AS g
ON g.id = c.grupo_id;

select  * from grupos;

select * from clientes