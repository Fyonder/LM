import React, { useEffect, useState, useCallback } from 'react';
import { auth, db, onAuthStateChanged, storage } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { toast, ToastContainer } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore, faMapMarkerAlt, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

// Constants
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const ShopSettings = () => {
  const [shopData, setShopData] = useState({
    name: '',
    address: '',
    logo: '',
    isOpen: true
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userUid, setUserUid] = useState('');
  const navigate = useNavigate();
  
  // Verify authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        toast.error('Acesso não autorizado.');
        navigate('/');
        return;
      }
      setUserUid(user.uid);
    });

    return () => unsubscribe();
  }, [navigate]);

  // Fetch shop data
  const fetchShopData = useCallback(async () => {
    if (!userUid) return;

    try {
      setLoading(true);
      const shopRef = doc(db, 'barbershops', userUid);
      const shopSnap = await getDoc(shopRef);
      
      if (!shopSnap.exists()) {
        toast.error('Barbearia não encontrada.');
        return;
      }

      const data = shopSnap.data();
      setShopData({
        name: data.name || '',
        address: data.basicInfo?.address || '',
        logo: data.logo || '',
        isOpen: data.isOpen !== false
      });
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Não foi possível carregar os dados da barbearia.');
    } finally {
      setLoading(false);
    }
  }, [userUid]);

  // Update shop status
  const updateShopStatus = async (status) => {
    try {
      const shopRef = doc(db, 'barbershops', userUid);
      await updateDoc(shopRef, { isOpen: status });
      setShopData(prev => ({ ...prev, isOpen: status }));
      toast.success(`Barbearia agora está ${status ? 'aberta' : 'fechada'}`);
    } catch (err) {
      console.error('Status update error:', err);
      toast.error('Erro ao atualizar status da barbearia');
    }
  };

  // Handle logo file selection
  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('Por favor, selecione uma imagem (JPEG, PNG ou WebP)');
      return;
    }

    if (file.size > MAX_LOGO_SIZE) {
      toast.error('A imagem deve ter menos de 2MB');
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  // Save shop data
  const handleSaveShopData = async () => {
    if (!shopData.name.trim()) {
      toast.error('O nome da barbearia é obrigatório');
      return;
    }

    try {
      setSaving(true);
      let logoUrl = shopData.logo;

      // Upload new logo if selected
      if (logoFile) {
        const storageRef = ref(storage, `barbershops/${userUid}/logo/${uuidv4()}`);
        await uploadBytes(storageRef, logoFile);
        logoUrl = await getDownloadURL(storageRef);
      }

      // Update shop data
      const shopRef = doc(db, 'barbershops', userUid);
      await updateDoc(shopRef, {
        name: shopData.name,
        'basicInfo.address': shopData.address,
        logo: logoUrl,
        isOpen: shopData.isOpen
      });

      // Update local state
      setShopData(prev => ({ ...prev, logo: logoUrl }));
      setLogoFile(null);
      toast.success('Dados atualizados com sucesso!');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Erro ao salvar dados. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Clean up logo preview URL
  useEffect(() => {
    return () => {
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  // Fetch data when userUid changes
  useEffect(() => {
    fetchShopData();
  }, [fetchShopData]);

  return (
    <div className="shop-settings">
      <h1 className="page-title">
        <FontAwesomeIcon icon={faStore} /> Dados da Loja
      </h1>

      {loading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Carregando dados...</p>
        </div>
      ) : (
        <section className="shop-info card">
          <div className="card-content">
            <div className="form-group">
              <label htmlFor="shop-name">Nome da Barbearia *</label>
              <input
                id="shop-name"
                type="text"
                name="name"
                value={shopData.name}
                onChange={(e) => setShopData(prev => ({ ...prev, name: e.target.value }))}
                required
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label htmlFor="shop-address">
                <FontAwesomeIcon icon={faMapMarkerAlt} /> Endereço
              </label>
              <input
                id="shop-address"
                type="text"
                name="address"
                value={shopData.address}
                onChange={(e) => setShopData(prev => ({ ...prev, address: e.target.value }))}
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>Logo da Barbearia</label>
              <div className="logo-upload">
                {(logoPreview || shopData.logo) && (
                  <img
                    src={logoPreview || shopData.logo}
                    alt="Logo da barbearia"
                    className="logo-preview"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="file-input"
                  disabled={saving}
                  id="logo-upload"
                />
                <label htmlFor="logo-upload" className="upload-button">
                  {logoPreview || shopData.logo ? 'Alterar logo' : 'Selecionar logo'}
                </label>
                <p className="file-hint">Formatos: JPG, PNG, WebP (até 2MB)</p>
              </div>
            </div>

            <div className="form-group">
              <label>Status da Barbearia</label>
              <div className="toggle-group">
                <button
                  type="button"
                  className={`toggle-option ${shopData.isOpen ? 'active' : ''}`}
                  onClick={() => updateShopStatus(true)}
                  disabled={saving}
                >
                  <FontAwesomeIcon icon={faCheck} /> Aberto
                </button>
                <button
                  type="button"
                  className={`toggle-option ${!shopData.isOpen ? 'active' : ''}`}
                  onClick={() => updateShopStatus(false)}
                  disabled={saving}
                >
                  <FontAwesomeIcon icon={faTimes} /> Fechado
                </button>
              </div>
            </div>

            <button 
              onClick={handleSaveShopData} 
              className="save-button"
              disabled={saving || loading}
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </section>
      )}

      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
};

export default ShopSettings;