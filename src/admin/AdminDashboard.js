import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { auth, db, storage } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { toast, ToastContainer } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSignOutAlt,
  faEdit,
  faTrash,
  faPlus,
  faMinus,
  faCheck,
  faTimes,
  faEye,
  faStore,
  faCalendarAlt,
  faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons';
import './AdminDashboard.css';

const DAYS_OF_WEEK = [
  { id: 'monday', name: 'Segunda-feira' },
  { id: 'tuesday', name: 'Terça-feira' },
  { id: 'wednesday', name: 'Quarta-feira' },
  { id: 'thursday', name: 'Quinta-feira' },
  { id: 'friday', name: 'Sexta-feira' },
  { id: 'saturday', name: 'Sábado' },
  { id: 'sunday', name: 'Domingo' }
];

const AdminDashboard = () => {
  const [userUid, setUserUid] = useState(null);
  const [shopData, setShopData] = useState({
    name: '',
    address: '',
    openingHours: {},
    logo: '',
    isOpen: true
  });
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [newService, setNewService] = useState({
    name: '',
    price: '',
    description: '',
    duration: ''
  });
  const [editService, setEditService] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [showShopInfo, setShowShopInfo] = useState(true);
  const [showServices, setShowServices] = useState(true);
  const navigate = useNavigate();

  // Sanitiza entradas para evitar XSS
  const sanitizeInput = (input) => {
    return input.replace(/[<>&'"]/g, '');
  };

  // Componente reutilizável para inputs
  const InputField = ({ id, label, type, value, onChange, error, required }) => (
    <div className="form-group">
      <label htmlFor={id}>{label} {required && '*'}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        className={error ? 'input-error' : ''}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <span id={`${id}-error`} className="error-message">
          {error}
        </span>
      )}
    </div>
  );

  // Validação de serviço
  const validateService = (service) => {
    const errors = {};
    if (!service.name.trim()) errors.name = 'Nome é obrigatório';
    if (!service.price) errors.price = 'Preço é obrigatório';
    else if (isNaN(service.price) || parseFloat(service.price) <= 0) {
      errors.price = 'Preço deve ser um número positivo';
    }
    if (!service.duration) errors.duration = 'Duração é obrigatória';
    else if (isNaN(service.duration) || parseInt(service.duration) <= 0) {
      errors.duration = 'Duração deve ser um número positivo';
    }
    return errors;
  };

  // Busca dados no Firebase (moved above useEffect)
  const fetchData = useCallback(async (uid) => {
    try {
      setLoading(true);
      setError(null);

      const shopRef = doc(db, 'barbershops', uid);
      const shopSnap = await getDoc(shopRef);

      if (!shopSnap.exists()) {
        throw new Error('Barbearia não encontrada. Por favor, configure sua barbearia.');
      }

      const shopData = shopSnap.data();
      setShopData({
        name: shopData.name || '',
        address: shopData.address || '',
        logo: shopData.logo || '',
        isOpen: shopData.isOpen !== false,
        openingHours: shopData.openingHours || {}
      });

      const servicesRef = collection(db, 'barbershops', uid, 'services');
      const servicesSnap = await getDocs(servicesRef);
      const servicesList = servicesSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          price: data.price || 0,
          description: data.description || '',
          duration: data.duration || 0,
          createdAt: data.createdAt || new Date()
        };
      });

      setServices(servicesList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError(err.message);
      toast.error('Erro ao carregar dados: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Carrega dados iniciais
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserUid(user.uid);
        await fetchData(user.uid);
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate, fetchData]); // fetchData is now defined before use

  // Atualiza status da barbearia
  const updateShopStatus = useCallback(async (status) => {
    try {
      const shopRef = doc(db, 'barbershops', userUid);
      await updateDoc(shopRef, { isOpen: status });
      setShopData(prev => ({ ...prev, isOpen: status }));
      toast.success(`Barbearia agora está ${status ? 'aberta' : 'fechada'}`);
    } catch (err) {
      toast.error('Erro ao atualizar status: ' + err.message);
    }
  }, [userUid]);

  // Manipula mudanças nos dados da loja
  const handleShopDataChange = (e) => {
    const { name, value } = e.target;
    setShopData(prev => ({ ...prev, [name]: sanitizeInput(value) }));
  };

  // Manipula horários de funcionamento
  const handleOpeningHoursChange = (day, field, value) => {
    setShopData(prev => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: {
          ...prev.openingHours[day],
          [field]: value
        }
      }
    }));
  };

  // Salva dados da barbearia
  const handleSaveShopData = async () => {
    try {
      let logoUrl = shopData.logo;

      if (logoFile) {
        const storageRef = ref(storage, `barbershops/${userUid}/logo/${uuidv4()}`);
        await uploadBytes(storageRef, logoFile);
        logoUrl = await getDownloadURL(storageRef);
      }

      const shopRef = doc(db, 'barbershops', userUid);
      await updateDoc(shopRef, {
        name: shopData.name,
        address: shopData.address,
        logo: logoUrl,
        isOpen: shopData.isOpen,
        openingHours: shopData.openingHours
      });

      setShopData(prev => ({ ...prev, logo: logoUrl }));
      setLogoFile(null);
      setLogoPreview(null);
      toast.success('Dados da barbearia atualizados com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar dados: ' + err.message);
    }
  };

  // Manipula mudanças no formulário de serviço
  const handleServiceChange = (field, value, isEdit = false) => {
    const sanitizedValue = sanitizeInput(value);
    if (isEdit) {
      setEditService(prev => ({ ...prev, [field]: sanitizedValue }));
    } else {
      setNewService(prev => ({ ...prev, [field]: sanitizedValue }));
    }
  };

  // Adiciona novo serviço
  const handleAddService = async () => {
    const validationErrors = validateService(newService);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    try {
      const serviceData = {
        name: newService.name,
        price: parseFloat(newService.price),
        description: newService.description,
        duration: parseInt(newService.duration),
        createdAt: new Date()
      };

      const docRef = await addDoc(
        collection(db, 'barbershops', userUid, 'services'),
        serviceData
      );

      setServices(prev => [
        ...prev,
        {
          id: docRef.id,
          ...serviceData
        }
      ].sort((a, b) => a.name.localeCompare(b.name)));

      setNewService({
        name: '',
        price: '',
        description: '',
        duration: ''
      });
      setFormErrors({});
      toast.success('Serviço adicionado com sucesso!');
    } catch (err) {
      toast.error('Erro ao adicionar serviço: ' + err.message);
    }
  };

  // Salva edição do serviço
  const handleSaveEditService = async () => {
    const validationErrors = validateService(editService);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    try {
      const serviceData = {
        name: editService.name,
        price: parseFloat(editService.price),
        description: editService.description,
        duration: parseInt(editService.duration),
        updatedAt: new Date()
      };

      const serviceRef = doc(db, 'barbershops', userUid, 'services', editService.id);
      await updateDoc(serviceRef, serviceData);

      setServices(prev =>
        prev.map(s =>
          s.id === editService.id ? { ...s, ...serviceData } : s
        ).sort((a, b) => a.name.localeCompare(b.name))
      );

      setEditService(null);
      setFormErrors({});
      toast.success('Serviço atualizado com sucesso!');
    } catch (err) {
      toast.error('Erro ao atualizar serviço: ' + err.message);
    }
  };

  // Deleta serviço
  const handleDeleteService = async (serviceId, serviceName) => {
    if (window.confirm(`Tem certeza que deseja excluir "${serviceName}"?`)) {
      try {
        await deleteDoc(doc(db, 'barbershops', userUid, 'services', serviceId));
        setServices(prev => prev.filter(service => service.id !== serviceId));
        toast.success('Serviço excluído com sucesso!');
      } catch (err) {
        toast.error('Erro ao excluir serviço: ' + err.message);
      }
    }
  };

  // Visualização pública
  const viewPublicMenu = () => {
    navigate(`/Home/${userUid}`); // Standardized to /Home
  };

  // Componente de formulário de serviço
  const ServiceForm = ({ service, onSubmit, onCancel, errors }) => (
    <form className="service-form" onSubmit={(e) => e.preventDefault()}>
      <div className="form-row">
        <InputField
          id="service-name"
          label="Nome"
          type="text"
          value={service.name}
          onChange={(e) => handleServiceChange('name', e.target.value, !!onCancel)}
          error={errors.name}
          required
        />
        <InputField
          id="service-price"
          label="Preço (R$)"
          type="number"
          step="0.01"
          value={service.price}
          onChange={(e) => handleServiceChange('price', e.target.value, !!onCancel)}
          error={errors.price}
          required
        />
      </div>
      <InputField
        id="service-duration"
        label="Duração (minutos)"
        type="number"
        value={service.duration}
        onChange={(e) => handleServiceChange('duration', e.target.value, !!onCancel)}
        error={errors.duration}
        required
      />
      <div className="form-group">
        <label htmlFor="service-description">Descrição</label>
        <textarea
          id="service-description"
          value={service.description}
          onChange={(e) => handleServiceChange('description', e.target.value, !!onCancel)}
        />
      </div>
      <div className="form-actions">
        <button type="button" onClick={onSubmit} className="save-button">
          <FontAwesomeIcon icon={faCheck} /> Salvar
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="cancel-button">
            <FontAwesomeIcon icon={faTimes} /> Cancelar
          </button>
        )}
      </div>
    </form>
  );

  // Memoização da lista de serviços
  const memoizedServices = useMemo(() => services, [services]);

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="header-logo-container">
          {(logoPreview || shopData.logo) && (
            <img
              src={logoPreview || shopData.logo}
              alt="Logo da barbearia"
              className="header-logo"
            />
          )}
        </div>
        <div className="header-content">
          <div className="header-left">
            <h1 className="dashboard-title">
              <FontAwesomeIcon icon={faStore} /> Painel Administrativo
              <span className={`shop-status ${shopData.isOpen ? 'open' : 'closed'}`}>
                {shopData.isOpen ? 'Aberto' : 'Fechado'}
              </span>
            </h1>
          </div>
          <div className="header-right">
            <button onClick={viewPublicMenu} className="view-public-button">
              <FontAwesomeIcon icon={faEye} /> Ver Cardápio Público
            </button>
            <button onClick={() => signOut(auth)} className="logout-button">
              <FontAwesomeIcon icon={faSignOutAlt} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-content container">
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Carregando dados...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={() => fetchData(userUid)} className="retry-button">
              Tentar novamente
            </button>
          </div>
        ) : (
          <>
            <section className="shop-info card">
              <div className="card-header">
                <h2 className="section-title">Informações da Barbearia</h2>
                <button
                  className="toggle-button"
                  onClick={() => setShowShopInfo(!showShopInfo)}
                  aria-expanded={showShopInfo}
                  aria-label={showShopInfo ? 'Ocultar informações da barbearia' : 'Mostrar informações da barbearia'}
                >
                  <FontAwesomeIcon icon={showShopInfo ? faMinus : faPlus} />
                </button>
              </div>

              {showShopInfo && (
                <div className="card-content">
                  <InputField
                    id="shop-name"
                    label="Nome da Barbearia"
                    type="text"
                    value={shopData.name}
                    onChange={handleShopDataChange}
                    required
                  />
                  <InputField
                    id="shop-address"
                    label={<><FontAwesomeIcon icon={faMapMarkerAlt} /> Endereço</>}
                    type="text"
                    value={shopData.address}
                    onChange={handleShopDataChange}
                  />
                  <div className="form-group">
                    <label>
                      <FontAwesomeIcon icon={faCalendarAlt} /> Horário de Funcionamento
                    </label>
                    <div className="opening-hours-grid">
                      {DAYS_OF_WEEK.map(day => (
                        <div key={day.id} className="opening-day">
                          <label>{day.name}</label>
                          <div className="time-inputs">
                            <input
                              type="time"
                              value={shopData.openingHours[day.id]?.open || ''}
                              onChange={(e) => handleOpeningHoursChange(day.id, 'open', e.target.value)}
                              placeholder="Abre"
                            />
                            <span>às</span>
                            <input
                              type="time"
                              value={shopData.openingHours[day.id]?.close || ''}
                              onChange={(e) => handleOpeningHoursChange(day.id, 'close', e.target.value)}
                              placeholder="Fecha"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Logo da Barbearia</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setLogoFile(file);
                          setLogoPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="file-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Status da Barbearia</label>
                    <div className="toggle-group">
                      <button
                        className={`toggle-option ${shopData.isOpen ? 'active' : ''}`}
                        onClick={() => updateShopStatus(true)}
                      >
                        <FontAwesomeIcon icon={faCheck} /> Aberto
                      </button>
                      <button
                        className={`toggle-option ${!shopData.isOpen ? 'active' : ''}`}
                        onClick={() => updateShopStatus(false)}
                      >
                        <FontAwesomeIcon icon={faTimes} /> Fechado
                      </button>
                    </div>
                  </div>
                  <button onClick={handleSaveShopData} className="save-button">
                    Salvar Alterações
                  </button>
                </div>
              )}
            </section>

            <section className="services-section card">
              <div className="card-header">
                <h2 className="section-title">Serviços</h2>
                <button
                  className="toggle-button"
                  onClick={() => setShowServices(!showServices)}
                  aria-expanded={showServices}
                  aria-label={showServices ? 'Ocultar serviços' : 'Mostrar serviços'}
                >
                  <FontAwesomeIcon icon={showServices ? faMinus : faPlus} />
                </button>
              </div>

              {showServices && (
                <div className="card-content">
                  <div className="service-form-container">
                    <h3>Adicionar Novo Serviço</h3>
                    <ServiceForm
                      service={newService}
                      onSubmit={handleAddService}
                      errors={formErrors}
                    />
                  </div>

                  <div className="services-list">
                    <h3>Serviços Cadastrados</h3>
                    {memoizedServices.length === 0 ? (
                      <p className="empty-message">Nenhum serviço cadastrado ainda.</p>
                    ) : (
                      <div className="services-cards">
                        {memoizedServices.map(service => (
                          <div key={service.id} className="service-card">
                            <div className="service-info">
                              <h4>{service.name}</h4>
                              <p className="service-price">
                                {service.price.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                })}
                              </p>
                              <p className="service-duration">{service.duration} minutos</p>
                              {service.description && (
                                <p className="service-description">{service.description}</p>
                              )}
                            </div>
                            <div className="service-actions">
                              <button
                                onClick={() => setEditService({
                                  ...service,
                                  price: service.price.toString(),
                                  duration: service.duration.toString()
                                })}
                                className="edit-button"
                              >
                                <FontAwesomeIcon icon={faEdit} /> Editar
                              </button>
                              <button
                                onClick={() => handleDeleteService(service.id, service.name)}
                                className="delete-button"
                              >
                                <FontAwesomeIcon icon={faTrash} /> Excluir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Modal de Edição */}
            {editService && (
              <div className="modal-overlay" role="dialog" aria-labelledby="modal-title">
                <div className="modal-content">
                  <h2 id="modal-title">Editar Serviço</h2>
                  <ServiceForm
                    service={editService}
                    onSubmit={handleSaveEditService}
                    onCancel={() => setEditService(null)}
                    errors={formErrors}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default AdminDashboard;