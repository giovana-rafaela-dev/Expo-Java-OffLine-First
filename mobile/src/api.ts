import { Platform } from 'react-native';

import { Pessoa } from './database';

const API_URL =
  Platform.OS === 'web'
    ? process.env.EXPO_PUBLIC_API_URL_WEB ?? 'http://localhost:8080'
    : process.env.EXPO_PUBLIC_API_URL_MOBILE ?? 'http://10.0.2.2:8080';

export async function enviarPessoa(pessoa: Pessoa) {
  const response = await fetch(`${API_URL}/pessoas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: pessoa.id,
      nome: pessoa.nome,
      email: pessoa.email,
      telefone: pessoa.telefone,
      cidade: pessoa.cidade,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Erro ao sincronizar. HTTP ${response.status}`
    );
  }

  return response.json();
}

export async function listarPessoasRemotas() {
  const response = await fetch(`${API_URL}/pessoas`);

  if (!response.ok) {
    throw new Error(
      `Erro ao consultar API. HTTP ${response.status}`
    );
  }

  return response.json();
}
