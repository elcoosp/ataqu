# 📊 AEGIS – Analyse détaillée des concurrents (1Password, Okta, Auth0, CyberArk, Dashlane)

## 🔍 Constat général

Les **4 concurrents majeurs** de l'identité et de la sécurité ont des notes catastrophiques sur Trustpilot :

| Concurrent | Note | Nb avis | Principales plaintes |
|------------|------|---------|---------------------|
| **Okta** | ⭐ 1.3 | 50 | Usabilité exécrable, sessions interminables, support inexistant |
| **Auth0** | ⭐ 2.7 | 7 | Hausses de prix ×10, support devenu un labyrinthe, facturation opaque |
| **CyberArk** | ⭐ 3.1 | 2 | Verrouillage des téléphones personnels, impossible à désinstaller |
| **1Password** | ⭐ 4.2 | 12 429 | Majoration 30% sans préavis, sync capricieuse, support lent |

Le constat est **sans appel** : le secteur est un **désastre en termes d'expérience client**. Les utilisateurs sont **prisonniers** de solutions qui les verrouillent, les surfacturent, et les ignorent.

---

## 🚨 CE QUE LES UTILISATEURS DÉTESTENT (À ÉVITER ABSOLUMENT)

### 1. La vente forcée et les augmentations abusives

**Okta** : "Mon entreprise utilise Okta comme portail. Ça ne vous dit pas mais vous ne pouvez pas vous connecter sur plusieurs appareils à la fois."

**Auth0** : "Augmentation de 1000% du coût après 18 mois pour utiliser MFA. Ils ont délibérément attendu qu'on utilise la fonction pour nous forcer à payer."

**1Password** : "Une augmentation de presque 30% est scandaleuse."

**Dashlane** : "Renouvellement automatique refusé malgré 29 jours de préavis. Nous avons dû payer un an supplémentaire."

---

### 2. L'enfer du support client (ou son absence)

**Okta** : "Contacté 8 personnes différentes, personne n'a pu aider à résilier mon abonnement. 7 semaines et toujours pas de résultat."

**Auth0** : "Nous avons trouvé un bug, 9 mois plus tard et ils refusent de le corriger. Passé entre 10 personnes différentes."

**CyberArk** : "Le support ne supporte pas les utilisateurs finaux. Ils nous renvoient vers les équipes IT qui ne peuvent rien faire non plus."

**1Password** : "Le support est lent. J'ai attendu plusieurs jours pour une réponse."

**Dashlane** : "Le bot dit 'les remboursements sont traités pour les plans actifs'. Mon plan n'est plus actif, donc je ne peux parler à personne."

---

### 3. L'UX catastrophique qui fait perdre du temps

**Okta** : "Se connecter, se déconnecter, se faire verrouiller. Si vous changez d'appareil, dites adieu à votre journée."

**Okta** : "Je me connecte 23 fois par jour et j'ai 9 pop-ups à chaque fois."

**Okta** : "La session expire sans cesse. Vous êtes en train de configurer quelque chose, BAM, déconnecté."

**Auth0** : "Après 4 heures à essayer de comprendre pourquoi ça renvoie des erreurs login_required sans plus de détails, j'ai abandonné."

**CyberArk** : "Interface graphique horrible, sans filtres. Vos employés perdent la moitié de leur temps avec des procédures de sécurité absurdes."

**Dashlane** : "L'autofill ne fonctionne plus dans Chrome. Le pop-up apparaît une fraction de seconde puis disparaît."

---

### 4. Le verrouillage total (impossible de partir)

**CyberArk** : (Le pire) "J'ai quitté mon entreprise, je veux désinstaller CyberArk de mon téléphone personnel. Désinstallation désactivée. Factory reset désactivé. Mon téléphone est devenu une brique."

**Okta** : "Je ne peux pas annuler mon abonnement car je n'ai pas les permissions pour créer un ticket dans le portail. Et le support ne répond pas."

**Dashlane** : "Annuler le compte ne résilie pas l'abonnement. Je l'ai appris à mes dépens 2 ans plus tard."

**1Password** : "Configuration d'un compte famille impossible sur iOS avec Gmail. Le code secret ne s'enregistre pas et un compte fantôme reste 30 jours sans pouvoir le supprimer."

---

### 5. Les pratiques commerciales douteuses

**Okta** : "On m'a promis un set de café en échange d'une réunion. J'ai fait la réunion, plus de nouvelles. Aucune communication."

**Okta** : "Je reçois des emails spams d'Okta. J'ai contacté le CEO, pas de réponse, mais 4 emails spam supplémentaires."

