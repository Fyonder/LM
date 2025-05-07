import React, { useReducer, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import '../styles/Header.css';

// Define days of week with display names
const DAYS_OF_WEEK = [
  { id: 'sunday', display: 'Dom', full: 'Domingo' },
  { id: 'monday', display: 'Seg', full: 'Segunda-feira' },
  { id: 'tuesday', display: 'Ter', full: 'Terça-feira' },
  { id: 'wednesday', display: 'Qua', full: 'Quarta-feira' },
  { id: 'thursday', display: 'Qui', full: 'Quinta-feira' },
  { id: 'friday', display: 'Sex', full: 'Sexta-feira' },
  { id: 'saturday', display: 'Sáb', full: 'Sábado' }
];

// Initial state with minimal defaults
const initialState = {
  name: '',
  address: '',
  openingHours: DAYS_OF_WEEK.reduce((acc, { id }) => ({
    ...acc,
    [id]: { open: '00:00', close: '00:00' }
  }), {}),
  logo: '/assets/fallback-logo.png',
  isOpen: false
};

// Reducer for shopData
const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_SHOP_DATA':
      return {
        ...state,
        ...action.payload
      };
    case 'SET_LOGO':
      return { ...state, logo: action.payload };
    default:
      return state;
  }
};

// Normalize openingHours from Firestore
const normalizeOpeningHours = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return initialState.openingHours;
  }

  return DAYS_OF_WEEK.reduce((acc, { id }) => ({
    ...acc,
    [id]: {
      open: data[id]?.open || '00:00',
      close: data[id]?.close || '00:00'
    }
  }), {});
};

// Format openingHours for display
const formatOpeningHours = (openingHours) => {
  if (!openingHours) return 'Horário não disponível';

  const daysMap = {};
  DAYS_OF_WEEK.forEach(({ id, display }) => {
    const { open, close } = openingHours[id];
    const key = `${open}-${close}`;
    if (!daysMap[key]) daysMap[key] = [];
    daysMap[key].push(display);
  });

  const parts = Object.entries(daysMap).map(([time, days]) => {
    if (time === '00:00-00:00') return null;
    const [open, close] = time.split('-');
    const dayRange = days.length > 1 ? `${days[0]}-${days[days.length - 1]}` : days[0];
    return `${dayRange} ${open} às ${close}`;
  }).filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'Fechado';
};

const Header = () => {
  const [shopData, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Fetch shop data
  const fetchShopData = async (uid) => {
    try {
      setLoading(true);
      setError(null);

      const shopRef = doc(db, 'barbershops', uid);
      const shopSnap = await getDoc(shopRef);

      if (!shopSnap.exists()) {
        throw new Error('Dados da barbearia não encontrados');
      }

      const data = shopSnap.data();
      const basicInfo = data.basicInfo || {};

      const payload = {
        name: data.name || 'Barbearia sem nome',
        address: basicInfo.address || 'Endereço não informado',
        openingHours: normalizeOpeningHours(data.openingHours),
        logo: data.logo || initialState.logo,
        isOpen: data.isOpen !== false // Default to true if undefined
      };

      dispatch({ type: 'SET_SHOP_DATA', payload });
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      setError(err.message === 'Dados da barbearia não encontrados' ? err.message : 'Falha ao carregar dados. Tente novamente.');
      dispatch({ type: 'SET_SHOP_DATA', payload: initialState });
    } finally {
      setLoading(false);
    }
  };

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchShopData(user.uid);
      } else {
        setError('Usuário não autenticado.');
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // Memoize formatted opening hours
  const formattedHours = useMemo(() => formatOpeningHours(shopData.openingHours), [shopData.openingHours]);

  if (loading) {
    return (
      <div className="header-loading" role="status" aria-live="polite">
        Carregando informações...
      </div>
    );
  }

  return (
    <header className="header">
      <div className="header-content">
        <img
          src={shopData.logo}
          alt={`${shopData.name} Logo`}
          className="header-logo"
          onError={() => dispatch({ type: 'SET_LOGO', payload: initialState.logo })}
        />
        <div className="header-info">
          <h1 className="header-title">{shopData.name}</h1>
          <p className="header-address">{shopData.address}</p>
          <div className={`header-status ${shopData.isOpen ? 'open' : 'closed'}`} aria-live="polite">
            <span className="status-text">{shopData.isOpen ? 'Aberto' : 'Fechado'}</span>
            <span className="header-hours">{formattedHours}</span>
          </div>
        </div>
      </div>
      {error && (
        <div className="header-error" role="alert">
          {error}
        </div>
      )}
    </header>
  );
};

export default Header;