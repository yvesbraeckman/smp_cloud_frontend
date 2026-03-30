# Smart Parcel Wall - Cloud Frontend 

Welkom bij het Cloud Dashboard van het **Smart Parcel Wall** project. Dit is de beheeromgeving (frontend) waarmee beheerders de slimme pakketmuren kunnen monitoren, configureren en bedienen via een intuïtieve, Apple-geïnspireerde interface.

Dit project is naadloos gekoppeld aan de [Smart Parcel Wall Backend](https://github.com/yvesbraeckman/smp_cloud_backend) en functioneert als de besturingslaag voor de Digital Twin architectuur.

## Kernfuncties & Pagina's

* **Authenticatie:** Beveiligde login (`login`), wachtwoord reset (`reset-password`), en route-beveiliging via Angular Guards en HTTP Interceptors.
* **Fleet Overview:** Real-time overzicht van bezettingsgraden, actieve pakketten, en offline/online statussen van alle aangesloten kluiswanden.
* **Wall Detail:** Dynamische grid-weergave van specifieke kluiswanden met remote control functies (Geforceerd openen, Onderhoudsmodus).
* **Bewonersbeheer (Residents):** Overzicht en beheer van alle bewoners die gekoppeld zijn aan de kluiswanden.
* **Audit Logs:** Systeemlogboek voor het traceren van hardware-events (alarms), leveringen, ophalingen en beheerder-acties.
* **Instellingen:** Beheerdersinstellingen en profielbeheer.

## Tech Stack

* **Framework:** Angular 21 (Volledig Standalone Components)
* **Styling:** SCSS (Custom Apple-design system, centraal via `styles.scss`)
* **State & Data:** RxJS (~7.8.0)
* **Testing:** Vitest & JSDOM (Snelle, moderne unit testing)
* **Formatting:** Prettier

## Projectstructuur

De frontend maakt gebruik van een modulaire "pages" en "services" architectuur:

```text
src/app/
├── app.config.ts & app.routes.ts # Standalone app bootstrapping & routing
├── guards/
│   └── auth.guard.ts             # Beschermt routes tegen onbevoegde toegang
├── interceptors/
│   └── auth.interceptor.ts       # Voegt automatisch JWT/Auth tokens toe aan API calls
├── models/
│   └── fleet.model.ts            # Gedeelde TypeScript interfaces (Wall, Locker, etc.)
├── pages/                        # Smart Components / Pagina's
│   ├── fleet-overview/           # Hoofddashboard (KPI's & Locaties)
│   ├── login/                    # Login pagina
│   ├── logs-comp/                # Systeemlogboek / Audit trail
│   ├── not-found/                # Custom 404 pagina
│   ├── reset-password/           # Wachtwoord herstel
│   ├── residents-comp/           # Bewoners overzicht
│   ├── settings-comp/            # Admin instellingen
│   ├── sidebar/                  # Hoofdnavigatie
│   └── wall-detail-comp/         # Specifieke kluiswand bediening
└── services/
    ├── auth.ts                   # Login state & sessie beheer
    └── fleet.ts                  # API communicatie met FastAPI backend