**Auth0** : "Pratiques commerciales déraisonnables. Les fonctionnalités entreprise sont prohibitivement chères. Depuis le rachat par Okta, c'est devenu un labyrinthe."

**Dashlane** : "J'ai demandé la suppression de mes données (mots de passe, infos de paiement). Leur réponse : 'Laissez votre abonnement se renouveler pour un an supplémentaire, et là vous pourrez supprimer votre compte.'"

---

## ✅ CE QUE LES UTILISATEURS VEULENT (À IMPLÉMENTER IMPÉRATIVEMENT)

### 1. Une UI/UX simple et intuitive

| Ce qu'ils veulent | Ce que les concurrents font mal |
|-------------------|--------------------------------|
| Se connecter en 1 clic | Okta demande 2FA toutes les 5 minutes |
| Interface épurée | CyberArk est une usine à gaz |
| Pas de pop-ups intempestives | Dashlane insère des pop-ups partout |
| Navigation fluide | L'UI d'Okta est un labyrinthe |

**Ce que doit faire AEGIS** : Une interface minimaliste, une seule page pour gérer tous les comptes, zéro friction.

---

### 2. Un support humain, rapide et efficace

| Ce qu'ils veulent | Ce que les concurrents font mal |
|-------------------|--------------------------------|
| Réponse en <24h | 1Password : "plus d'un mois pour répondre" |
| Support accessible | Dashlane : "le chat est réservé aux clients premium" |
| Des humains, pas des bots | Auth0 : "passé entre 10 personnes différentes" |
| Résolution rapide | CyberArk : "support incapable de désinstaller leur propre logiciel" |

**Ce que doit faire AEGIS** : Support email humain, SLA 24h, chatbot UNIQUEMENT en complément, jamais en remplacement.

---

### 3. Une facturation transparente et éthique

| Ce qu'ils veulent | Ce que les concurrents font mal |
|-------------------|--------------------------------|
| Prix fixes, pas de surprises | Auth0 : +1000% du prix en 18 mois |
| Résiliation en 1 clic | Dashlane : 30 jours de préavis requis |
| Pas de renouvellement automatique caché | 1Password : augmentation de 30% sans préavis |
| Pas de "bait and switch" | Auth0 : "ça marchait bien pendant 18 mois, puis ils ont changé les règles" |

**Ce que doit faire AEGIS** : 3$/mois fixe, résiliation en 1 clic, préavis de 30 jours pour TOUT changement, pas d'augmentation sans prévenir 3 mois à l'avance.

---

### 4. Une sécurité qui ne verrouille pas les utilisateurs

| Ce qu'ils veulent | Ce que les concurrents font mal |
|-------------------|--------------------------------|
| Pouvoir désinstaller | CyberArk : rend votre téléphone inutilisable |
| Ne pas être prisonnier | Dashlane : ne peut pas supprimer son compte |
| App alternatifs autorisés | Okta : impose son propre authenticator |
| Contrôle sur ses données | Dashlane : "gardez votre abonnement actif, on vous supprimera vos données après" |

**Ce que doit faire AEGIS** : Désinstallation en 1 clic, export de toutes les données en CSV/JSON, aucun lock-in, authenticator compatible avec Google Authenticator/Authy.

---

### 5. Des fonctionnalités qui marchent

| Ce qu'ils veulent | Ce que les concurrents font mal |
|-------------------|--------------------------------|
| Sync fiable | 1Password : sync cassée pendant 2 jours |
| MFA qui fonctionne | Dashlane : MFA ne marche pas sans internet (même les codes de recovery !) |
| Auto-fill qui remplit | Dashlane : auto-fill qui clignote et disparaît |
| Pas de bug critiques | Auth0 : bug critique non résolu depuis 9 mois |

**Ce que doit faire AEGIS** : Rust pour la fiabilité, tests automatisés en continu, hotfix en <24h.

---

## 🎯 FEATURES OBLIGATOIRES POUR AEGIS (À IMPLÉMENTER)

### Must-have (v1)

| Feature | Pourquoi c'est critique |
|---------|------------------------|
| **SSO unique** | La promesse "une connexion pour toute la suite" |
| **MFA** | Concurrents : MFA payant chez Auth0, bugué chez Dashlane |
| **Gestion de mots de passe** | 1Password en fait son cœur de métier |
| **Partage sécurisé** | 1Password : le partage est "aléatoire" selon les utilisateurs |
| **Export en 1 clic** | Urgent : les utilisateurs veulent pouvoir sortir |
| **Résiliation immédiate** | Dashlane : annulation impossible, 30 jours de préavis |
| **Pas de lock-in** | CyberArk : verrouille les téléphones |

### Nice-to-have (v2)

