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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserUid(user?.uid || null);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchServices = async () => {
      if (!userUid) return;
      
      try {
        setLoading(true);
        const servicesRef = collection(db, 'barbershops', userUid, 'services');
        const servicesSnap = await getDocs(servicesRef);
        
        const servicesList = servicesSnap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Serviço sem nome',
          description: doc.data().description || '',
          price: doc.data().price || 0,
          duration: doc.data().duration || 0,
          image: doc.data().image || null
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
    if (!service?.id || !service?.name || service?.price === undefined) {
      toast.error('Serviço inválido. Tente novamente.');
      return;
    }
    addToCart({
      id: service.id,
      name: service.name,
      price: parseFloat(service.price),
      duration: service.duration,
      image: service.image
    });
  };

  return (
    <section className="menu-section">
      <h2 className="menu-title">Nossos Serviços</h2>
      
      {loading ? (
        <div className="menu-loading">
          <div className="loading-spinner"></div>
          <span>Carregando serviços...</span>
        </div>
      ) : services.length === 0 ? (
        <p className="menu-empty">Nenhum serviço disponível no momento.</p>
      ) : (
        <div className="services-container">
          {services.map((service) => (
            <div key={service.id} className="service-card">
              <div className="service-image-container">
                {service.image ? (
                  <img 
                    src={service.image} 
                    alt={service.name}
                    className="service-image"
                    onError={(e) => {
                      e.target.src = '/assets/fallback-service.png';
                      e.target.classList.add('fallback-image');
                    }}
                  />
                ) : (
                  <div className="service-image-placeholder">
                    <span>Sem imagem</span>
                  </div>
                )}
              </div>
              
              <div className="service-info">
                <h3 className="service-name">{service.name}</h3>
                <p className="service-description">
                  {service.description || 'Descrição não disponível'}
                </p>
                
                <div className="service-meta">
                  <span className="service-price">
                    {service.price.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </span>
                  <span className="service-duration">
                    {service.duration} min
                  </span>
                </div>
                
                <button 
                  className="add-to-cart-button"
                  onClick={() => handleAddToCart(service)}
                  aria-label={`Adicionar ${service.name} ao carrinho`}
                >
                  <FontAwesomeIcon icon={faPlus} />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
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