# 🎯 RÉSUMÉ FINAL DE L'ENTRETIEN AVEC JULIETTE

## Contexte général
- **Métier :** Technico-commerciale sédentaire dans une entreprise industrielle qui fabrique des pompes.
- **Rôle :** Répondre aux demandes de devis et commandes (pièces détachées et pompes complètes).
- **Ancienneté de l'entreprise :** ~100 ans, avec des filiales à l'international et une base installée énorme.
- **Infrastructure :** Serveurs sur place (déploiement local, URLs en ".local").

---

## 1. L'inventaire des outils utilisés

| Outil | Fonction | Ce qu'elle en dit |
|-------|----------|-------------------|
| **Outlook** | Réception des demandes clients | Point d'entrée principal. "La majeure partie passe par les emails." |
| **Formulaire site web** | Contact client | Petit formulaire sur le site. "Ils ont configuré ça un peu n'importe comment. C'est Romain qui reçoit tout alors qu'il devrait pas." |
| **CRM "CDM"** | Gestion des comptes, contacts, devis, opportunités | Interface datée, mais elle s'en sert quotidiennement. Peut ajouter des champs/modules personnalisés. |
| **Sper Select** | Nomenclature des pompes | "Pas à jour" — inutilisable pour les pompes trop anciennes. |
| **X3** | Facturation, usine, gestion d'articles | "C'est vraiment l'ERP" — elle ne connaît pas la moitié des fonctionnalités. "Usine à gaz." |
| **SharePoint** | Documents, certificats, déclarations de conformité | Organisation chaotique. "C'est un peu le bordel." |
| **PPS / PCM Selector** | Configuration technique des pompes | Interface séparée du CRM. Utilisée pour les pompes complètes (configurateur). |
| **Bases installées** | Mapping pompes → clients | Outil séparé. "Tu peux pas le faire directement depuis le CRM." |
| **RocWarts** | Gestion des temps, télétravail, congés, badgeage | Outil RH interne. Elle l'utilise pour poser ses congés, déclarer son télétravail, et badger. |
| **ServiceNow (iAm Request)** | Support interne | Utilisé pour : problèmes informatiques, demandes d'accès, requêtes pour le service ingénierie (plans, documentation), et autres demandes internes. Système de tickets. |
| **Teams** | Communication interne | Elle fait des captures d'écran des réponses Teams pour les envoyer par email — besoin de trace écrite. |
| **Serveur de fichiers** | Plans scannés des pompes années 70-80 | "Tu te débrouilles" — organisation manuelle, fichiers mal nommés. |

**Total : 12 outils distincts** pour un seul poste.

---

## 2. Le flux de travail de Juliette

### Étape 1 — Réception de la demande
- Le client envoie un email sur **Outlook**.
- Ou alors il remplit le **formulaire de contact** sur le site web — mais le formulaire est mal configuré (les emails arrivent chez la mauvaise personne).

### Étape 2 — Identification du besoin
- Elle ouvre le **CRM** pour consulter le compte client.
- Elle vérifie les informations : coordonnées, SIRET, historique, remises, conditions de paiement.

### Étape 3 — Recherche de la pièce ou de la pompe
- Si la pompe est récente → elle utilise **Sper Select** pour trouver la nomenclature.
- Si la pompe est ancienne → elle va chercher le scan sur le **serveur de fichiers** ("tu te débrouilles").
- Si c'est une pompe complète → elle utilise le **PCM Selector** (configurateur technique).

### Étape 4 — Création du devis
- Elle retourne dans le **CRM** pour créer l'opportunité et le devis.
- Elle remplit les lignes avec les références trouvées.

