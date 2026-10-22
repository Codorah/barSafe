import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import { resetCookieNotice } from '../components/CookieBanner';

const UPDATED = '22 octobre 2026';
const CONTACT = 'codorah@hotmail.com';

const STORAGE: { name: string; purpose: string; duration: string }[] = [
  { name: 'sb-…-auth-token', purpose: 'Garder votre compte connecté (établissement ou client).', duration: 'Jusqu’à la déconnexion ; renouvelé automatiquement.' },
  { name: 'barsafe_session', purpose: 'Session du personnel (code Direction, Service ou Caisse) ou accès au menu d’un bar.', duration: '12 heures côté serveur, effacé à la déconnexion.' },
  { name: 'barsafe_tracking_<bar>', purpose: 'Jetons secrets qui permettent de suivre vos commandes passées par QR code, sans compte.', duration: 'Jusqu’à effacement des données du navigateur (30 jetons maximum par bar).' },
  { name: 'theme', purpose: 'Mode clair, sombre ou système choisi.', duration: 'Jusqu’à modification.' },
  { name: 'barsafe_sound', purpose: 'Activation du son des alertes pour le personnel.', duration: 'Jusqu’à modification.' },
  { name: 'barsafe_visited', purpose: 'Savoir si la page de présentation a déjà été vue, pour vous emmener directement à l’accueil.', duration: 'Jusqu’à effacement des données du navigateur.' },
  { name: 'barsafe_pending_account_type', purpose: 'Type de compte choisi avant une inscription avec Google, appliqué au retour.', duration: 'Quelques secondes : effacé dès le retour de Google.' },
  { name: 'barsafe_cookie_notice', purpose: 'Mémoriser que vous avez lu ce bandeau d’information.', duration: '12 mois.' },
  { name: 'Cache de l’application', purpose: 'Fichiers de l’application (mode hors ligne, installation sur l’écran d’accueil).', duration: 'Remplacé à chaque mise à jour.' },
];

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24 space-y-3">
    <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
    <div className="space-y-3 text-[0.97rem] text-muted leading-relaxed pretty">{children}</div>
  </section>
);

