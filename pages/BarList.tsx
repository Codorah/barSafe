import React, { useEffect, useMemo, useState } from 'react';
import { Establishment } from '../types';
import { api, NewEstablishmentInput } from '../api';
import CreateBarWizard from '../components/CreateBarWizard';
import ThemeToggle from '../components/ThemeToggle';

interface BarListProps {
  establishments: Establishment[];
  loading: boolean;
  onSelect: (id: string) => void;
  onCreate: (input: NewEstablishmentInput) => Promise<string | null>;
}

const HERO_IMG = 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=1600';

const BarList: React.FC<BarListProps> = ({ establishments, loading, onSelect, onCreate }) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'az'>('recent');
  const [wizard, setWizard] = useState(false);
  const [productIndex, setProductIndex] = useState<{ establishmentId: string; name: string; category: string }[]>([]);

  useEffect(() => { api.getProductIndex().then(setProductIndex); }, [establishments.length]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = establishments;
    let foodMatches: Record<string, string[]> = {};

    if (term) {
      // establishments whose products match the term
      productIndex.forEach(p => {
        if (p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)) {
          (foodMatches[p.establishmentId] ||= []).push(p.name);
        }
      });
      list = establishments.filter(e =>
        e.name.toLowerCase().includes(term) ||
        e.description.toLowerCase().includes(term) ||
        (e.address || '').toLowerCase().includes(term) ||
        foodMatches[e.id]
      );
    }

    const sorted = sort === 'az' ? [...list].sort((a, b) => a.name.localeCompare(b.name)) : list;
    return sorted.map(e => ({ bar: e, dish: foodMatches[e.id]?.[0] }));
  }, [establishments, search, sort, productIndex]);

  return (
    <div className="space-y-12 pb-16">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-accent grid place-items-center shadow-[0_8px_20px_-8px_rgb(var(--accent)/0.6)]">
            <i className="fa-solid fa-martini-glass-citrus text-onAccent text-lg" aria-hidden="true"></i>
          </span>
          <span className="flex flex-col -space-y-0.5">
            <span className="font-display text-xl font-semibold tracking-tight leading-none">BarSafe</span>
            <span className="eyebrow text-[0.62rem]">Togo</span>
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2.5rem] shadow-lift isolate">
        <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover z-0" aria-hidden="true" />
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0d0a08]/95 via-[#0d0a08]/82 to-[#0d0a08]/55" aria-hidden="true" />
        <div className="relative z-10 px-6 sm:px-12 py-14 sm:py-20 max-w-2xl">
          <p className="eyebrow text-accent mb-4">Togo · Gestion de bar</p>
          <h1 className="font-display text-4xl sm:text-6xl font-semibold text-[#F4ECE0] leading-[1.05] tracking-tight balance">
            Gérez votre bar, du QR&nbsp;code à la caisse.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-[#F4ECE0]/80 max-w-xl leading-relaxed pretty">
            Menu par QR, service en temps réel, encaissement sécurisé et un stock qui ne ment jamais.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-lg">
            <div className="relative flex-1">
              <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[#0d0a08]/40 z-10" aria-hidden="true"></i>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Chercher un bar ou un plat…"
                aria-label="Chercher un établissement ou un plat"
                className="field field-icon !bg-[#F4ECE0] !text-[#1A1512] !border-transparent placeholder:!text-[#0d0a08]/40"
              />
            </div>
            <button onClick={() => setWizard(true)} className="btn btn-primary btn-lg shrink-0">
              <i className="fa-solid fa-plus" aria-hidden="true"></i> Créer mon bar
            </button>
          </div>
        </div>
      </section>

      {/* List */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">Établissements</h2>
            <p className="text-sm text-muted mt-0.5">
              {loading ? 'Chargement…' : `${filtered.length} ${filtered.length > 1 ? 'lieux disponibles' : 'lieu disponible'}`}
            </p>
          </div>
          {!loading && establishments.length > 0 && (
            <div className="segmented" role="group" aria-label="Trier">
              <button className={`seg-item ${sort === 'recent' ? 'seg-item-active' : ''}`} onClick={() => setSort('recent')}>Récents</button>
              <button className={`seg-item ${sort === 'az' ? 'seg-item-active' : ''}`} onClick={() => setSort('az')}>A–Z</button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map(i => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton h-52 !rounded-none" />
                <div className="p-5 space-y-3">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : establishments.length === 0 ? (
          <div className="card p-12 text-center max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-accent/12 text-accentStrong grid place-items-center mx-auto text-2xl mb-5">
              <i className="fa-solid fa-store" aria-hidden="true"></i>
            </div>
            <h3 className="font-display text-xl font-semibold text-ink mb-2">Aucun établissement pour l'instant</h3>
            <p className="text-muted text-sm mb-6 max-w-sm mx-auto pretty">
              Créez votre premier bar en moins d'une minute : identité, visuels, localisation, codes d'accès.
            </p>
            <button onClick={() => setWizard(true)} className="btn btn-primary btn-lg mx-auto">
              <i className="fa-solid fa-plus" aria-hidden="true"></i> Créer mon établissement
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-flat p-12 text-center">
            <i className="fa-solid fa-magnifying-glass text-3xl text-faint mb-3" aria-hidden="true"></i>
            <p className="text-muted font-medium">Aucun établissement ou plat pour «&nbsp;{search}&nbsp;».</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
            {filtered.map(({ bar, dish }) => (
              <button key={bar.id} onClick={() => onSelect(bar.id)} className="card card-hover overflow-hidden flex flex-col text-left">
                <div className="h-52 relative overflow-hidden">
                  <img src={bar.coverUrl} alt={`Couverture de ${bar.name}`} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" aria-hidden="true" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3">
                    <img src={bar.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover border-2 border-white/60 bg-white shrink-0" />
                    <h3 className="font-display text-xl font-semibold text-white drop-shadow leading-tight">{bar.name}</h3>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-grow">
                  {dish && (
                    <span className="badge badge-amber self-start mb-2"><i className="fa-solid fa-utensils" aria-hidden="true"></i> Sert : {dish}</span>
                  )}
                  <p className="text-sm text-muted line-clamp-2 leading-relaxed flex-grow pretty">
                    {bar.description || 'Aucune description disponible.'}
                  </p>
                  {bar.address && (
                    <p className="text-xs text-faint mt-3 flex items-start gap-1.5 line-clamp-1">
                      <i className="fa-solid fa-location-dot mt-0.5" aria-hidden="true"></i> {bar.address}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-line/8">
                    <span className="text-xs font-semibold text-accentStrong">Ouvrir</span>
                    <span className="w-9 h-9 rounded-full bg-accent/12 text-accentStrong grid place-items-center">
                      <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {wizard && (
        <CreateBarWizard
          onClose={() => setWizard(false)}
          onCreate={onCreate}
          onSelect={(id) => { setWizard(false); onSelect(id); }}
        />
      )}
    </div>
  );
};

export default BarList;
