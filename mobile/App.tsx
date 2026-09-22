import '@expo/metro-runtime';

import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Crypto from 'expo-crypto';
import NetInfo from '@react-native-community/netinfo';

import {
  initDatabase,
  inserirPessoa,
  listarPessoas,
  Pessoa,
} from './src/database';
import { sincronizarPendentes } from './src/sync';

export default function App() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [pronto, setPronto] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);

  const sincronizandoRef = useRef(false);

  async function carregarPessoas() {
    const dados = await listarPessoas();
    setPessoas(dados);
  }

  async function sincronizar(mostrarMensagem = false) {
    if (sincronizandoRef.current) {
      return;
    }

    try {
      sincronizandoRef.current = true;
      setSincronizando(true);

      const resultado = await sincronizarPendentes();
      await carregarPessoas();

      if (mostrarMensagem) {
        Alert.alert(
          'Sincronização',
          `Pendentes: ${resultado.total}\n` +
            `Sincronizados: ${resultado.sincronizados}\n` +
            `Erros: ${resultado.erros}`
        );
      }
    } finally {
      sincronizandoRef.current = false;
      setSincronizando(false);
    }
  }

  useEffect(() => {
    let ativo = true;
    let unsubscribe: (() => void) | undefined;

    async function iniciar() {
      await initDatabase();

      if (!ativo) {
        return;
      }

      await carregarPessoas();
      setPronto(true);

      unsubscribe = NetInfo.addEventListener((state) => {
        const conectado =
          state.isConnected === true &&
          state.isInternetReachable !== false;

        if (conectado) {
          void sincronizar(false);
        }
      });

      const rede = await NetInfo.fetch();
      const conectado =
        rede.isConnected === true &&
        rede.isInternetReachable !== false;

      if (conectado) {
        void sincronizar(false);
      }
    }

    void iniciar();

    return () => {
      ativo = false;
      unsubscribe?.();
    };
  }, []);

  async function salvar() {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Informe o nome.');
      return;
    }

    await inserirPessoa(
      Crypto.randomUUID(),
      nome.trim(),
      email.trim(),
      telefone.trim(),
      cidade.trim()
    );

    setNome('');
    setEmail('');
    setTelefone('');
    setCidade('');

    await carregarPessoas();

    const rede = await NetInfo.fetch();
    const conectado =
      rede.isConnected === true &&
      rede.isInternetReachable !== false;

    if (conectado) {
      await sincronizar(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <Text style={styles.title}>Cadastro Offline First</Text>
      <Text style={styles.description}>
        O cadastro sempre é salvo no SQLite antes da sincronização.
      </Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nome"
          value={nome}
          onChangeText={setNome}
        />

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Telefone"
          value={telefone}
          onChangeText={setTelefone}
          keyboardType="phone-pad"
        />

        <TextInput
          style={styles.input}
          placeholder="Cidade"
          value={cidade}
          onChangeText={setCidade}
        />

        <Button title="Salvar" onPress={salvar} disabled={!pronto} />

        <Button
          title={sincronizando ? 'Sincronizando...' : 'Sincronizar agora'}
          onPress={() => sincronizar(true)}
          disabled={!pronto || sincronizando}
        />
      </View>

      <Text style={styles.subtitle}>Pessoas cadastradas</Text>

      <FlatList
        data={pessoas}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum cadastro local.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.nome}>{item.nome}</Text>
            <Text>{item.email}</Text>
            <Text>{item.telefone}</Text>
            <Text>{item.cidade}</Text>
            <Text style={styles.status}>
              {item.sincronizado === 1
                ? '✓ Sincronizado'
                : '⟳ Pendente'}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    marginTop: 24,
    marginBottom: 6,
    fontSize: 24,
    fontWeight: '700',
  },
  description: {
    marginBottom: 20,
    color: '#555',
  },
  subtitle: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '700',
  },
  form: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 12,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  nome: {
    fontSize: 16,
    fontWeight: '700',
  },
  status: {
    marginTop: 4,
  },
  empty: {
    color: '#666',
  },
});
