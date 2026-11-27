import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db, PRODUCTS_COLLECTION } from './firebase';

type SectionKey = 'insaat' | 'elektronika';
type WorkerRoleKey = SectionKey | 'musteri_al';

export interface Product {
  id: string;
  section: SectionKey;
  category: string;
  brand?: string;
  name: string;
  price: string;
  about: string;
  imageUrl: string;
  colors: string[];
  createdAt?: number;
}

export interface CustomerOffer {
  id: string;
  category: string;
  name: string;
  price: string;
  about: string;
  phone: string;
  images: string[];
  createdAt?: number;
}

const CUSTOMER_OFFERS_COLLECTION = 'buildtech_customer_offers';

const WORKER_PINS: Record<WorkerRoleKey, { pin: string; roleTitle: string; companyName: string }> = {
  elektronika: {
    pin: '1111',
    roleTitle: 'Elektronika Mağazası İşçisi',
    companyName: 'BUILDTECH Elektronika',
  },
  insaat: {
    pin: '2222',
    roleTitle: 'İnşaat Şirkəti İşçisi',
    companyName: 'BUILDTECH İnşaat',
  },
  musteri_al: {
    pin: '3333',
    roleTitle: 'Müştəridən Məhsul Alışı',
    companyName: 'BUILDTECH Alış Bölməsi',
  },
};

const CATEGORIES: Record<SectionKey, string[]> = {
  insaat: ['1001 xırdavat', 'Santexnik', 'İnşaata aid hər şey'],
  elektronika: ['Telefonlar', 'Saatlar', 'Qulaqcıqlar'],
};

const PHONE_BRANDS = ['Honor', 'iPhone', 'Xiaomi'];

