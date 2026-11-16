// Importação do bcrypt via padrão ES6 Modules
import bcrypt from "bcrypt";

const cpfPlana = "111.111.111-10";
const saltRounds = 10; // Custo de processamento para geração do Salt

async function gerarHashCpf() {
  try {
    // Gera o hash unidirecional com salt embutido
    const hash = await bcrypt.hash(cpfPlana, saltRounds);
    console.log("====================================================");
    console.log(`CPF Original em Texto Puro: ${cpfPlana}`);
    console.log(`Hash Seguro Gerado para o Banco: ${hash}`);
    console.log("====================================================");
  } catch (erro) {
    console.error("Erro ao gerar hash:", erro);
  }
}

// Executa a função demonstrativa
gerarHashCpf();
