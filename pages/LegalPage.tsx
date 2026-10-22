import React from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';

// Fill these before opening to the public (identity of the publisher is mandatory).
const LEGAL = {
  publisher: 'Elodie ATANA (Codorah)',
  status: 'Entrepreneur individuel', // ⚠ à confirmer : statut juridique, n° RCCM / NIF si applicables
  address: 'Lomé, Togo',             // ⚠ à compléter : adresse postale complète
  email: 'codorah@hotmail.com',
  phone: '+228 71 67 25 65',
  siteHost: 'À préciser (hébergeur du site bar-safe.codorah.com)', // ⚠ à compléter
  updated: '22 octobre 2026',
};

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-24 space-y-3">
    <h2 className="font-display text-2xl font-semibold text-ink">{title}</h2>
    <div className="space-y-3 text-[0.97rem] text-muted leading-relaxed pretty">{children}</div>
  </section>
);

const LegalPage: React.FC = () => (
  <div className="space-y-10 pb-16">
    <SiteHeader />

    <article className="max-w-3xl mx-auto card p-6 sm:p-10 space-y-10">
      <header className="space-y-3">
        <p className="eyebrow text-accentStrong">Cadre d’utilisation</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">Mentions légales et conditions d’utilisation</h1>
        <p className="text-sm text-faint">Dernière mise à jour : {LEGAL.updated}</p>
        <nav aria-label="Sommaire" className="flex flex-wrap gap-2 pt-2">
          {[['mentions', 'Mentions légales'], ['service', 'Le service'], ['comptes', 'Comptes'], ['etablissements', 'Établissements'], ['clients', 'Clients'], ['responsabilite', 'Responsabilité'], ['droit', 'Droit applicable']].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="chip">{label}</a>
          ))}
        </nav>
      </header>

      <Section id="mentions" title="1. Mentions légales">
        <ul className="space-y-1.5">
          <li><strong className="text-ink">Éditeur :</strong> {LEGAL.publisher}, {LEGAL.status}, {LEGAL.address}.</li>
          <li><strong className="text-ink">Contact :</strong> <a className="link" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> · {LEGAL.phone}</li>
          <li><strong className="text-ink">Directrice de la publication :</strong> Elodie ATANA.</li>
          <li><strong className="text-ink">Hébergement du site :</strong> {LEGAL.siteHost}.</li>
          <li><strong className="text-ink">Hébergement des données :</strong> Supabase Inc., serveurs situés à Paris (France).</li>
        </ul>
      </Section>

      <Section id="service" title="2. Le service">
        <p>
          BarSafe permet aux établissements (bars, maquis, lounges, restaurants) de publier un menu accessible par QR code,
          de recevoir les commandes de leurs clients, de les servir et de les encaisser, et de suivre leur stock.
          En utilisant BarSafe, vous acceptez les présentes conditions.
        </p>
        <p>
          <strong className="text-ink">BarSafe n’encaisse aucun paiement.</strong> Le règlement (espèces, carte, Mobile Money)
          se fait directement auprès de l’établissement ; la mention « payée » dans l’application est enregistrée par sa caisse.
        </p>
      </Section>

      <Section id="comptes" title="3. Comptes et accès">
        <ul className="list-disc pl-5 space-y-2">
          <li>Un compte est facultatif pour commander par QR code. Il est nécessaire pour créer et gérer un établissement.</li>
          <li>Vous êtes responsable de la confidentialité de votre mot de passe et des codes d’accès de votre équipe. Prévenez-nous sans délai en cas d’usage frauduleux.</li>
          <li>Vous pouvez supprimer votre compte à tout moment depuis <Link to="/compte" className="link">Mon compte</Link>.</li>
          <li>Nous pouvons suspendre un compte ou un établissement en cas d’usage frauduleux, abusif ou contraire à la loi, après vous en avoir informé sauf urgence.</li>
        </ul>
      </Section>

      <Section id="etablissements" title="4. Engagements des établissements">
        <ul className="list-disc pl-5 space-y-2">
          <li>Publier des informations exactes : nom, adresse, produits, prix et disponibilités. Les prix affichés engagent l’établissement.</li>
          <li>Respecter la réglementation applicable à son activité, notamment la vente d’alcool aux mineurs.</li>
          <li>Traiter les données de ses clients (prénoms, commandes) uniquement pour le service et sa comptabilité, et répondre à leurs demandes concernant ces données.</li>
          <li>Ne publier que des visuels dont il détient les droits.</li>
        </ul>
      </Section>

      <Section id="clients" title="5. Commandes des clients">
        <ul className="list-disc pl-5 space-y-2">
          <li>Une commande envoyée depuis le menu est transmise à l’établissement, qui reste libre de l’accepter ou de l’annuler (rupture de stock, fermeture…).</li>
          <li>Le prix appliqué est celui affiché au moment de la commande, calculé par BarSafe à partir du menu de l’établissement.</li>
          <li>Toute réclamation sur une commande, un produit ou un paiement se règle avec l’établissement.</li>
          <li>Les envois abusifs (commandes ou appels serveur en rafale) sont automatiquement limités.</li>
        </ul>
      </Section>

      <Section id="responsabilite" title="6. Disponibilité et responsabilité">
        <p>
          Nous faisons le nécessaire pour que BarSafe reste disponible et sécurisé, sans pouvoir garantir une absence totale
          d’interruption (maintenance, panne réseau, prestataires). BarSafe ne remplace pas la comptabilité légale de
          l’établissement : pensez à exporter régulièrement vos ventes (export CSV dans l’espace Direction).
        </p>
        <p>
          Le logiciel, la marque BarSafe et les contenus de la plateforme appartiennent à leur éditeur. Les contenus publiés
          par un établissement (menu, photos) restent sa propriété ; il nous autorise à les afficher pour faire fonctionner le service.
        </p>
      </Section>

      <Section id="droit" title="7. Droit applicable et contact">
        <p>
          Les présentes conditions sont régies par le droit togolais. En cas de différend, une solution amiable sera recherchée
          avant toute action devant les juridictions compétentes de Lomé. Ces conditions peuvent évoluer ; la date de mise à jour
          figure en haut de page.
        </p>
        <p>
          Questions : <a className="link" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Pour vos données personnelles,
          voir la <Link to="/confidentialite" className="link">politique de confidentialité</Link>.
        </p>
      </Section>
    </article>
  </div>
);

export default LegalPage;
