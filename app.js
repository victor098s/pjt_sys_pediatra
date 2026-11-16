import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "./db.js";
import { exigirAutenticacao } from "./middleware/auth.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const saltRounds = 10;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "troque-esta-chave-em-producao",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  }),
);
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  next();
});

const cpfSomenteDigitos = (cpf) => String(cpf || "").replace(/\D/g, "");
const erroBanco = (e) =>
  e.code === "23505"
    ? "Este CPF já está cadastrado."
    : e.code === "23503"
      ? "O registro relacionado não existe ou ainda está em uso."
      : "Não foi possível concluir a operação.";
const renderErro = (res, view, erro, locals = {}) =>
  res.status(400).render(view, { erro, ...locals });
async function responsavelPorCpf(cpf) {
  const { rows } = await pool.query("SELECT * FROM responsaveis");
  for (const responsavel of rows) {
    if (await bcrypt.compare(cpf, responsavel.cpf)) return responsavel;
    // Compatibilidade temporária com CPFs que foram cadastrados antes da adoção do hash.
    if (/^\d{11}$/.test(responsavel.cpf) && responsavel.cpf === cpf)
      return responsavel;
  }
  return null;
}

app.get("/", (req, res) =>
  res.redirect(req.session.usuario ? "/agendamentos" : "/login"),
);
app.get("/login", (req, res) => res.render("login", { erro: null }));
app.post("/login", async (req, res, next) => {
  try {
    const emailDigitado = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const senhaDigitada = String(req.body.senha || "");
    if (!emailDigitado || !senhaDigitada)
      return renderErro(res, "login", "E-mail ou senha inv?lidos.");

    const resultado = await pool.query(
      "SELECT id, nome, email, senha FROM usuarios WHERE LOWER(email) = $1",
      [emailDigitado],
    );
    const usuario = resultado.rows[0];
    const senhaValida =
      usuario && (await bcrypt.compare(senhaDigitada, usuario.senha));
    if (!senhaValida)
      return renderErro(res, "login", "E-mail ou senha inv?lidos.");

    req.session.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
    };
    return res.redirect("/agendamentos");
  } catch (e) {
    next(e);
  }
});
app.post("/logout", (req, res) =>
  req.session.destroy(() => res.redirect("/login")),
);

app.get("/responsaveis", exigirAutenticacao, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id,nome,email,telefone FROM responsaveis ORDER BY nome",
    );
    res.render("responsaveis", { responsaveis: rows, erro: null });
  } catch (e) {
    next(e);
  }
});
app.get("/responsaveis/novo", exigirAutenticacao, (req, res) =>
  res.render("novo-responsavel", { erro: null }),
);
app.post("/responsaveis/novo", exigirAutenticacao, async (req, res, next) => {
  const { nome, email, telefone } = req.body;
  const cpf = cpfSomenteDigitos(req.body.cpf);
  if (!nome || !email || !telefone || !/^\d{11}$/.test(cpf))
    return renderErro(
      res,
      "novo-responsavel",
      "Preencha os dados e informe um CPF com 11 dígitos.",
    );
  try {
    if (await responsavelPorCpf(cpf))
      return renderErro(
        res,
        "novo-responsavel",
        "Este CPF já está cadastrado.",
      );
    const cpfHash = await bcrypt.hash(cpf, saltRounds);
    await pool.query(
      "INSERT INTO responsaveis(nome,cpf,email,telefone) VALUES($1,$2,$3,$4)",
      [nome.trim(), cpfHash, email.trim(), telefone.trim()],
    );
    res.redirect("/responsaveis");
  } catch (e) {
    if (e.code === "23505")
      return renderErro(res, "novo-responsavel", erroBanco(e));
    next(e);
  }
});
app.get(
  "/responsaveis/editar/:id",
  exigirAutenticacao,
  async (req, res, next) => {
    try {
      const q = await pool.query(
        "SELECT id,nome,email,telefone FROM responsaveis WHERE id=$1",
        [req.params.id],
      );
      if (!q.rowCount) return res.sendStatus(404);
      res.render("editar-responsavel", { responsavel: q.rows[0], erro: null });
    } catch (e) {
      next(e);
    }
  },
);
app.post(
  "/responsaveis/editar/:id",
  exigirAutenticacao,
  async (req, res, next) => {
    const { nome, email, telefone } = req.body;
    try {
      const q = await pool.query(
        "UPDATE responsaveis SET nome=$1,email=$2,telefone=$3 WHERE id=$4 RETURNING id",
        [nome.trim(), email.trim(), telefone.trim(), req.params.id],
      );
      if (!q.rowCount) return res.sendStatus(404);
      res.redirect("/responsaveis");
    } catch (e) {
      next(e);
    }
  },
);
app.post(
  "/responsaveis/excluir/:id",
  exigirAutenticacao,
  async (req, res, next) => {
    try {
      await pool.query("DELETE FROM responsaveis WHERE id=$1", [req.params.id]);
      res.redirect("/responsaveis");
    } catch (e) {
      if (e.code === "23503")
        return res
          .status(409)
          .send("Responsável possui crianças ou agendamentos vinculados.");
      next(e);
    }
  },
);

