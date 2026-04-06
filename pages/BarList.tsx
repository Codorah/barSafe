
import React, { useState, useRef } from 'react';
import { Establishment } from '../types';

interface BarListProps {
  establishments: Establishment[];
  onSelect: (id: string) => void;
  onCreate: (bar: Establishment) => void;
}

const BarList: React.FC<BarListProps> = ({ establishments, onSelect, onCreate }) => {
  const [search, setSearch] = useState('');
  const [newBar, setNewBar] = useState({
    name: '',
    description: '',
    secretCode: '',
    logoUrl: '',
    coverUrl: ''
  });
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const filtered = establishments.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'coverUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewBar(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBar.name || !newBar.secretCode) return alert("Veuillez remplir le nom et le code.");
    
    const createdBar: Establishment = {
      id: Math.random().toString(36).substr(2, 9),
      name: newBar.name,
      description: newBar.description,
      logoUrl: newBar.logoUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${newBar.name}`,
      coverUrl: newBar.coverUrl || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=800',
      secretCode: newBar.secretCode,
      products: [],
      orders: [],
      employees: [],
      notifications: []
    };
    onCreate(createdBar);
    setNewBar({ name: '', description: '', secretCode: '', logoUrl: '', coverUrl: '' });
    alert("Votre établissement a été créé avec succès !");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToForm = () => {
    document.getElementById('create-bar')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 bg-[#4A0E1C] rounded-3xl text-white shadow-2xl px-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="relative z-10 text-center space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-3xl rotate-45 flex items-center justify-center shadow-xl">
               <i className="fa-solid fa-martini-glass-empty -rotate-45 text-white text-3xl"></i>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter">
              Bar<span className="text-yellow-500">Safe</span> Togo
            </h1>
            <p className="text-xl italic text-yellow-500/80 font-medium">"Drink well, sell well, Gain well"</p>
          </div>
          
          <p className="text-xl opacity-90 max-w-2xl mx-auto leading-relaxed">
            La plateforme n°1 au Togo pour la gestion transparente et sécurisée des bars et restaurants.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="relative w-full max-w-md">
              <input 
                type="text" 
                placeholder="Chercher un bar..." 
                className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-900 shadow-lg outline-none focus:ring-4 focus:ring-yellow-400/50 transition-all text-lg font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl"></i>
            </div>
            <button 
              onClick={scrollToForm}
              className="bg-yellow-500 hover:bg-yellow-400 text-[#4A0E1C] font-black px-8 py-4 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <i className="fa-solid fa-plus-circle"></i> AJOUTER MON BAR
            </button>
          </div>
        </div>
      </section>

      {/* Bar List Grid */}
      <section>
        <div className="flex justify-between items-end mb-8">
          <div>
            <h3 className="text-3xl font-black text-gray-900">Établissements</h3>
            <p className="text-gray-500 font-medium">Sélectionnez votre lieu préféré</p>
          </div>
          <span className="bg-gray-100 text-gray-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border">
            {filtered.length} Résultat(s)
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(bar => (
            <div 
              key={bar.id} 
              onClick={() => onSelect(bar.id)}
              className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer border border-gray-100 flex flex-col h-full"
            >
              <div className="h-56 relative overflow-hidden">
                <img src={bar.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-6 left-6 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl border-2 border-white/50 bg-white p-1 overflow-hidden shadow-xl">
                    <img src={bar.logoUrl} className="w-full h-full object-contain rounded-xl" />
                  </div>
                  <h4 className="text-white font-black text-2xl drop-shadow-lg">{bar.name}</h4>
                </div>
              </div>
              <div className="p-6 flex-grow flex flex-col justify-between">
                <p className="text-gray-500 font-medium line-clamp-2 leading-relaxed mb-6">{bar.description || 'Aucune description disponible.'}</p>
                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                  <span className="flex items-center gap-2 text-yellow-600 font-black text-xs uppercase tracking-widest">
                    <i className="fa-solid fa-bottle-water"></i> {bar.products.length} Produits
                  </span>
                  <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center group-hover:bg-yellow-500 group-hover:text-white transition-colors duration-300">
                    <i className="fa-solid fa-arrow-right"></i>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
              <i className="fa-solid fa-search text-4xl text-gray-200 mb-4"></i>
              <p className="text-gray-400 font-medium italic">Aucun établissement trouvé pour votre recherche.</p>
            </div>
          )}
        </div>
      </section>

      {/* Creation Form Section */}
      <section id="create-bar" className="bg-[#4A0E1C] rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden border-t-8 border-yellow-500">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="mb-12 text-center md:text-left flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center text-4xl text-yellow-500 border border-white/10">
               <i className="fa-solid fa-plus"></i>
            </div>
            <div>
              <h2 className="text-4xl font-black mb-2">Ajouter un établissement</h2>
              <p className="text-yellow-500/80 font-bold uppercase tracking-widest text-sm">Prenez le contrôle de votre business dès maintenant</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-black text-yellow-500/80 uppercase tracking-widest mb-3">Nom de l'établissement *</label>
                <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:bg-white/10 focus:border-yellow-500 outline-none transition-all font-bold text-lg"
                  placeholder="Ex: Le Maquis Star Lomé"
                  value={newBar.name}
                  onChange={(e) => setNewBar({...newBar, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-black text-yellow-500/80 uppercase tracking-widest mb-3">Description du bar</label>
                <textarea 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:bg-white/10 focus:border-yellow-500 outline-none transition-all font-medium min-h-[120px]"
                  placeholder="Ambiance, spécialités, quartier..."
                  value={newBar.description}
                  onChange={(e) => setNewBar({...newBar, description: e.target.value})}
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-black text-yellow-500/80 uppercase tracking-widest mb-3">Code de Sécurité (4 chiffres) *</label>
                <input 
                  type="password" 
                  maxLength={4}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:bg-white/10 focus:border-yellow-500 outline-none transition-all font-black text-2xl tracking-[0.5em] text-center"
                  placeholder="0000"
                  value={newBar.secretCode}
                  onChange={(e) => setNewBar({...newBar, secretCode: e.target.value})}
                  required
                />
                <p className="text-[10px] text-white/40 mt-2 italic text-center">Ce code sera utilisé par vos employés pour se connecter.</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Logo Upload */}
              <div className="space-y-4">
                <label className="block text-sm font-black text-yellow-500/80 uppercase tracking-widest mb-3">Logo de l'établissement</label>
                <div className="flex items-center gap-6">
                  <div 
                    onClick={() => logoInputRef.current?.click()}
                    className="w-24 h-24 bg-white/5 border-2 border-dashed border-white/20 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 hover:border-yellow-500 transition-all overflow-hidden relative group"
                  >
                    {newBar.logoUrl ? (
                      <img src={newBar.logoUrl} className="w-full h-full object-cover" />
                    ) : (
                      <i className="fa-solid fa-camera text-2xl text-white/30 group-hover:text-yellow-500"></i>
                    )}
                  </div>
                  <div className="flex-grow">
                    <button 
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-white/10"
                    >
                      <i className="fa-solid fa-image"></i> Choisir depuis galerie
                    </button>
                    <input 
                      ref={logoInputRef}
                      type="file" 
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'logoUrl')}
                    />
                  </div>
                </div>
              </div>

              {/* Cover Upload */}
              <div className="space-y-4">
                <label className="block text-sm font-black text-yellow-500/80 uppercase tracking-widest mb-3">Photo de couverture</label>
                <div 
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full h-40 bg-white/5 border-2 border-dashed border-white/20 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 hover:border-yellow-500 transition-all overflow-hidden group relative"
                >
                  {newBar.coverUrl ? (
                    <img src={newBar.coverUrl} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <i className="fa-solid fa-panorama text-4xl text-white/20 group-hover:text-yellow-500 mb-2"></i>
                      <span className="text-xs font-bold text-white/40">Cliquez pour téléverser une photo</span>
                    </>
                  )}
                  <input 
                    ref={coverInputRef}
                    type="file" 
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'coverUrl')}
                  />
                </div>
              </div>

              <div className="pt-6">
                <button 
                  type="submit"
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-[#4A0E1C] font-black py-5 rounded-2xl shadow-2xl transition-all transform hover:-translate-y-1 active:scale-95 text-xl flex items-center justify-center gap-3"
                >
                  CRÉER MON ÉTABLISSEMENT <i className="fa-solid fa-rocket"></i>
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default BarList;
