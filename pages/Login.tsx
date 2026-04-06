
import React, { useState } from 'react';
import { UserRole, Establishment } from '../types';

interface LoginProps {
  bar?: Establishment;
  onLogin: (user: { name: string; role: UserRole; establishmentId: string }) => void;
  onClientAccess: () => void;
}

const Login: React.FC<LoginProps> = ({ bar, onLogin, onClientAccess }) => {
  const [isStaff, setIsStaff] = useState(false);
  const [role, setRole] = useState<UserRole>(UserRole.SERVEUR);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [code, setCode] = useState('');

  if (!bar) return <div>Bar introuvable</div>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !code) return alert('Veuillez remplir tous les champs.');
    
    if (code !== bar.secretCode) {
      return alert('Code secret incorrect pour cet établissement.');
    }

    onLogin({ 
      name: `${firstName} ${lastName}`, 
      role, 
      establishmentId: bar.id 
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <img src={bar.logoUrl} className="w-32 h-32 rounded-[2.5rem] mx-auto border-8 border-white shadow-2xl object-cover relative z-10" />
          <div className="absolute inset-0 bg-yellow-500 blur-2xl opacity-20 scale-150"></div>
        </div>
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">{bar.name}</h1>
          <p className="text-gray-500 font-medium">Content de vous revoir chez nous !</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Client Access */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl hover:shadow-2xl transition-all flex flex-col items-center text-center group">
          <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-3xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-500 rotate-12">
            <i className="fa-solid fa-utensils"></i>
          </div>
          <h2 className="text-2xl font-black mb-4">Espace Client</h2>
          <p className="text-gray-500 font-medium text-sm mb-8 leading-relaxed">
            Consultez notre menu digital, découvrez nos promotions et commandez sans attendre.
          </p>
          <button 
            onClick={onClientAccess}
            className="mt-auto w-full bg-yellow-500 text-gray-900 font-black py-4 rounded-2xl hover:bg-yellow-400 transition-all shadow-lg hover:shadow-yellow-500/20"
          >
            CONSULTER LE MENU
          </button>
        </div>

        {/* Staff Access */}
        <div className="bg-[#4A0E1C] p-10 rounded-[3rem] border border-white/10 shadow-xl flex flex-col items-center group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
          
          <div className="w-20 h-20 bg-white/10 text-yellow-500 rounded-3xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-500 -rotate-12 border border-white/10">
            <i className="fa-solid fa-user-tie"></i>
          </div>
          <h2 className="text-2xl font-black mb-4 text-white">Espace Personnel</h2>
          
          {isStaff ? (
            <form onSubmit={handleSubmit} className="w-full space-y-4 mt-4 relative z-10">
              <div className="grid grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="Prénom" 
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-yellow-500 text-white font-bold"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <input 
                  type="text" 
                  placeholder="Nom" 
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-yellow-500 text-white font-bold"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-yellow-500 text-white font-bold appearance-none cursor-pointer"
              >
                <option value={UserRole.SERVEUR}>Serveur / Caissier</option>
                <option value={UserRole.PATRON}>Administrateur / Patron</option>
              </select>
              <input 
                type="password" 
                placeholder="Code secret de l'établissement" 
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-yellow-500 text-white font-black text-center tracking-[0.3em]"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsStaff(false)}
                  className="flex-1 bg-white/10 text-white font-bold py-4 rounded-2xl hover:bg-white/20 transition-all"
                >
                  <i className="fa-solid fa-arrow-left"></i>
                </button>
                <button 
                  type="submit"
                  className="flex-[3] bg-yellow-500 text-[#4A0E1C] font-black py-4 rounded-2xl hover:bg-yellow-400 transition-all shadow-xl"
                >
                  CONNEXION
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center w-full relative z-10">
              <p className="text-white/60 font-medium text-sm mb-8 text-center leading-relaxed">
                Connectez-vous pour gérer les commandes en cours, valider les encaissements ou surveiller l'inventaire.
              </p>
              <button 
                onClick={() => setIsStaff(true)}
                className="mt-auto w-full bg-white text-[#4A0E1C] font-black py-4 rounded-2xl hover:bg-gray-100 transition-all shadow-lg"
              >
                ACCÈS STAFF
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="text-center pt-10">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.3em]">Propulsé par BarSafe Togo</p>
      </div>
    </div>
  );
};

export default Login;