app.get("/criancas", exigirAutenticacao, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT c.id,c.nome,c.idade,c.responsavel,r.nome AS nome_responsavel FROM criancas c JOIN responsaveis r ON r.id=c.responsavel ORDER BY c.nome",
    );
    res.render("criancas", { criancas: rows, erro: null });
  } catch (e) {
    next(e);
  }
});
async function carregarResponsaveis() {
  return (await pool.query("SELECT id,nome FROM responsaveis ORDER BY nome"))
    .rows;
}
app.get("/criancas/novo", exigirAutenticacao, async (req, res, next) => {
  try {
    res.render("nova-crianca", {
      responsaveis: await carregarResponsaveis(),
      erro: null,
    });
  } catch (e) {
    next(e);
  }
});
app.post("/criancas/novo", exigirAutenticacao, async (req, res, next) => {
  const { nome, idade, responsavel } = req.body;
  if (
    !nome ||
    !Number.isInteger(Number(idade)) ||
    Number(idade) < 0 ||
    !responsavel
  )
    return renderErro(
      res,
      "nova-crianca",
      "Informe nome, idade válida e responsável.",
      { responsaveis: await carregarResponsaveis() },
    );
  try {
    await pool.query(
      "INSERT INTO criancas(nome,idade,responsavel) VALUES($1,$2,$3)",
      [nome.trim(), Number(idade), responsavel],
    );
    res.redirect("/criancas");
  } catch (e) {
    next(e);
  }
});
app.get("/criancas/editar/:id", exigirAutenticacao, async (req, res, next) => {
  try {
    const q = await pool.query("SELECT * FROM criancas WHERE id=$1", [
      req.params.id,
    ]);
    if (!q.rowCount) return res.sendStatus(404);
    res.render("editar-crianca", {
      crianca: q.rows[0],
      responsaveis: await carregarResponsaveis(),
      erro: null,
    });
  } catch (e) {
    next(e);
  }
});
app.post("/criancas/editar/:id", exigirAutenticacao, async (req, res, next) => {
  const { nome, idade, responsavel } = req.body;
  try {
    const q = await pool.query(
      "UPDATE criancas SET nome=$1,idade=$2,responsavel=$3 WHERE id=$4 RETURNING id",
      [nome.trim(), Number(idade), responsavel, req.params.id],
    );
    if (!q.rowCount) return res.sendStatus(404);
    res.redirect("/criancas");
  } catch (e) {
    next(e);
  }
});
app.post(
  "/criancas/excluir/:id",
  exigirAutenticacao,
  async (req, res, next) => {
    try {
      await pool.query("DELETE FROM criancas WHERE id=$1", [req.params.id]);
      res.redirect("/criancas");
    } catch (e) {
      if (e.code === "23503")
        return res.status(409).send("Criança possui agendamentos vinculados.");
      next(e);
    }
  },
);

app.get("/agendamentos", exigirAutenticacao, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM relatorio_completo ORDER BY data_agendada,hora_agendada",
    );
    res.render("agendamentos", { agendamentos: rows, erro: null });
  } catch (e) {
    next(e);
  }
});
async function carregarOpcoesAgendamento() {
  const [criancas, responsaveis] = await Promise.all([
    pool.query("SELECT id,nome,responsavel FROM criancas ORDER BY nome"),
    pool.query("SELECT id,nome FROM responsaveis ORDER BY nome"),
  ]);
  return { criancas: criancas.rows, responsaveis: responsaveis.rows };
}
app.get("/agendamentos/novo", exigirAutenticacao, async (req, res, next) => {
  try {
    res.render("novo-agendamento", {
      ...(await carregarOpcoesAgendamento()),
      erro: null,
    });
  } catch (e) {
    next(e);
  }
});
app.post("/agendamentos/novo", exigirAutenticacao, async (req, res, next) => {
  const { data_agendada, hora_agendada, motivo, crianca, responsavel } =
    req.body;
  try {
    await pool.query(
      "INSERT INTO agendamentos(data_agendada,hora_agendada,motivo,crianca,responsavel) VALUES($1,$2,$3,$4,$5)",
      [data_agendada, hora_agendada, motivo.trim(), crianca, responsavel],
    );
    res.redirect("/agendamentos");
  } catch (e) {
    next(e);
  }
});
app.get(
  "/agendamentos/editar/:id",
  exigirAutenticacao,
  async (req, res, next) => {
    try {
      const q = await pool.query("SELECT * FROM agendamentos WHERE id=$1", [
        req.params.id,
      ]);
      if (!q.rowCount) return res.sendStatus(404);
      res.render("editar-agendamento", {
        agendamento: q.rows[0],
        ...(await carregarOpcoesAgendamento()),
        erro: null,
      });
    } catch (e) {
      next(e);
    }
  },
);
app.post(
  "/agendamentos/editar/:id",
  exigirAutenticacao,
  async (req, res, next) => {
    const { data_agendada, hora_agendada, motivo, crianca, responsavel } =
      req.body;
    try {
      const q = await pool.query(
        "UPDATE agendamentos SET data_agendada=$1,hora_agendada=$2,motivo=$3,crianca=$4,responsavel=$5 WHERE id=$6 RETURNING id",
        [
          data_agendada,
          hora_agendada,
          motivo.trim(),
          crianca,
          responsavel,
          req.params.id,
        ],
      );
      if (!q.rowCount) return res.sendStatus(404);
      res.redirect("/agendamentos");
    } catch (e) {
      next(e);
    }
  },
);
app.post(
  "/agendamentos/excluir/:id",
  exigirAutenticacao,
  async (req, res, next) => {
    try {
      await pool.query("DELETE FROM agendamentos WHERE id=$1", [req.params.id]);
      res.redirect("/agendamentos");
    } catch (e) {
      next(e);
    }
  },
);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

export { app, responsavelPorCpf };
