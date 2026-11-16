create table usuarios (
id serial primary key,
nome varchar(50) not null,
email varchar(100) not null,
senha varchar(255) not null
);


create table responsaveis (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(100) NOT NULL,
    telefone VARCHAR(15) NOT NULL
);


create table criancas (
id serial primary key,
nome varchar(100) not null,
idade int not null,
responsavel int references responsaveis(id) on delete restrict
);


create table agendamentos (

id serial primary key,
data_agendada date not null,
hora_agendada time not null,
motivo varchar(120) not null,
crianca int references criancas(id) on delete restrict,
responsavel int references responsaveis(id) on delete restrict

);



create view relatorio_completo as 

select a.id as id_agendamento, a.data_agendada, a.hora_agendada, a.motivo, c.nome as nome_da_crianca,
r.nome as nome_do_responsavel from agendamentos as a
inner join criancas as c
on a.crianca = c.id
inner join responsaveis as r
on a.responsavel = r.id


--========= INSERTS ===========================-



insert into usuarios (nome, email, senha) VALUES
('Victor Santos', 'victor@gmail.com', '$2b$10$2YEkfM8wFzoMXkf7myLBJeExFVHiML4nibBUyN8g1Q16Otds/lHBO'),
('Mariana Oliveira', 'mariana@gmail.com', '$2b$10$O48dAzjmUFqYV1H4ObKmbu7g0dt2.NoEo5ADpHuYu1Iib3d9Qu08K'),
('Lucas Ferreira', 'lucas@gmail.com', '$2b$10$lxlVy7xwrkWtbqid3w324.ZUuq4j169uq59BPY9gEgIIgkOLVHEiS');



insert into responsaveis (nome, cpf, email, telefone) VALUES

--== CPF: 123.456.789-00 ==--

('Carlos Henrique', '$2b$10$w5zjLX6U8D8xVp8/miub2.FaBjvmMPjsf9TBkfl2H7M1ZDkrelVHy', 'carlos@gmail.com', '(19) 99999-1111'),

--== CPF: 222.333.444-22 ==--
('Ana Paula', '$2b$10$Yzt7e3p9pHtagB0iWHAjveWjQH4DWVKK8z9RVEIukFJ5geVZnw5ou', 'ana@gmail.com', '(19) 98888-2222'),

--== CPF: 111.222.333-90 ==--
('Roberto Almeida', '$2b$10$Zc44uodHlZV.unZO2O.bt.9d3G.ERhzKPCY2X.5mDeJeEaB7wu5FG', 'roberto@gmail.com', '(19) 97777-3333'),

--== CPF: 111.111.111-10 ==--

('Fernanda Costa', '$2b$10$5Zt2RKM3I9hP1wJAeQ8.c.T65Ey8ZB8a05OB5bKb4pNLoRzuusOcC', 'fernanda@gmail.com', '(19) 96666-4444');



insert into criancas (nome, idade, responsavel) VALUES
('Pedro Henrique', 5, 1),
('Sofia Almeida', 7, 2),
('Miguel Costa', 4, 3),
('Laura Martins', 6, 4);



insert into agendamentos
(data_agendada, hora_agendada, motivo, crianca, responsavel) VALUES
('2026-11-17', '08:00', 'Consulta de rotina', 1, 1),
('2026-11-17', '09:30', 'Avaliação pediátrica', 2, 2),
('2026-11-18', '10:00', 'Vacinação', 3, 3),
('2026-11-18', '14:00', 'Retorno médico', 4, 4);


SELECT * FROM relatorio_completo;

select *  from criancas

select * from responsaveis