| Feature | Concurrence |
|---------|-------------|
| **Vault partagé familial** | 1Password : le fait, mais mal |
| **Autofill intelligent** | Dashlane : ne fonctionne plus sous Chrome |
| **Authenticator intégré** | Okta : impose le sien, les utilisateurs détestent |
| **Audit de sécurité** | 1Password : fait un audit basique |

---

## 🚫 CE QU'IL FAUT ABSOLUMENT ÉVITER (Répété par les utilisateurs)

| Comportement interdit | Exemple chez les concurrents |
|-----------------------|------------------------------|
| Verrouiller les utilisateurs | CyberArk : téléphone en brique, pas de désinstallation |
| Augmenter les prix sans prévenir | Auth0 : +1000% en 18 mois, 1Password : +30% |
| Rendre la résiliation impossible | Dashlane : 30 jours de préavis, Okta : pas de permissions |
| Ignorer le support | Okta : 7 semaines sans réponse |
| Bots à la place des humains | Dashlane : "le chat est pour les clients premium" |
| Forcer l'utilisation d'apps propriétaires | Okta : authenticator imposé |

---

## 💎 STRATÉGIE POUR AEGIS

### 1. Positionnement

> "La sécurité de toute votre suite en un clic. Pas de prise de tête, pas de lock-in, pas d'augmentation surprise. Le SSO qui respecte ses utilisateurs."

### 2. Différenciation clé

| Aspect | Concurrents | AEGIS |
|--------|-------------|-------|
| **Prix** | 15-30$/mois (ou +1000%) | **3$/mois** |
| **Support** | Labyrinthe, bots, délais >1 mois | **Support humain, 24h** |
| **Résiliation** | 30 jours de préavis, impossible souvent | **1 clic** |
| **Lock-in** | Total (CyberArk : brique) | **Export/Sortie en 1 clic** |
| **MFA** | Payant (Auth0) ou bugué (Dashlane) | **Inclus et fiable** |
| **Authenticator** | Imposé (Okta) | **Compatibilité totale** |
| **Prix** | Augmentations surprises | **Transparent, jamais** |

### 3. Promesses à tenir

✅ **"AEGIS ne vous verrouillera jamais."** → Export, désinstallation, résiliation en 1 clic.

✅ **"AEGIS ne vous augmentera jamais sans prévenir."** → 30 jours de préavis légal, engagement écrit.

✅ **"AEGIS vous répondra en moins de 24h."** → Support humain, pas de bots.

✅ **"AEGIS est compatible avec tous vos outils."** → Authenticator Google/Authy, export standard.

---

## 📊 TABLEAU RÉCAPITULATIF PRIORITAIRE

| Priorité | Action | Contexte |
|----------|--------|----------|
| 🔴 P0 | Support humain, SLA 24h | Tous les concurrents échouent ici |
| 🔴 P0 | Résiliation en 1 clic | Dashlane/Okta/Auth0 : cauchemar |
| 🔴 P0 | Export des données | Les utilisateurs veulent contrôler leurs données |
| 🔴 P0 | Pas de lock-in | CyberArk : le pire exemple, à l'inverse |
| 🟠 P1 | SSO unique | Promesse de la suite, clé de vente |
| 🟠 P1 | MFA inclus et fiable | Auth0 : payant, Dashlane : bugué |
| 🟠 P1 | UI/UX minimaliste | Okta : labyrinthe, CyberArk : interface des années 90 |
| 🟡 P2 | Autofill intelligente | Dashlane : ne fonctionne plus |
| 🟡 P2 | Authenticator compatible | Okta : force le sien |
| 🟢 P3 | Vault partagé | 1Password : fonctionne mais mal |

---

## 🏆 BONUS : CE QUE VOS CONCURRENTS FONT BIEN (mais que vous pouvez améliorer)

**1Password** (4.2/5) :
- ✅ Fiabilité (quand ça marche)
- ✅ Intégration Apple
- ✅ Interface intuitive (en général)
- ❌ Mais : prix, support lent, sync capricieuse

**Okta/Auth0/CyberArk** : **rien** (notes 1.3 à 3.1).

---

## 🎯 PLAN D'ACTION POUR AEGIS

1. **Semaine 1-2** : MVP avec SSO de base + MFA (TOTP)
2. **Semaine 3** : Support email (humain) + gestion des mots de passe
3. **Semaine 4** : Export/import + résiliation en 1 clic
4. **Lancement** : Prix 3$/mois (le plus bas du marché)
5. **Acquisition** : Pipeline automatisé (répondre aux questions sur Reddit/HN)

---

*Fin de l'analyse AEGIS.*
