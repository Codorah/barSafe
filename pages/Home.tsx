
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center space-y-8 px-4">
      <div className="space-y-4">
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight">
          Gérez votre bar avec <br/>
          <span className="text-yellow-500">transparence totale</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          La solution 🇹🇬 pour lutter contre le vol, gérer les stocks en temps réel 
          et offrir un menu digital moderne à vos clients.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <button 
          onClick={() => navigate('/menu')}
          className="p-8 bg-white border-2 border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:border-yellow-500 transition-all group flex flex-col items-center"
        >
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-qrcode"></i>
          </div>
          <h3 className="font-bold text-lg">Espace Client</h3>
          <p className="text-sm text-gray-500 mt-2">Scanner & Commander</p>
        </button>

        <button 
          onClick={() => navigate('/login')}
          className="p-8 bg-white border-2 border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:border-green-500 transition-all group flex flex-col items-center"
        >
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-beer-mug-empty"></i>
          </div>
          <h3 className="font-bold text-lg">Espace Serveur</h3>
          <p className="text-sm text-gray-500 mt-2">Suivi des commandes</p>
        </button>

        <button 
          onClick={() => navigate('/login')}
          className="p-8 bg-white border-2 border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:border-purple-500 transition-all group flex flex-col items-center"
        >
          <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-chart-line"></i>
          </div>
          <h3 className="font-bold text-lg">Espace Patron</h3>
          <p className="text-sm text-gray-500 mt-2">Gestion & Inventaire</p>
        </button>
      </div>
    </div>
  );
};

export default Home;
