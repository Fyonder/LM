import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../firebase';
import { collection, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { toast, ToastContainer } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck } from '@fortawesome/free-solid-svg-icons';

const HomePage = ({ userUid }) => {
  const [notes, setNotes] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Busca agendamentos
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const appointmentsRef = collection(db, 'barbershops', userUid, 'appointments');
      const appointmentsSnap = await getDocs(appointmentsRef);
      const appointmentsList = appointmentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAppointments(appointmentsList);
    } catch (err) {
      toast.error('Erro ao carregar agendamentos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  // Busca notas salvas
  const fetchNotes = useCallback(async () => {
    try {
      const notesRef = doc(db, 'barbershops', userUid);
      const notesSnap = await getDoc(notesRef);
      if (notesSnap.exists()) {
        setNotes(notesSnap.data().notes || '');
      }
    } catch (err) {
      toast.error('Erro ao carregar notas: ' + err.message);
    }
  }, [userUid]);

  // Salva notas
  const saveNotes = async () => {
    try {
      const notesRef = doc(db, 'barbershops', userUid);
      await updateDoc(notesRef, { notes });
      toast.success('Notas salvas com sucesso!');
    } catch (err) {
      toast.error('Erro ao salvar notas: ' + err.message);
    }
  };

  useEffect(() => {
    if (userUid) {
      fetchAppointments();
      fetchNotes();
    }
  }, [userUid, fetchAppointments, fetchNotes]);

  return (
    <div className="home-page">
      <h1 className="page-title">
        <FontAwesomeIcon icon={faCalendarCheck} /> Início
      </h1>

      <section className="notes-section card">
        <h2>Bloco de Notas</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Escreva suas anotações aqui..."
          className="notes-textarea"
        />
        <button onClick={saveNotes} className="save-button">
          Salvar Notas
        </button>
      </section>

      <section className="appointments-section card">
        <h2>Agendamentos</h2>
        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Carregando agendamentos...</p>
          </div>
        ) : appointments.length === 0 ? (
          <p className="empty-message">Nenhum agendamento encontrado.</p>
        ) : (
          <ul className="appointments-list">
            {appointments.map(appointment => (
              <li key={appointment.id} className="appointment-item">
                <p><strong>Cliente:</strong> {appointment.customerName}</p>
                <p><strong>Serviço:</strong> {appointment.service}</p>
                <p><strong>Data:</strong> {appointment.date}</p>
                <p><strong>Hora:</strong> {appointment.time}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default HomePage;