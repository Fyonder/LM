import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { useNavigate, Routes, Route, Link } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { toast, ToastContainer } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faStore,
  faList,
  faSignOutAlt,
  faCalendarCheck,
  faCheck,
  faTimes,
  faTrash,
  faEdit,
  faSearch,
  faCalendarAlt,
  faFilter,
  faUser,
  faPhone,
  faClock,
  faMoneyBillWave
} from '@fortawesome/free-solid-svg-icons';
import ShopSettings from './ShopSettings';
import ServicesSettings from './ServicesSettings';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const [notes, setNotes] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNotesSaving, setIsNotesSaving] = useState(false);
  const navigate = useNavigate();
  const [userUid, setUserUid] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.uid) {
        setUserUid(user.uid);
      } else {
        toast.error('Acesso não autorizado.');
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const appointmentsRef = collection(db, 'barbershops', userUid, 'appointments');
      const appointmentsSnap = await getDocs(appointmentsRef);
      const appointmentsList = appointmentsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAppointments(
        appointmentsList.sort(
          (a, b) => new Date(`${a.date} ${a.time}`) - new Date(`${b.date} ${b.time}`)
        )
      );
    } catch (err) {
      toast.error('Erro ao carregar agendamentos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const notesRef = doc(db, 'barbershops', userUid);
      const notesSnap = await getDoc(notesRef);
      if (notesSnap.exists()) {
        setNotes(notesSnap.data().notes || '');
      }
    } catch (err) {
      toast.error('Erro ao carregar notas: ' + err.message);
    }
  };

  const saveNotes = async () => {
    try {
      setIsNotesSaving(true);
      const notesRef = doc(db, 'barbershops', userUid);
      await updateDoc(notesRef, { notes });
      toast.success('Notas salvas com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar notas: ' + err.message);
    } finally {
      setIsNotesSaving(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const appointmentRef = doc(db, 'barbershops', userUid, 'appointments', appointmentId);
      await updateDoc(appointmentRef, { status: newStatus });
      setAppointments((prev) =>
        prev.map((appt) => (appt.id === appointmentId ? { ...appt, status: newStatus } : appt))
      );
      toast.success(`Agendamento ${newStatus === 'confirmed' ? 'confirmado' : 'cancelado'} com sucesso!`);
    } catch (err) {
      toast.error('Erro ao atualizar status: ' + err.message);
    }
  };

  const deleteAppointment = async (appointmentId) => {
    if (window.confirm('Tem certeza que deseja excluir este agendamento?')) {
      try {
        const appointmentRef = doc(db, 'barbershops', userUid, 'appointments', appointmentId);
        await deleteDoc(appointmentRef);
        setAppointments((prev) => prev.filter((appt) => appt.id !== appointmentId));
        toast.success('Agendamento excluído com sucesso!');
      } catch (err) {
        toast.error('Erro ao excluir agendamento: ' + err.message);
      }
    }
  };

  useEffect(() => {
    if (userUid) {
      fetchAppointments();
      fetchNotes();
    }
  }, [userUid]);

  const filteredAppointments = appointments.filter((appt) => {
    const matchesStatus = filterStatus === 'all' || appt.status === filterStatus;
    const matchesDate = !filterDate || appt.date === filterDate;
    const matchesSearch = appt.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         appt.clientPhone.includes(searchTerm);
    return matchesStatus && matchesDate && matchesSearch;
  });

  const handleLogout = () => {
    signOut(auth).then(() => navigate('/'));
  };

  const formatDate = (dateString) => {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  };

  return (
    <div className="admin-dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <h2>BarberPro</h2>
            <small>Painel de Controle</small>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li className="active">
              <Link to={`/admin/${userUid}`}>
                <FontAwesomeIcon icon={faHome} className="nav-icon" />
                <span>Início</span>
              </Link>
            </li>
            <li>
              <Link to={`/home/${userUid}`}>
                <FontAwesomeIcon icon={faList} className="nav-icon" />
                <span>Cardápio</span>
              </Link>
            </li>
            <li>
              <Link to={`/ShopSettings/${userUid}`}>
                <FontAwesomeIcon icon={faStore} className="nav-icon" />
                <span>Dados da Loja</span>
              </Link>
            </li>
            <li>
              <Link to={`/ServicesSettings/${userUid}`}>
                <FontAwesomeIcon icon={faEdit} className="nav-icon" />
                <span>Serviços</span>
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">
            <FontAwesomeIcon icon={faSignOutAlt} className="nav-icon" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-content">
        <div className="content-header">
          <h1 className="page-title">
            <FontAwesomeIcon icon={faCalendarCheck} /> Painel de Agendamentos
          </h1>
        </div>

        <Routes>
          <Route
            path="/"
            element={
              <>
                <section className="notes-section">
                  <div className="section-header">
                    <h2>
                      <FontAwesomeIcon icon={faEdit} /> Bloco de Notas
                    </h2>
                  </div>
                  <div className="card">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Escreva suas anotações importantes aqui..."
                      className="notes-textarea"
                    />
                    <div className="notes-actions">
                      <button 
                        onClick={saveNotes} 
                        className="save-button"
                        disabled={isNotesSaving}
                      >
                        {isNotesSaving ? 'Salvando...' : 'Salvar Notas'}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="appointments-section">
                  <div className="section-header">
                    <h2>
                      <FontAwesomeIcon icon={faCalendarAlt} /> Agendamentos
                    </h2>
                    <div className="appointments-filters">
                      <div className="search-box">
                        <FontAwesomeIcon icon={faSearch} />
                        <input
                          type="text"
                          placeholder="Buscar cliente..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="filter-group">
                        <FontAwesomeIcon icon={faFilter} />
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                        >
                          <option value="all">Todos os status</option>
                          <option value="pending">Pendentes</option>
                          <option value="confirmed">Confirmados</option>
                          <option value="cancelled">Cancelados</option>
                        </select>
                      </div>
                      <div className="filter-group">
                        <FontAwesomeIcon icon={faCalendarAlt} />
                        <input
                          type="date"
                          value={filterDate}
                          onChange={(e) => setFilterDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    {loading ? (
                      <div className="loading-state">
                        <div className="loading-spinner"></div>
                        <p>Carregando agendamentos...</p>
                      </div>
                    ) : filteredAppointments.length === 0 ? (
                      <div className="empty-state">
                        <p>Nenhum agendamento encontrado</p>
                        <small>Tente ajustar seus filtros de busca</small>
                      </div>
                    ) : (
                      <div className="appointments-grid">
                        {filteredAppointments.map((appointment) => (
                          <div key={appointment.id} className={`appointment-card status-${appointment.status}`}>
                            <div className="appointment-header">
                              <h3>
                                <FontAwesomeIcon icon={faUser} /> {appointment.clientName}
                              </h3>
                              <span className={`status-badge ${appointment.status}`}>
                                {appointment.status === 'pending'
                                  ? 'Pendente'
                                  : appointment.status === 'confirmed'
                                  ? 'Confirmado'
                                  : 'Cancelado'}
                              </span>
                            </div>
                            
                            <div className="appointment-details">
                              <div className="detail-item">
                                <FontAwesomeIcon icon={faPhone} />
                                <span>{appointment.clientPhone}</span>
                              </div>
                              <div className="detail-item">
                                <FontAwesomeIcon icon={faCalendarAlt} />
                                <span>{formatDate(appointment.date)}</span>
                              </div>
                              <div className="detail-item">
                                <FontAwesomeIcon icon={faClock} />
                                <span>{appointment.time}</span>
                              </div>
                              <div className="detail-item">
                                <FontAwesomeIcon icon={faMoneyBillWave} />
                                <span>
                                  {appointment.total.toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  })}
                                </span>
                              </div>
                            </div>
                            
                            <div className="services-list">
                              <h4>Serviços:</h4>
                              <ul>
                                {appointment.services.map((service, index) => (
                                  <li key={index}>
                                    {service.name} ({service.quantity}x)
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div className="appointment-actions">
                              {appointment.status === 'pending' && (
                                <>
                                  <button
                                    className="action-button confirm"
                                    onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                                  >
                                    <FontAwesomeIcon icon={faCheck} /> Confirmar
                                  </button>
                                  <button
                                    className="action-button cancel"
                                    onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                                  >
                                    <FontAwesomeIcon icon={faTimes} /> Cancelar
                                  </button>
                                </>
                              )}
                              <button
                                className="action-button delete"
                                onClick={() => deleteAppointment(appointment.id)}
                              >
                                <FontAwesomeIcon icon={faTrash} /> Excluir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </>
            }
          />
          <Route path="/shop" element={<ShopSettings userUid={userUid} />} />
          <Route path="/services" element={<ServicesSettings userUid={userUid} />} />
        </Routes>
      </main>

      <ToastContainer 
        position="bottom-right" 
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default AdminDashboard;