### Étape 5 — Validation et suivi
- Elle envoie le devis par email.
- Si la commande est validée, elle est transférée vers **X3** (ERP) pour la facturation.
- Parfois, elle doit mettre à jour la **base installée** (mais c'est un outil séparé).

### Étape 6 — Gestion RH
- Elle utilise **RocWarts** pour :
  - Poser ses congés.
  - Déclarer son télétravail.
  - Badger (pointage).

### Étape 7 — Support interne
- Quand elle a un problème (informatique, accès, demande de plan, ingénierie), elle ouvre un ticket dans **ServiceNow (iAm Request)**.

### Étape 8 — Communication interne
- Elle utilise **Teams** pour communiquer avec ses collègues.
- Elle fait des captures d'écran des réponses Teams pour les envoyer par email ("besoin de trace écrite").

---

## 3. Les problèmes identifiés par Juliette

### Problème 1 — La fragmentation de l'information

> *"Tu recherches la même référence dans différents outils pour avoir différentes informations."*

- Le même numéro de série doit être cherché dans **Sper Select** (nomenclature), dans le **CRM** (client), dans **X3** (stock/facturation), dans **SharePoint** (documents).
- Les outils sont déconnectés.

### Problème 2 — Le travail manuel et les transferts

> *"Il faut que je re sélectionne tout. Ça me prend des années."*

- Elle doit **re-sélectionner manuellement** des lignes ou des articles d'une étape à l'autre.
- Pas de sélection en masse, pas de transfert de contexte entre les outils.

### Problème 3 — Les interfaces datées (usine à gaz)

> *"Les interfaces datent des années 90, un truc de fou."*

- Le CRM est visuellement vieux, mais elle s'en accommode car elle sait où aller.
- **Toi en tant que nouvel observateur :** tu n'y comprends rien. C'est une usine à gaz.

### Problème 4 — L'absence de standardisation des données

> *"Si quelqu'un enregistre un article, il va mettre telle chose dans la description technique et l'autre dans la description seule."*

- Pas de modèle de données unique. Chacun range l'information comme il veut.
- **Complexité réglementaire :** Les champs obligatoires changent selon le pays (France, Export, Russie, etc.). Les utilisateurs sont obligés de fourrer des infos dans des champs prévus pour d'autres contextes.

### Problème 5 — La gestion des SIRET

> *"Des fois il y avait un numéro SIRET en haut et puis un deuxième pour le châssis en bas."*

- Le CRM mélange le **SIRET du siège social** et celui de l'**établissement de livraison**.
- L'interface ne permet pas de distinguer clairement les deux contextes.

### Problème 6 — Les pompes anciennes ne sont pas digitalisées

> *"Les anciennes pompes sont que des photos en fait de documents."*

- Les pompes des années 70-80 n'existent qu'en scan PDF / JPEG.
- Pas de données structurées, impossible à rechercher ou lier automatiquement.

### Problème 7 — La validation qui dépend de qui tu demandes

> *"Si tu demandes à trois personnes différentes comment valider, tu auras trois réponses différentes."*

- Pas de workflow de validation clair.
- Les règles métier sont floues et mal documentées.

### Problème 8 — Le formulaire de contact mal configuré

> *"C'est Romain qui reçoit tout alors qu'il devrait pas."*

- Le formulaire envoie les demandes à la mauvaise personne.
- Pas de routage fiable par région ou par type de demande.

### Problème 9 — Le support interne lent

> *"J'ai contacté le support, ils ont dit qu'ils pouvaient pas rembourser."*

- Support interne via ServiceNow, mais les délais sont longs.
- Pas de visibilité sur l'avancement des tickets.
- Difficulté à obtenir des réponses rapides pour les demandes urgentes.

---

## 4. Ce qu'elle a dit sur l'IA

> *"Sa boîte avait envisagé d'utiliser l'IA pour l'automatisation des devis."*

**Pourquoi ça a échoué :**

1. **Confusion SIRET :** L'IA ne savait pas distinguer le SIRET principal du SIRET secondaire.
2. **Pompes anciennes :** Les données sont des images (scans), pas du texte structuré. L'IA ne pouvait pas les parser.

---

## 5. Ce que j'ai observé en tant qu'observateur extérieur

### 5.1 — Les outils sont des solutions "verticales"

> *"Tous ces outils ont été développés par des boîtes différentes mais qui sont pensées pour répondre aux besoins spécifiques de ce domaine métier."*

Chaque outil est **excellent dans son domaine** :
- Sper Select est fait pour les pompes.
- Le CRM CDM est fait pour le commercial.
- X3 est fait pour la gestion de production.
- RocWarts est fait pour les RH.
- ServiceNow est fait pour le support interne.

Le problème n'est pas la qualité des outils. Le problème est qu'ils **ne communiquent pas entre eux**.

### 5.2 — Le déploiement est local

> *"On a des serveurs sur place, une salle de serveurs juste après mon bureau."*

- URLs en ".local" dans le navigateur.
- Hébergement on-premise, probablement pour des raisons de conformité (ISO 9001, traçabilité).

### 5.3 — L'entreprise est ancienne et complexe

- 100+ ans d'existence.
- Base installée énorme.
- Des pompes des années 70 cohabitent avec des modèles récents.
- Processus non standardisés.
- Plusieurs filiales internationales avec des règles différentes.

---

## 6. Ce que Juliette voudrait (ce qu'elle a dit)

| Besoin | Ce qu'elle a dit |
|--------|------------------|
| Moins d'outils | "Ce serait bien que ce soit plus qu'un seul logiciel." |
| Moins de re-sélection | "Il faut que je re sélectionne tout. Ça me prend des années." |
| Standardisation | "Si quelqu'un enregistre un article, il met des trucs différents." |
| Traçabilité des pompes | "Tu peux pas savoir où sont les pompes." |
| Interface plus moderne | "Les interfaces datent des années 90, un truc de fou." |
| Outil qui marche | "L'essentiel c'est que ça marche." |

---

## 7. Enseignements pour le produit

**Note importante :** Ataqu est un outil **générique B2B SaaS**, pas une solution verticale pour l'industrie des pompes. Ces insights ne sont pas une invitation à pivoter, mais des observations sur les besoins d'une entreprise industrielle.

### 7.1 — Le problème structurel
- La fragmentation des outils est le vrai pain point, pas la qualité des outils eux-mêmes.
- Une solution qui **orchestre** et **connecte** aurait plus de valeur qu'un remplaçant.

### 7.2 — La personnalisation des champs est cruciale
- Les besoins métier varient : un champ obligatoire en France ne l'est pas en Russie.
- Un système de **JSONB + validation contextuelle** serait nécessaire pour ce type d'entreprise.

### 7.3 — La gestion des contextes
- Le même client peut avoir plusieurs SIRET (siège, établissement).
- L'interface doit permettre de distinguer ces contextes.

### 7.4 — Les données historiques non structurées
- Les images/scans sont un vrai frein à la digitalisation.
- Un pipeline OCR + extraction pourrait être un argument de vente pour ce type d'entreprise.

### 7.5 — Le déploiement on-premise
- Certains secteurs industriels ont des contraintes de conformité qui imposent un hébergement local.
- Une option self-hosted pourrait être un argument de vente pour ce type de client.

---

## 8. Conclusion

Juliette est une utilisatrice expérimentée qui a appris à naviguer dans un écosystème complexe de **12 outils**. Elle est productive malgré la fragmentation, mais elle perd du temps à chercher la même information dans plusieurs outils, à re-sélectionner des données, et à gérer des incohérences de données (SIRET, champs par pays).

Les outils métiers qu'elle utilise sont **bons pour leur domaine**, mais **déconnectés**. Une solution horizontale qui les connecterait serait un gain de productivité énorme.

**Pour Ataqu (outil générique B2B SaaS) :** Ces insights montrent l'importance de la **personnalisation des champs**, de la **gestion des contextes**, et de la **recherche unifiée**. Mais ils montrent aussi qu'il ne faut pas sous-estimer la complexité des besoins métier verticaux — Ataqu ne pourra pas répondre à tous les cas d'usage, et c'est OK.
