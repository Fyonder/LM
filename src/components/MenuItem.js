import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';
import '../styles/Menu.css';

const Menu = ({ addToCart }) => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userUid, setUserUid] = useState(null);

  // Fetch user authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
      } else {
        setUserUid(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch services from Firestore
  useEffect(() => {
    const fetchServices = async () => {
      if (!userUid) return;
      try {
        setLoading(true);
        const servicesRef = collection(db, 'barbershops', userUid, 'services');
        const servicesSnap = await getDocs(servicesRef);
        const servicesList = servicesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setServices(servicesList.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error('Erro ao buscar serviços:', err);
        toast.error('Erro ao carregar serviços.');
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, [userUid]);

  const handleAddToCart = (service) => {
    if (!service.id || !service.name || !service.price) {
      toast.error('Serviço inválido. Tente novamente.');
      return;
    }
    addToCart(service);
  };

  return (
    <section className="menu container">
      <h2 className="section-title">Nossos Serviços</h2>
      {loading ? (
        <div className="loading">
          <span className="sr-only">Carregando serviços...</span>
          <div className="spinner"></div>
        </div>
      ) : services.length === 0 ? (
        <p className="empty-message">Nenhum serviço disponível.</p>
      ) : (
        <div className="services-grid">
          {services.map((service) => (
            <article key={service.id} className="service-item fade-in">
              <div className="service-image">
                {service.image ? (
                  <img
                    src={service.image}
                    alt={service.name}
                    loading="lazy"
                    onError={(e) => (e.target.src = '/assets/fallback-service.png')}
                  />
                ) : (
                  <div className="image-placeholder">Sem imagem</div>
                )}
              </div>
              <div className="service-details">
                <h3 className="service-name">{service.name}</h3>
                <p className="service-description">
                  {service.description || 'Sem descrição'}
                </p>
                <p className="service-info">
                  {service.price.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}{' '}
                  - {service.duration} min
                </p>
                <button
                  className="add-to-cart-btn"
                  onClick={() => handleAddToCart(service)}
                  aria-label={`Adicionar ${service.name} ao carrinho`}
                >
                  <FontAwesomeIcon icon={faPlus} /> Adicionar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

Menu.propTypes = {
  addToCart: PropTypes.func.isRequired,
};

export default Menu;