function compressImage(file: File, maxWidth = 720, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(typeof reader.result === 'string' ? reader.result : '');
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function WorkerApp() {
  const [role, setRole] = useState<WorkerRoleKey>('elektronika');
  const [pinInput, setPinInput] = useState('');
  const [unlockedRole, setUnlockedRole] = useState<WorkerRoleKey | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [customerOffers, setCustomerOffers] = useState<CustomerOffer[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cat, setCat] = useState<string>(CATEGORIES.elektronika[0]);
  const [brand, setBrand] = useState<string>(PHONE_BRANDS[0]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [about, setAbout] = useState('');
  const [colors, setColors] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, PRODUCTS_COLLECTION), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const list: Product[] = snap.docs.map((d) => {
        const data = d.data() as Omit<Product, 'id'>;
        return {
          id: d.id,
          section: data.section === 'elektronika' ? 'elektronika' : 'insaat',
          category: data.category || '',
          brand: data.brand,
          name: data.name || '',
          price: String(data.price ?? ''),
          about: data.about || '',
          imageUrl: data.imageUrl || '',
          colors: Array.isArray(data.colors) ? data.colors : [],
          createdAt: data.createdAt || 0,
        };
      });
      setProducts(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, CUSTOMER_OFFERS_COLLECTION), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
      const list: CustomerOffer[] = snap.docs.map((d) => {
        const data = d.data() as Omit<CustomerOffer, 'id'>;
        return {
          id: d.id,
          category: data.category || 'Elektronika',
          name: data.name || '',
          price: String(data.price ?? ''),
          about: data.about || '',
          phone: data.phone || '',
          images: Array.isArray(data.images) ? data.images : [],
          createdAt: data.createdAt || 0,
        };
      });
      setCustomerOffers(list);
    });
    return () => unsub();
  }, []);

  const workerProducts = useMemo(
    () =>
      unlockedRole && unlockedRole !== 'musteri_al'
        ? products.filter((p) => p.section === unlockedRole)
        : [],
    [products, unlockedRole],
  );

  const handleLogin = () => {
    if (pinInput.trim() === WORKER_PINS[role].pin) {
      setUnlockedRole(role);
      if (role !== 'musteri_al') {
        setCat(CATEGORIES[role][0]);
      }
      setPinInput('');
    } else {
      window.alert('İşçi şifrəsi səhvdir.');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    if (unlockedRole && unlockedRole !== 'musteri_al') {
      setCat(CATEGORIES[unlockedRole][0]);
    }
    setBrand(PHONE_BRANDS[0]);
    setName('');
    setPrice('');
    setAbout('');
    setColors('');
    setImageUrl('');
  };

  const handleEditSelect = (item: Product) => {
    setEditingId(item.id);
    setCat(item.category);
    setBrand(item.brand || PHONE_BRANDS[0]);
    setName(item.name);
    setPrice(item.price);
    setAbout(item.about || '');
    setColors(item.colors?.join(', ') || '');
    setImageUrl(item.imageUrl || '');
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setImageUrl(compressed);
  };

  const handleSave = async () => {
    if (!unlockedRole || unlockedRole === 'musteri_al') return;
    if (!name.trim() || !price.trim()) {
      window.alert('Malın adını və qiymətini daxil edin.');
      return;
    }

    setSaving(true);
    try {
      const payload: Omit<Product, 'id'> = {
        section: unlockedRole,
        category: cat,
        ...(cat === 'Telefonlar' ? { brand } : {}),
        name: name.trim(),
        price: price.trim(),
        about: about.trim(),
        imageUrl,
        colors:
          unlockedRole === 'elektronika'
            ? colors
                .split(',')
                .map((c) => c.trim())
                .filter(Boolean)
            : [],
        createdAt: Date.now(),
      };

      if (editingId) {
        await updateDoc(doc(db, PRODUCTS_COLLECTION, editingId), payload);
        window.alert('Məhsul yeniləndi. Müştəri tətbiqində avtomatik görünəcək.');
      } else {
        await addDoc(collection(db, PRODUCTS_COLLECTION), payload);
        window.alert('Yeni məhsul əlavə olundu. Müştəri tətbiqində dərhal görünəcək.');
      }
      resetForm();
    } catch {
      window.alert('Firebase-ə yazılarkən xəta baş verdi. Bağlantını yoxlayın.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Product) => {
    if (!window.confirm(`"${item.name}" məhsulu silinsin?`)) return;
    try {
      await deleteDoc(doc(db, PRODUCTS_COLLECTION, item.id));
      if (editingId === item.id) resetForm();
    } catch {
      window.alert('Silinmə zamanı xəta baş verdi.');
    }
  };

  const handleDeleteOffer = async (offer: CustomerOffer) => {
    if (!window.confirm(`"${offer.name}" təklifi silinsin?`)) return;
    try {
      await deleteDoc(doc(db, CUSTOMER_OFFERS_COLLECTION, offer.id));
    } catch {
      window.alert('Silinmə zamanı xəta baş verdi.');
    }
  };

  if (!unlockedRole) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#070B14',
          color: '#F8FAFC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            backgroundColor: '#111827',
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: '18px',
            padding: '22px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '1.8px', color: '#FBBF24' }}>
            BUILDTECH · İŞÇİ PORTALI
          </div>
          <div style={{ fontSize: '22px', fontWeight: 900, marginTop: '6px' }}>
            İşçi Girişi
          </div>
          <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '6px', lineHeight: 1.45 }}>
            Hər bölmənin işçisi öz sahəsinə daxil olub əməliyyat apara bilər.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['elektronika', 'insaat'] as WorkerRoleKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRole(key)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: role === key ? '1px solid #FBBF24' : '1px solid rgba(255,255,255,0.14)',
                    backgroundColor: role === key ? 'rgba(245,158,11,0.16)' : '#0B1120',
                    color: role === key ? '#FDE68A' : '#CBD5E1',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                  }}
                >
                  {key === 'elektronika' ? 'Elektronika' : 'İnşaat'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setRole('musteri_al')}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '10px',
                border: role === 'musteri_al' ? '1px solid #10B981' : '1px solid rgba(255,255,255,0.14)',
                backgroundColor: role === 'musteri_al' ? 'rgba(16,185,129,0.16)' : '#0B1120',
                color: role === 'musteri_al' ? '#6EE7B7' : '#CBD5E1',
                fontWeight: 800,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>Müştəridən məhsul al</span>
              {customerOffers.length > 0 && (
                <span
                  style={{
                    backgroundColor: '#10B981',
                    color: '#052E16',
                    fontSize: '11px',
                    fontWeight: 900,
                    padding: '2px 7px',
                    borderRadius: '999px',
                  }}
                >
                  {customerOffers.length}
                </span>
              )}
            </button>
          </div>

          <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="İşçi şifrəsi"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              marginTop: '14px',
              padding: '12px',
              borderRadius: '10px',
              backgroundColor: '#070B14',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#fff',
              fontSize: '15px',
              outline: 'none',
            }}
          />

          <button
            type="button"
            onClick={handleLogin}
            style={{
              width: '100%',
              marginTop: '14px',
              padding: '13px',
              borderRadius: '11px',
              border: 'none',
              backgroundColor: '#F59E0B',
              color: '#090D16',
              fontWeight: 900,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Panelə daxil ol
          </button>
        </div>
      </div>
    );
  }

  const activeInfo = WORKER_PINS[unlockedRole];
  const accent =
    unlockedRole === 'insaat'
      ? '#F59E0B'
      : unlockedRole === 'musteri_al'
        ? '#10B981'
        : '#3B82F6';

  if (unlockedRole === 'musteri_al') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#070B14',
          color: '#F8FAFC',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#111827',
            borderBottom: `1px solid ${accent}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 900, color: accent, letterSpacing: '1px' }}>
              {activeInfo.companyName.toUpperCase()}
            </div>
            <div style={{ fontSize: '17px', fontWeight: 800 }}>
              {activeInfo.roleTitle} ({customerOffers.length})
            </div>
          </div>

          <button
            type="button"
            onClick={() => setUnlockedRole(null)}
            style={{
              padding: '8px 12px',
              borderRadius: '9px',
              border: '1px solid rgba(255,255,255,0.18)',
              backgroundColor: 'rgba(255,255,255,0.05)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Çıxış
          </button>
        </div>

        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '16px 16px 60px' }}>
          {customerOffers.length === 0 ? (
            <div
              style={{
                padding: '32px 20px',
                borderRadius: '14px',
                backgroundColor: '#111827',
                border: '1px solid rgba(255,255,255,0.12)',
                textAlign: 'center',
                color: '#94A3B8',
                fontSize: '14px',
              }}
            >
              Hələ ki müştərilər tərəfindən göndərilən məhsul yoxdur. Müştəri tətbiqdən göndərən kimi dərhal burada görünəcək.
            </div>
          ) : (
            customerOffers.map((offer) => {
              const cleanPhone = offer.phone.replace(/[^\d+]/g, '');
              const waPhone = cleanPhone.replace(/^\+/, '');
              return (
                <div
                  key={offer.id}
                  style={{
                    padding: '15px',
                    borderRadius: '14px',
                    backgroundColor: '#111827',
                    border: '1px solid rgba(16,185,129,0.28)',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: '#6EE7B7',
                          backgroundColor: 'rgba(16,185,129,0.14)',
                          padding: '3px 8px',
                          borderRadius: '999px',
                        }}
                      >
                        {offer.category}
                      </span>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#fff', marginTop: '6px' }}>
                        {offer.name}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#4ADE80', marginTop: '2px' }}>
                        Təklif olunan qiymət: {offer.price} AZN
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteOffer(offer)}
                      style={{
                        padding: '8px 11px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#EF4444',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Sil
                    </button>
                  </div>

                  {offer.about && (
                    <div
                      style={{
                        marginTop: '10px',
                        padding: '10px',
                        borderRadius: '10px',
                        backgroundColor: '#0B1120',
                        fontSize: '13.5px',
                        color: '#CBD5E1',
                        lineHeight: 1.45,
                      }}
                    >
                      {offer.about}
                    </div>
                  )}

                  {offer.images.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '10px' }}>
                      {offer.images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={offer.name}
                          style={{
                            width: '110px',
                            height: '110px',
                            objectFit: 'cover',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.16)',
                            flexShrink: 0,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: '12px',
                      paddingTop: '10px',
                      borderTop: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#F8FAFC' }}>
                      Müştəri nömrəsi: <span style={{ color: '#FBBF24' }}>{offer.phone}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {cleanPhone && (
                        <a
                          href={`tel:${cleanPhone}`}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            backgroundColor: '#2563EB',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: '12px',
                            textDecoration: 'none',
                          }}
                        >
                          Zəng et
                        </a>
                      )}
                      {waPhone && (
                        <a
                          href={`https://wa.me/${waPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            backgroundColor: '#16A34A',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: '12px',
                            textDecoration: 'none',
                          }}
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#070B14',
        color: '#F8FAFC',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          backgroundColor: '#111827',
          borderBottom: `1px solid ${accent}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: 900, color: accent, letterSpacing: '1px' }}>
            {activeInfo.companyName.toUpperCase()}
          </div>
          <div style={{ fontSize: '17px', fontWeight: 800 }}>{activeInfo.roleTitle}</div>
        </div>

        <button
          type="button"
          onClick={() => {
            setUnlockedRole(null);
            resetForm();
          }}
          style={{
            padding: '8px 12px',
            borderRadius: '9px',
            border: '1px solid rgba(255,255,255,0.18)',
            backgroundColor: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Çıxış
        </button>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '16px 16px 60px' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: '#94A3B8', marginBottom: '8px' }}>
          KATEQORİYA
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {CATEGORIES[unlockedRole].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              style={{
                padding: '8px 14px',
                borderRadius: '999px',
                border: `1px solid ${cat === c ? accent : 'rgba(255,255,255,0.16)'}`,
                backgroundColor: cat === c ? accent : '#111827',
                color: cat === c && unlockedRole === 'insaat' ? '#090D16' : '#fff',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {cat === 'Telefonlar' && (
          <>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#94A3B8', marginTop: '14px', marginBottom: '8px' }}>
              MARKA
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {PHONE_BRANDS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBrand(b)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '999px',
                    border: `1px solid ${brand === b ? accent : 'rgba(255,255,255,0.16)'}`,
                    backgroundColor: brand === b ? accent : '#111827',
                    color: brand === b && unlockedRole === 'insaat' ? '#090D16' : '#fff',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{ fontSize: '13px', fontWeight: 800, color: '#94A3B8', marginTop: '14px', marginBottom: '6px' }}>
          MALIN ADI
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={unlockedRole === 'elektronika' ? 'Məs: iPhone 16 Pro' : 'Məs: 100-lük mismar 5 kq'}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '11px 12px',
            borderRadius: '10px',
            backgroundColor: '#111827',
            border: '1px solid rgba(255,255,255,0.18)',
            color: '#fff',
            fontSize: '15px',
          }}
        />

        <div style={{ fontSize: '13px', fontWeight: 800, color: '#94A3B8', marginTop: '14px', marginBottom: '6px' }}>
          QİYMƏT (AZN)
        </div>
        <input
          type="text"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Məs: 2499"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '11px 12px',
            borderRadius: '10px',
            backgroundColor: '#111827',
            border: '1px solid rgba(255,255,255,0.18)',
            color: '#fff',
            fontSize: '15px',
          }}
        />

        {unlockedRole === 'elektronika' && (
          <>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#94A3B8', marginTop: '14px', marginBottom: '6px' }}>
              RƏNGLƏR (VERGÜLLƏ AYIRIN)
            </div>
            <input
              type="text"
              value={colors}
              onChange={(e) => setColors(e.target.value)}
              placeholder="Qara, Titan, Mavi"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '11px 12px',
                borderRadius: '10px',
                backgroundColor: '#111827',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#fff',
                fontSize: '15px',
              }}
            />
          </>
        )}

        <div style={{ fontSize: '13px', fontWeight: 800, color: '#94A3B8', marginTop: '14px', marginBottom: '6px' }}>
          HAQQINDA
        </div>
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="Mal haqqında qısa və dəqiq məlumat"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            height: '95px',
            padding: '11px 12px',
            borderRadius: '10px',
            backgroundColor: '#111827',
            border: '1px solid rgba(255,255,255,0.18)',
            color: '#fff',
            fontSize: '14px',
          }}
        />

        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label
            style={{
              padding: '10px 15px',
              borderRadius: '10px',
              backgroundColor: '#111827',
              border: '1px solid rgba(255,255,255,0.18)',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {imageUrl ? 'Şəkli dəyiş' : 'Şəkil seç'}
            <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
          </label>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.18)',
                backgroundColor: 'transparent',
                color: '#CBD5E1',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Redaktəni ləğv et
            </button>
          )}
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          style={{
            width: '100%',
            marginTop: '18px',
            padding: '13px',
            borderRadius: '11px',
            border: 'none',
            backgroundColor: '#16A34A',
            color: '#fff',
            fontWeight: 900,
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          {saving ? 'Yadda saxlanılır...' : editingId ? 'Dəyişikliyi yayım et' : 'Məhsulu canlı yayımla'}
        </button>

        <div style={{ fontSize: '13px', fontWeight: 800, color: '#94A3B8', marginTop: '26px', marginBottom: '8px' }}>
          SƏNİN BÖLMƏNDƏKİ MALLAR ({workerProducts.length})
        </div>

        {workerProducts.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '12px',
              borderRadius: '12px',
              backgroundColor: '#111827',
              border: '1px solid rgba(255,255,255,0.12)',
              marginBottom: '8px',
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>{item.name}</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                {item.category} · <strong style={{ color: '#4ADE80' }}>{item.price} AZN</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => handleEditSelect(item)}
                style={{
                  padding: '8px 11px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.18)',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Düzəliş
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                style={{
                  padding: '8px 11px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#EF4444',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
