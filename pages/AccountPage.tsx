import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import Loader from '../components/Loader';
import ErrorState from '../components/ErrorState';
import { useAuth } from '../lib/auth';
import { api, ApiError } from '../api';
import { supabase } from '../supabaseClient';
import { Establishment, Order, OrderStatus } from '../types';

interface AccountPageProps {
  /** Opens the Direction dashboard of an owned bar (session created server-side). */
  onOpenBar: (bar: Establishment, token: string) => void;
  onError: (err: unknown, retry?: () => void) => void;
  onSuccess: (title: string, message?: string) => void;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  [OrderStatus.PENDING]: { label: 'En attente', cls: 'badge-amber' },
  [OrderStatus.SERVED]: { label: 'Servie', cls: 'badge-warn' },
  [OrderStatus.PAID]: { label: 'Payée', cls: 'badge-positive' },
  [OrderStatus.CANCELLED]: { label: 'Annulée', cls: 'badge-danger' },
};

const AccountPage: React.FC<AccountPageProps> = ({ onOpenBar, onError, onSuccess }) => {
  const { session, profile, loading, signOut, updateProfile, becomeOwner } = useAuth();
  const [upgrading, setUpgrading] = useState(false);
  const navigate = useNavigate();
  const isOwner = profile?.role === 'OWNER';

  const [bars, setBars] = useState<Establishment[] | null>(null);
  const [orders, setOrders] = useState<(Order & { establishmentName: string })[] | null>(null);
  const [listError, setListError] = useState<ApiError | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile) { setFullName(profile.fullName); setPhone(profile.phone); }
  }, [profile]);

  const loadLists = async () => {
    setListError(null);
    try {
      if (isOwner) setBars(await api.myEstablishments());
      else setOrders(await api.myOrders());
    } catch (e) {
      setListError(ApiError.from(e, 'account'));
    }
  };

  useEffect(() => {
    if (profile) loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when the account changes only
  }, [profile?.id, profile?.role]);

  if (loading) return <Loader label="Chargement de votre compte…" />;
  if (!session) return <Navigate to="/connexion?next=/compte" replace />;
  if (!profile) {
    return (
      <div className="space-y-10"><SiteHeader />
        <ErrorState error={{ title: 'Profil indisponible', message: 'Votre profil n’a pas pu être chargé. Réessayez dans un instant.', tone: 'warning', retryable: true }} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  const openBar = async (bar: Establishment) => {
    setOpening(bar.id);
    try {
      onOpenBar(bar, await api.ownerSession(bar.id));
    } catch (e) {
      onError(e, () => openBar(bar));
    } finally {
      setOpening(null);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) return onError({ code: 'P0001', message: 'Indiquez votre nom (2 caractères minimum).' });
    setSavingProfile(true);
    try { await updateProfile({ fullName, phone }); onSuccess('Profil mis à jour'); }
    catch (err) { onError(err); }
    finally { setSavingProfile(false); }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8 || !/\d/.test(newPassword) || !/[a-zA-Z]/.test(newPassword)) {
      return onError({ code: 'weak_password', message: '' });
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) return onError(error);
    setNewPassword('');
    onSuccess('Mot de passe modifié');
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.deleteMyAccount();
      await signOut();
      onSuccess('Compte supprimé', 'Vos données de compte ont été effacées.');
      navigate('/etablissements', { replace: true });
    } catch (e) {
      onError(e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-10 pb-16">
      <SiteHeader />

      <section className="card p-6 sm:p-8 flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <span className="w-14 h-14 rounded-2xl bg-accent text-onAccent grid place-items-center font-display text-2xl font-semibold shrink-0">
            {(profile.fullName || session.user.email || '?').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold truncate">{profile.fullName || 'Mon compte'}</h1>
            <p className="text-sm text-muted truncate">{session.user.email}</p>
            <span className={`badge mt-2 ${isOwner ? 'badge-amber' : 'badge-muted'}`}>
              <i className={`fa-solid ${isOwner ? 'fa-store' : 'fa-user'}`} aria-hidden="true"></i> {isOwner ? 'Compte établissement' : 'Compte client'}
            </span>
          </div>
        </div>
        <button onClick={async () => { await signOut(); navigate('/etablissements'); }} className="btn btn-outline">
          <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i> Se déconnecter
        </button>
      </section>

      {!isOwner && (
        <section className="card-flat p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-ink">Vous gérez un bar ?</p>
            <p className="text-sm text-muted">Passez en compte établissement pour créer votre bar. Votre historique reste disponible.</p>
          </div>
          <button
            onClick={async () => {
              setUpgrading(true);
              try { await becomeOwner(); onSuccess('Compte établissement activé', 'Vous pouvez maintenant créer votre bar.'); }
              catch (e) { onError(e); }
              finally { setUpgrading(false); }
            }}
            disabled={upgrading}
            className="btn btn-soft"
          >
            {upgrading ? <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> : <><i className="fa-solid fa-store" aria-hidden="true"></i> Passer en compte établissement</>}
          </button>
        </section>
      )}

      {/* Owner: establishments / Customer: order history */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold">{isOwner ? 'Mes établissements' : 'Mes commandes'}</h2>
          {isOwner && (
            <Link to="/etablissements?creer=1" className="btn btn-primary btn-sm"><i className="fa-solid fa-plus" aria-hidden="true"></i> Créer un bar</Link>
          )}
        </div>

        {listError ? (
          <ErrorState error={listError} onRetry={loadLists} />
        ) : isOwner ? (
          bars === null ? <Loader label="Chargement de vos établissements…" /> : bars.length === 0 ? (
            <div className="card-flat p-10 text-center">
              <p className="font-display text-lg text-ink mb-1">Aucun établissement</p>
              <p className="text-sm text-muted mb-5">Créez votre premier bar : menu, QR codes de table et codes d’équipe en une minute.</p>
              <Link to="/etablissements?creer=1" className="btn btn-primary mx-auto">Créer mon bar</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bars.map(bar => (
                <div key={bar.id} className="card p-4 flex items-center gap-4">
                  <img src={bar.logoUrl || '/logo.png'} alt="" className="w-14 h-14 rounded-xl object-cover border border-line/10 shrink-0" />
                  <div className="min-w-0 flex-grow">
                    <p className="font-semibold text-ink truncate">{bar.name}</p>
                    <p className="text-xs text-muted truncate">{bar.address || 'Adresse non renseignée'}</p>
                  </div>
                  <button onClick={() => openBar(bar)} disabled={opening === bar.id} className="btn btn-soft btn-sm shrink-0">
                    {opening === bar.id ? <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> : <>Tableau de bord <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></>}
                  </button>
                </div>
              ))}
            </div>
          )
        ) : orders === null ? <Loader label="Chargement de vos commandes…" /> : orders.length === 0 ? (
          <div className="card-flat p-10 text-center">
            <p className="font-display text-lg text-ink mb-1">Aucune commande pour l’instant</p>
            <p className="text-sm text-muted">Les commandes passées en étant connecté apparaissent ici, dans tous les bars BarSafe.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(o => (
              <div key={o.id} className="card p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{o.establishmentName}</p>
                  <p className="text-xs text-muted tabnum">{new Date(o.timestamp).toLocaleString('fr-FR')} · Table {o.tableNumber} · {o.items.reduce((a, i) => a + i.quantity, 0)} article(s)</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${STATUS[o.status]?.cls || 'badge-muted'}`}>{STATUS[o.status]?.label || o.status}</span>
                  <span className="font-display text-lg font-semibold tabnum">{o.total.toLocaleString('fr-FR')} F</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={saveProfile} className="card p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold">Informations</h2>
          <div>
            <label className="label" htmlFor="acc-name">Nom</label>
            <input id="acc-name" className="field" value={fullName} onChange={e => setFullName(e.target.value)} maxLength={80} />
          </div>
          <div>
            <label className="label" htmlFor="acc-phone">Téléphone</label>
            <input id="acc-phone" className="field" type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={30} />
          </div>
          <button disabled={savingProfile} className="btn btn-primary">{savingProfile ? <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> : 'Enregistrer'}</button>
        </form>

        <form onSubmit={savePassword} className="card p-6 space-y-4">
          <h2 className="font-display text-xl font-semibold">Mot de passe</h2>
          <div>
            <label className="label" htmlFor="acc-pass">Nouveau mot de passe</label>
            <input id="acc-pass" className="field" type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            <p className="text-xs text-faint mt-1.5">8 caractères minimum, avec des lettres et des chiffres.</p>
          </div>
          <button disabled={savingPassword || !newPassword} className="btn btn-primary">{savingPassword ? <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> : 'Modifier'}</button>
        </form>
      </div>

      <section className="card p-6 border-danger/25 space-y-3">
        <h2 className="font-display text-xl font-semibold text-danger">Supprimer mon compte</h2>
        <p className="text-sm text-muted pretty">
          Votre profil et vos identifiants sont effacés définitivement.
          {isOwner
            ? ' Vos établissements restent accessibles à votre équipe avec leurs codes, mais ne seront plus rattachés à un compte.'
            : ' Les commandes déjà passées restent dans la comptabilité des bars, sans lien avec vous.'}
          {' '}Voir la <Link to="/confidentialite" className="link">politique de confidentialité</Link>.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input className="field !w-auto" placeholder="Tapez SUPPRIMER" value={confirmDelete} onChange={e => setConfirmDelete(e.target.value)} aria-label="Confirmation de suppression" />
          <button onClick={deleteAccount} disabled={confirmDelete !== 'SUPPRIMER' || deleting} className="btn btn-danger">
            {deleting ? <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> : 'Supprimer définitivement'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default AccountPage;
