import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart, faTrash, faPlus, faMinus } from '@fortawesome/free-solid-svg-icons';
import Menu from '../components/MenuItem';
import '../styles/Home.css';
import '../styles/CartModal.css';

const Home = () => {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shopData, setShopData] = useState(null);
  const [isBarbershopOpen, setIsBarbershopOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { uid } = useParams(); // Alterado para usar o mesmo nome da rota


  useEffect(() => {
    const fetchShopData = async () => {
      setIsLoading(true);
      setError(null);

      if (!uid || typeof uid !== 'string' || uid.trim() === '') {
        setError('ID da barbearia inválido.');
        setIsLoading(false);
        toast.error('ID da barbearia inválido ou não fornecido.');
        navigate('/');
        return;
      }

      try {
        const docRef = doc(db, 'barbershops', uid.trim());
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setShopData({
            name: data.basicInfo.name || 'Barbearia Sem Nome',
            address: data.basicInfo.address || 'Endereço não informado',
            phone: data.basicInfo.phone || '',
            logo: data.logo || '/assets/fallback-logo.png',
            isOpen: data.isOpen || false,
          });
          setIsBarbershopOpen(data.isOpen === true);
        } else {
          setError('Barbearia não encontrada.');
          toast.error('Barbearia não encontrada no banco de dados.');
          navigate('/login');
        }
      } catch (err) {
        console.error('Erro ao buscar dados da barbearia:', err);
        setError('Erro ao carregar dados da barbearia.');
        toast.error('Não foi possível carregar os dados da barbearia.');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchShopData();
  }, [uid, navigate]);

  // Funções do carrinho
  const addToCart = (service) => {
    if (!service || !service.id) {
      toast.error('Serviço inválido.');
      return;
    }
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === service.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...service, quantity: 1 }];
    });
    toast.success(`${service.name} adicionado ao carrinho!`);
  };

  const removeFromCart = (serviceId) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === serviceId);
      if (existingItem.quantity > 1) {
        return prevCart.map((item) =>
          item.id === serviceId ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prevCart.filter((item) => item.id !== serviceId);
    });
    toast.info('Item removido do carrinho.');
  };

  const clearCart = (newCart = []) => {
    setCart(newCart);
    if (newCart.length === 0) {
      toast.info('Carrinho limpo.');
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);

  const formatPhoneForWhatsApp = (phone) => {
    return phone.replace(/\D/g, '');
  };

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!phone) newErrors.phone = 'Telefone é obrigatório';
    else if (!/^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(phone))
      newErrors.phone = 'Formato inválido (ex: (11) 91234-5678)';
    if (!date) newErrors.date = 'Data é obrigatória';
    else {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) newErrors.date = 'Data não pode ser anterior a hoje';
    }
    if (!time) newErrors.time = 'Horário é obrigatório';
    return newErrors;
  };

  const handleCheckout = async () => {
    if (!isBarbershopOpen) {
      toast.error('A barbearia está fechada no momento!');
      return;
    }

    if (cart.length === 0) {
      toast.error('Seu carrinho está vazio!');
      return;
    }

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const q = query(
        collection(db, 'barbershops', uid, 'appointments'),
        where('date', '==', date),
        where('time', '==', time)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        throw new Error('Este horário já está reservado. Por favor, escolha outro.');
      }

      await addDoc(collection(db, 'barbershops', uid, 'appointments'), {
        clientName: name,
        clientPhone: phone,
        date,
        time,
        services: cart,
        total,
        status: 'pending',
        createdAt: new Date(),
        uid,
      });

      const whatsappMessage = `Olá! Gostaria de agendar um horário.%0A%0A*Nome:* ${name}%0A*Telefone:* ${phone}%0A*Data:* ${date}%0A*Horário:* ${time}%0A%0A*Serviços:*%0A${cart
        .map(
          (item) =>
            `- ${item.name} (${item.quantity}x) - ${(item.price || 0).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}`
        )
        .join('%0A')}%0A%0A*Total:* ${total.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })}`;

      const whatsappURL = `https://wa.me/55${formatPhoneForWhatsApp(shopData?.phone || '')}?text=${whatsappMessage}`;

      setName('');
      setPhone('');
      setDate('');
      setTime('');
      clearCart();
      setIsCartOpen(false);
      toast.success('Agendamento realizado com sucesso! Redirecionando para WhatsApp...');
      setTimeout(() => window.open(whatsappURL, '_blank'), 1000);
    } catch (err) {
      toast.error(err.message || 'Erro ao agendar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const timeOptions = [];
  for (let hour = 8; hour <= 20; hour++) {
    timeOptions.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 20) timeOptions.push(`${hour.toString().padStart(2, '0')}:30`);
  }

  const Header = () => (
    <header className="header">
      <div className="header-content">
        <img
          src={shopData?.logo || '/assets/fallback-logo.png'}
          alt={`${shopData?.name || 'Barbearia'} Logo`}
          className="header-logo"
          onError={(e) => (e.target.src = '/assets/fallback-logo.png')}
        />
        <div className="header-info">
          <h1 className="header-title">{shopData?.name || 'Barbearia'}</h1>
          <p className="header-address">{shopData?.address || 'Endereço não informado'}</p>
          <div className={`header-status ${isBarbershopOpen ? 'open' : 'closed'}`}>
            <span className="status-text">
              {isBarbershopOpen ? 'Aberto agora' : 'Fechado no momento'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );

  if (isLoading) {
    return (
      <div className="home">
        <div className="loading">Carregando cardápio...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="home">
      <Header />
      <main className="home-content container">
        <Menu addToCart={addToCart} />

        <button
          className="cart-toggle"
          onClick={() => setIsCartOpen(true)}
          aria-label="Abrir carrinho"
        >
          <FontAwesomeIcon icon={faShoppingCart} />
          <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
        </button>

        {isCartOpen && (
          <div
            className="modal-overlay"
            onClick={() => setIsCartOpen(false)}
            role="dialog"
            aria-labelledby="modal-title"
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 id="modal-title" className="modal-title">
                Meu Carrinho
              </h2>

              <div className="cart-items">
                {cart.length === 0 ? (
                  <p className="empty-cart">Seu carrinho está vazio</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="cart-item fade-in">
                      <img
                        src={item.image || '/assets/fallback-service.png'}
                        alt={item.name || 'Serviço'}
                        className="item-image"
                        loading="lazy"
                        onError={(e) => (e.target.src = '/assets/fallback-service.png')}
                      />
                      <div className="item-details">
                        <p className="item-name">{item.name || 'Serviço'}</p>
                        <p className="item-price">
                          {((item.price || 0) * item.quantity).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </p>
                        <div className="quantity-controls">
                          <button
                            className="quantity-btn"
                            onClick={() => removeFromCart(item.id)}
                            disabled={isSubmitting || !isBarbershopOpen}
                            aria-label={`Remover uma unidade de ${item.name}`}
                          >
                            <FontAwesomeIcon icon={faMinus} />
                          </button>
                          <span className="quantity">{item.quantity}</span>
                          <button
                            className="quantity-btn"
                            onClick={() => addToCart(item)}
                            disabled={isSubmitting || !isBarbershopOpen}
                            aria-label={`Adicionar uma unidade de ${item.name}`}
                          >
                            <FontAwesomeIcon icon={faPlus} />
                          </button>
                        </div>
                      </div>
                      <button
                        className="remove-btn"
                        onClick={() => {
                          const updatedCart = cart.filter((cartItem) => cartItem.id !== item.id);
                          clearCart(updatedCart);
                        }}
                        disabled={isSubmitting || !isBarbershopOpen}
                        aria-label={`Remover ${item.name} do carrinho`}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <>
                  <form className="appointment-form" onSubmit={(e) => e.preventDefault()}>
                    <div className="form-group">
                      <label htmlFor="name">Nome *</label>
                      <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className={errors.name ? 'input-error' : ''}
                      />
                      {errors.name && <span className="error-text">{errors.name}</span>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="phone">Telefone *</label>
                      <input
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className={errors.phone ? 'input-error' : ''}
                      />
                      {errors.phone && <span className="error-text">{errors.phone}</span>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="date">Data *</label>
                      <input
                        type="date"
                        id="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        disabled={isSubmitting}
                        min={new Date().toISOString().split('T')[0]}
                        className={errors.date ? 'input-error' : ''}
                      />
                      {errors.date && <span className="error-text">{errors.date}</span>}
                    </div>
                    <div className="form-group">
                      <label htmlFor="time">Horário *</label>
                      <select
                        id="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className={errors.time ? 'input-error' : ''}
                      >
                        <option value="">Selecione</option>
                        {timeOptions.map((timeOption) => (
                          <option key={timeOption} value={timeOption}>
                            {timeOption}
                          </option>
                        ))}
                      </select>
                      {errors.time && <span className="error-text">{errors.time}</span>}
                    </div>
                  </form>

                  <p className="total">
                    Total: {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>

                  <div className="modal-actions">
                    <button
                      className="close-btn"
                      onClick={() => setIsCartOpen(false)}
                      disabled={isSubmitting}
                    >
                      Fechar
                    </button>
                    <button
                      className="checkout-btn"
                      onClick={handleCheckout}
                      disabled={isSubmitting || !isBarbershopOpen}
                    >
                      {isSubmitting ? 'Processando...' : 'Finalizar Agendamento'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;