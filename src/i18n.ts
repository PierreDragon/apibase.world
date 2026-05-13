const translations = {
  en: {
    // Login
    signin_subtitle:    'Sign in to your APIBASE node',
    token_subtitle:     'Choose your token and base',
    auth_failed:        'Authentication failed.',
    server_unreachable: 'Unable to reach the server.',
    field_host:         'APIBASE Host',
    field_username:     'Username',
    field_password:     'Password',
    signing_in:         'Signing in…',
    continue:           'Continue →',
    unlabelled_token:   'Unlabelled token',
    back:               '← Back',
    open_nql:           'Open NQL →',
    // NQL
    clear:              'Clear',
    sign_out:           'Sign out',
    ask_title:          'Ask a question',
    ask_subtitle:       'NQL translates your request into a precise APIBASE operation on',
    ask_placeholder:    'Ask a question in natural language…',
    enter_hint:         'Enter to send · Shift+Enter for new line',
    suggestion_1:       'Who are my top 5 customers this month?',
    suggestion_2:       'How many orders are pending?',
    suggestion_3:       'Mark order #1042 as shipped.',
    // Input (mobile)
    mobile_mode:        'Mobile mode',
    mobile_placeholder: 'Ask your question…',
    sending:            'Sending…',
    send:               'Send →',
    error_generic:      'An error occurred.',
    displayed_plasma:   '✓ Displayed on plasma',
    // Display
    waiting:            'Waiting for an NQL query…',
    scan_hint:          'Scan to enter from your phone',
  },
  fr: {
    // Login
    signin_subtitle:    'Connectez-vous à votre node APIBASE',
    token_subtitle:     'Choisissez votre token et votre base',
    auth_failed:        'Authentification échouée.',
    server_unreachable: 'Impossible de joindre le serveur.',
    field_host:         'Hôte APIBASE',
    field_username:     'Identifiant',
    field_password:     'Mot de passe',
    signing_in:         'Connexion…',
    continue:           'Continuer →',
    unlabelled_token:   'Token sans label',
    back:               '← Retour',
    open_nql:           'Accéder à NQL →',
    // NQL
    clear:              'Effacer',
    sign_out:           'Déconnexion',
    ask_title:          'Posez votre question',
    ask_subtitle:       'NQL traduit votre demande en une opération APIBASE précise sur',
    ask_placeholder:    'Posez votre question en langage naturel…',
    enter_hint:         'Entrée pour envoyer · Maj+Entrée pour nouvelle ligne',
    suggestion_1:       'Quels sont mes 5 meilleurs clients ce mois-ci ?',
    suggestion_2:       'Combien de commandes sont en attente ?',
    suggestion_3:       'Marque la commande #1042 comme expédiée.',
    // Input (mobile)
    mobile_mode:        'Mode mobile',
    mobile_placeholder: 'Posez votre question…',
    sending:            'Envoi…',
    send:               'Envoyer →',
    error_generic:      'Une erreur s\'est produite.',
    displayed_plasma:   '✓ Affiché sur le plasma',
    // Display
    waiting:            'En attente d\'une requête NQL…',
    scan_hint:          'Scanner pour saisir depuis le téléphone',
  },
}

type Lang = keyof typeof translations
type Key  = keyof typeof translations.en

export function t(key: Key): string {
  const lang = (sessionStorage.getItem('nql_lang') ?? 'en') as Lang
  return translations[lang]?.[key] ?? translations.en[key]
}
