import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase'; // Certifique-se de que essas instâncias estão corretamente configuradas

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Função para lidar com o envio do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Inicia o carregamento
    setError(''); // Reseta qualquer erro anterior

    try {
      // 1. Criar usuário no Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 2. Criar estrutura inicial no Firestore
      const initialData = {
        name: shopName,
        address: '',
        logo: '',
        openingHours: {
          textDisplay: "Segunda a Sábado, 8:30 às 19:30",
          weekdays: { open: 8.5, close: 19.5 },
          saturday: { open: 8.5, close: 19.5 },
          sunday: { open: 0, close: 0 }
        }
      };

      await Promise.all([
        setDoc(doc(db, 'barbershops', user.uid), {
          basicInfo: {
            name: shopName,
            email,
            createdAt: new Date()
          }
        }),
        setDoc(doc(db, 'barbershops', user.uid, 'settings', 'general'), initialData)
      ]);

      // Redireciona para a página admin com o UID
      navigate(`/admin/${user.uid}`);
    } catch (err) {
      setError('Erro ao cadastrar. Tente novamente.');
      console.error("Registration error:", err);
    } finally {
      setLoading(false); // Fim do carregamento
    }
  };

  return (
    <div className="auth-container">
      <h2>Cadastre sua Barbearia</h2>

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="input-group">
          <label htmlFor="email">E-mail</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Digite seu e-mail"
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="password">Senha</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite sua senha"
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="shopName">Nome da Barbearia</label>
          <input
            type="text"
            id="shopName"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            required
            placeholder="Ex: Barbearia do Lucas"
          />
        </div>

        {error && <p className="error-message">{error}</p>}

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Carregando...' : 'Cadastrar'}
        </button>
      </form>

      <p className="auth-footer">
        Já tem uma conta? <a href="/login">Faça login</a>
      </p>
    </div>
  );
};

export default Register;
