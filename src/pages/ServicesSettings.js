import React, { useEffect, useState, useMemo } from 'react';
import { auth, db, onAuthStateChanged } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { toast, ToastContainer } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faEdit, faTrash, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

const ServicesSettings = ({}) => {
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({
    name: '',
    price: '',
    description: '',
    duration: ''
  });
  const [editService, setEditService] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [userUid ,setUserUid] = useState('');

  
  // Verifica autenticação e valida userUid
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user.uid) {
        // Usuário autenticado e userUid corresponde
        setUserUid(user.uid)
      } else {
        toast.error('Acesso não autorizado.');
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

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

  // Busca serviços
  const fetchServices = async () => {
    try {
      setLoading(true);
      const servicesRef = collection(db, 'barbershops', userUid, 'services');
      const servicesSnap = await getDocs(servicesRef);
      const servicesList = servicesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setServices(servicesList.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      toast.error('Erro ao carregar serviços: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Manipula mudanças no formulário
  const handleServiceChange = (field, value, isEdit = false) => {
    const sanitizedValue = value.replace(/[<>&'"]/g, '');
    if (isEdit) {
      setEditService(prev => ({ ...prev, [field]: sanitizedValue }));
    } else {
      setNewService(prev => ({ ...prev, [field]: sanitizedValue }));
    }
  };

  // Adiciona serviço
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
        { id: docRef.id, ...serviceData }
      ].sort((a, b) => a.name.localeCompare(b.name)));

      setNewService({ name: '', price: '', description: '', duration: '' });
      setFormErrors({});
      toast.success('Serviço adicionado com sucesso!');
    } catch (err) {
      toast.error('Erro ao adicionar serviço: ' + err.message);
    }
  };

  // Salva edição
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
        prev.map(s => (s.id === editService.id ? { ...s, ...serviceData } : s)).sort((a, b) => a.name.localeCompare(b.name))
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

  useEffect(() => {
    if (userUid) {
      fetchServices();
    }
  }, [userUid]);

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
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );

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

  const memoizedServices = useMemo(() => services, [services]);

  return (
    <div className="services-settings">
      <h1 className="page-title">
        <FontAwesomeIcon icon={faList} /> Serviços
      </h1>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Carregando serviços...</p>
        </div>
      ) : (
        <section className="services-section card">
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
                <p className="empty-message">Nenhum serviço cadastrado.</p>
              ) : (
                <div className="services-cards">
                  {memoizedServices.map(service => (
                    <div key={service.id} className="service-card">
                      <div className="service-info">
                        <h4>{service.name}</h4>
                        <p className="service-price">
                          {service.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
        </section>
      )}

      {editService && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Editar Serviço</h2>
            <ServiceForm
              service={editService}
              onSubmit={handleSaveEditService}
              onCancel={() => setEditService(null)}
              errors={formErrors}
            />
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default ServicesSettings;