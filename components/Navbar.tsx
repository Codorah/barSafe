
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';

interface NavbarProps {
  barName: string;
  user: { name: string; role: UserRole } | null;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ barName, user, onLogout }) => {
  const navigate = useNavigate();

  return (
    <nav className="bg-[#4A0E1C] shadow-lg sticky top-0 z-40 border-b border-white/10">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => navigate('/')}
        >
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl rotate-45 group-hover:rotate-90 transition-transform duration-500"></div>
            <i className="fa-solid fa-martini-glass-empty relative text-white text-xl"></i>
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="font-black text-2xl tracking-tighter text-white">
              Bar<span className="text-yellow-500">Safe</span>
            </span>
            <span className="text-[9px] text-yellow-500/80 font-bold uppercase tracking-[0.2em]">{barName || 'Togo'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white">{user.name}</p>
                <p className="text-[10px] text-yellow-500 font-black uppercase tracking-tighter">{user.role}</p>
              </div>
              <button 
                onClick={onLogout}
                className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-red-400 transition-colors bg-white/10 rounded-full border border-white/10"
                title="Quitter cet établissement"
              >
                <i className="fa-solid fa-power-off"></i>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
