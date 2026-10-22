export type ErrorTone = 'error' | 'warning' | 'info';

/** What the user sees. `hint` is only shown in development. */
export interface FriendlyError {
  title: string;
  message: string;
  tone: ErrorTone;
  /** Postgres / PostgREST code, used by the app to react (e.g. expired session). */
  code?: string;
  hint?: string;
  /** True when retrying the same action can work (network, server hiccup). */
  retryable: boolean;
}

/** Postgres code raised by `_require_session` when the token is unknown or expired. */
export const SESSION_EXPIRED = '28000';

interface RawError {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
  name?: string;
  status?: number;
}

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

const looksLikeNetwork = (e: RawError) =>
  e.name === 'TypeError' || e.name === 'AuthRetryableFetchError' ||
  /failed to fetch|networkerror|network request failed|load failed|fetch failed|ERR_INTERNET/i.test(e.message || '');

/** Messages raised on purpose by our SQL functions are already written for users (French, no jargon). */
const isUserFacing = (msg: string) =>
  msg.length > 0 && msg.length < 160 && !/schema cache|function|relation|column|syntax|violates|null value|uuid|PGRST|JWT/i.test(msg);

export const toFriendlyError = (err: unknown): FriendlyError => {
  const e: RawError = (typeof err === 'object' && err !== null ? err : { message: String(err) }) as RawError;
  const msg = (e.message || '').trim();
  const code = e.code;

  if (isOffline() || looksLikeNetwork(e)) {
    return {
      title: 'Pas de connexion',
      message: 'Impossible de joindre le serveur. Vérifiez votre connexion internet puis réessayez.',
      tone: 'warning', code, retryable: true,
    };
  }

  switch (code) {
    // ---- Supabase Auth (accounts) ----
    case 'invalid_credentials':
      return { title: 'Identifiants incorrects', message: 'L’e-mail ou le mot de passe ne correspond pas. Vérifiez-les ou réinitialisez votre mot de passe.', tone: 'error', code, retryable: false };
    case 'email_not_confirmed':
      return { title: 'E-mail à confirmer', message: 'Ouvrez le lien reçu par e-mail pour activer votre compte, puis reconnectez-vous.', tone: 'info', code, retryable: false };
    case 'user_already_exists':
    case 'email_exists':
      return { title: 'Compte existant', message: 'Un compte utilise déjà cet e-mail. Connectez-vous ou réinitialisez votre mot de passe.', tone: 'info', code, retryable: false };
    case 'weak_password':
      return { title: 'Mot de passe trop faible', message: 'Utilisez au moins 8 caractères, avec des lettres et des chiffres.', tone: 'error', code, retryable: false };
    case 'email_address_invalid':
    case 'validation_failed':
      return { title: 'E-mail invalide', message: 'Vérifiez l’adresse e-mail saisie.', tone: 'error', code, retryable: false };
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
    case 'over_sms_send_rate_limit':
      return { title: 'Un instant', message: 'Trop de demandes rapprochées. Réessayez dans quelques minutes.', tone: 'warning', code, retryable: false };
    case 'signup_disabled':
    case 'email_provider_disabled':
      return { title: 'Inscriptions fermées', message: 'La création de compte est momentanément désactivée.', tone: 'warning', code, retryable: false, hint: msg };
    case 'session_expired':
    case 'session_not_found':
    case 'refresh_token_not_found':
      return { title: 'Session expirée', message: 'Reconnectez-vous à votre compte.', tone: 'info', code, retryable: false };

    case 'PGRST202': // RPC missing from the schema cache
    case '42883':    // undefined function
    case 'PGRST205': // table missing
    case '42P01':
      return {
        title: 'Service en cours de mise à jour',
        message: 'Cette fonctionnalité n’est pas encore disponible sur le serveur. Réessayez dans quelques minutes.',
        tone: 'warning', code, retryable: true,
        hint: 'La base Supabase n’est pas à jour : exécutez supabase/APPLY_PRODUCTION.sql dans le SQL Editor.',
      };
    case SESSION_EXPIRED:
      return { title: 'Session expirée', message: 'Par sécurité, reconnectez-vous avec votre code d’accès.', tone: 'info', code, retryable: false };
    case '42501':
      return { title: 'Action non autorisée', message: isUserFacing(msg) ? msg : 'Votre espace ne permet pas cette action.', tone: 'error', code, retryable: false };
    case '54000':
      return { title: 'Un instant', message: isUserFacing(msg) ? msg : 'Trop de demandes rapprochées. Patientez un peu.', tone: 'warning', code, retryable: false };
    case '23514': // check constraint
    case '23502': // not null
    case '22P02': // invalid input (bad uuid, bad number)
    case '22003': // numeric out of range
      return { title: 'Donnée invalide', message: 'Une valeur saisie n’est pas acceptée. Vérifiez le formulaire.', tone: 'error', code, retryable: false, hint: msg };
    case '23505':
      return { title: 'Déjà existant', message: 'Cet élément existe déjà.', tone: 'error', code, retryable: false };
    case 'PGRST301':
    case 'PGRST302':
      return { title: 'Accès refusé par le serveur', message: 'La configuration de l’application est invalide. Contactez le support.', tone: 'error', code, retryable: false, hint: msg };
    case 'P0001': // RAISE EXCEPTION from our functions: business rule, message is for the user
      return { title: 'Action impossible', message: isUserFacing(msg) ? msg : 'Cette action n’a pas pu aboutir.', tone: 'error', code, retryable: false };
  }

  if ((e.status ?? 0) >= 500 || /^5\d\d$/.test(code || '')) {
    return { title: 'Serveur indisponible', message: 'Le service rencontre un problème temporaire. Réessayez dans un instant.', tone: 'warning', code, retryable: true, hint: msg };
  }

  return {
    title: 'Une erreur est survenue',
    message: isUserFacing(msg) ? msg : 'L’action n’a pas pu aboutir. Réessayez, et si le problème persiste contactez le support.',
    tone: 'error', code, retryable: true, hint: msg,
  };
};