const PrivacyPage: React.FC = () => {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [hash]);

  return (
    <div className="space-y-10 pb-16">
      <SiteHeader />

      <article className="max-w-3xl mx-auto card p-6 sm:p-10 space-y-10">
        <header className="space-y-3">
          <p className="eyebrow text-accentStrong">Vos données</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Politique de confidentialité</h1>
          <p className="text-sm text-faint">Dernière mise à jour : {UPDATED}</p>
          <p className="text-muted leading-relaxed pretty">
            BarSafe est une plateforme de commande et de gestion pour bars, maquis et lounges. Cette page explique quelles données
            nous traitons, pourquoi, combien de temps, et comment exercer vos droits. En résumé : nous collectons le minimum,
            nous ne vendons rien, et il n’y a <strong className="text-ink">ni publicité ni outil de mesure d’audience</strong>.
          </p>
          <nav aria-label="Sommaire" className="flex flex-wrap gap-2 pt-2">
            {[['responsable', 'Responsable'], ['donnees', 'Données'], ['qr', 'Clients QR'], ['durees', 'Durées'], ['partage', 'Partage'], ['securite', 'Sécurité'], ['droits', 'Vos droits'], ['cookies', 'Cookies et stockage']].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="chip">{label}</a>
            ))}
          </nav>
        </header>

        <Section id="responsable" title="1. Qui est responsable ?">
          <p>
            La plateforme BarSafe est éditée par Elodie ATANA (Codorah), joignable à{' '}
            <a className="link" href={`mailto:${CONTACT}`}>{CONTACT}</a>. Elle est responsable des données liées aux comptes.
          </p>
          <p>
            Pour les commandes passées dans un établissement, c’est <strong className="text-ink">l’établissement</strong> qui décide de leur usage
            (service, encaissement, comptabilité) : il est responsable de ce traitement et BarSafe agit pour son compte.
          </p>
        </Section>

        <Section id="donnees" title="2. Quelles données, pour quoi faire ?">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-ink">Compte</strong> (établissement ou client) : e-mail, nom, téléphone facultatif, type de compte, mot de passe (stocké chiffré par notre hébergeur, jamais lisible). Finalité : créer et sécuriser votre compte. Base : exécution du service que vous demandez.</li>
            <li><strong className="text-ink">Connexion avec Google</strong> (si vous la choisissez) : Google nous transmet votre nom, votre adresse e-mail, votre photo de profil et un identifiant de compte. Nous n’avons jamais accès à votre mot de passe Google ni à vos autres données Google.</li>
            <li><strong className="text-ink">Commandes</strong> : établissement, numéro de table, prénom saisi, produits, montant, mode de paiement, date, et votre compte client si vous étiez connecté. Finalité : préparer, servir et encaisser la commande, suivre le stock. Base : exécution de la commande et obligations comptables de l’établissement.</li>
            <li><strong className="text-ink">Établissement</strong> : nom, description, visuels, adresse et position sur la carte, menu et stock. Ces informations sont publiques par nature.</li>
            <li><strong className="text-ink">Codes d’accès du personnel</strong> : enregistrés uniquement sous forme chiffrée (bcrypt). Les tentatives de connexion sont horodatées pour bloquer les essais répétés.</li>
            <li><strong className="text-ink">Données techniques</strong> : notre hébergeur conserve des journaux techniques (adresse IP, date, requête) pour la sécurité et le bon fonctionnement.</li>
          </ul>
          <p>Nous ne faisons pas de profilage, pas de prospection commerciale et pas de revente de données.</p>
        </Section>

        <Section id="qr" title="3. Vous commandez par QR code, sans compte">
          <p>
            Aucun compte n’est demandé. Votre téléphone reçoit un <strong className="text-ink">jeton de suivi secret</strong> pour chaque commande ;
            c’est la seule clé qui permet de la relire. Un client ne peut voir ni les commandes des autres tables, ni celles d’un autre
            établissement, ni les informations du personnel : ces données ne sont lisibles que par l’équipe connectée de l’établissement.
          </p>
        </Section>

        <Section id="durees" title="4. Combien de temps ?">
          <ul className="list-disc pl-5 space-y-2">
            <li>Compte : jusqu’à sa suppression, que vous pouvez faire vous-même depuis <Link to="/compte" className="link">Mon compte</Link>.</li>
            <li>Commandes : conservées pour la comptabilité de l’établissement. Si vous supprimez votre compte, elles sont détachées de vous.</li>
            <li>Sessions du personnel : 12 heures. Tentatives de connexion : 24 heures.</li>
            <li>Journaux techniques de l’hébergeur : selon sa politique, généralement quelques jours.</li>
          </ul>
        </Section>

        <Section id="partage" title="5. Avec qui sont-elles partagées ?">
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-ink">Supabase</strong> (base de données, comptes, temps réel), serveurs situés à Paris (Union européenne). Vos données sont donc hébergées hors du Togo, chez un prestataire soumis au RGPD.</li>
            <li><strong className="text-ink">Ressources externes chargées par votre navigateur</strong>, qui reçoivent votre adresse IP : polices Google Fonts, images par défaut (Unsplash, DiceBear), carte et recherche d’adresse (OpenStreetMap). Les photos envoyées par les établissements sont stockées chez Supabase.</li>
            <li><strong className="text-ink">Google</strong>, uniquement si vous utilisez « Continuer avec Google » : Google sait alors que vous vous connectez à BarSafe, selon sa propre politique de confidentialité.</li>
            <li>L’établissement où vous commandez, pour les commandes qui le concernent.</li>
          </ul>
        </Section>

        <Section id="securite" title="6. Sécurité">
          <p>
            Connexions chiffrées (HTTPS), mots de passe et codes chiffrés, accès cloisonnés par établissement et par rôle, aucune écriture
            directe possible dans la base : chaque action passe par une fonction qui vérifie qui la demande. Le stock ne peut baisser qu’à l’encaissement.
          </p>
        </Section>

        <Section id="droits" title="7. Vos droits">
          <p>
            Vous pouvez accéder à vos données, les corriger, les supprimer, vous opposer à un traitement ou demander leur portabilité.
            Les informations du compte se modifient et se suppriment directement dans <Link to="/compte" className="link">Mon compte</Link> ;
            pour le reste, écrivez à <a className="link" href={`mailto:${CONTACT}`}>{CONTACT}</a>. Réponse sous un mois.
          </p>
          <p>
            Ces droits découlent de la loi togolaise n° 2019-014 du 29 octobre 2019 relative à la protection des données à caractère
            personnel et, lorsqu’il s’applique, du Règlement général sur la protection des données (RGPD). Vous pouvez saisir l’autorité
            de protection des données compétente (au Togo, l’IPDCP).
          </p>
        </Section>

        <Section id="cookies" title="8. Cookies et stockage local">
          <p>
            BarSafe ne dépose <strong className="text-ink">aucun cookie publicitaire ni de mesure d’audience</strong>. L’application utilise uniquement
            le stockage de votre navigateur pour fonctionner. Ces éléments sont strictement nécessaires ou correspondent à un choix
            que vous avez fait (thème, son) : ils ne nécessitent donc pas de consentement, mais nous vous les présentons ici.
          </p>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm text-left min-w-[34rem]">
              <thead>
                <tr className="text-faint">
                  <th className="font-semibold py-2 px-2">Nom</th>
                  <th className="font-semibold py-2 px-2">À quoi ça sert</th>
                  <th className="font-semibold py-2 px-2">Durée</th>
                </tr>
              </thead>
              <tbody>
                {STORAGE.map(s => (
                  <tr key={s.name} className="border-t border-line/8 align-top">
                    <td className="py-2.5 px-2 font-mono text-xs text-ink whitespace-nowrap">{s.name}</td>
                    <td className="py-2.5 px-2">{s.purpose}</td>
                    <td className="py-2.5 px-2">{s.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Vous pouvez tout effacer depuis les réglages de votre navigateur (données du site), ou depuis BarSafe : Paramètres,
            puis « Réinitialiser ». Vous serez alors déconnecté et perdrez le suivi de vos commandes QR en cours.
          </p>
          <button onClick={resetCookieNotice} className="btn btn-outline btn-sm">Revoir le bandeau d’information</button>
        </Section>
      </article>
    </div>
  );
};

export default PrivacyPage;
