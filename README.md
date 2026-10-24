# OPTSCH – Spelersenquête 2026

Zelfstandige anonieme enquêtewebsite in de GitHub-repository `Barloss94/optschenquete`.

## Onderdelen

- `index.html` – openbare enquête, 24 vragen, geen login.
- `admin.html` – beveiligd resultatenoverzicht en anonieme CSV-export (bestaande Supabase-adminaccounts).
- Supabase-project: **OPTSCH Ranking** (`lnlaqrljtwrxtfsyotnn`).
- Nieuwe tabellen: `public.optsch_surveys` en `public.optsch_survey_responses`.
- Nieuwe Supabase Edge Function: `optsch-survey`.

Bestaande Ranking-, OSC- en cashgametabellen zijn niet gewijzigd.

## Publiceren

Zet in GitHub onder **Settings > Pages** de branch `main` en de map `/(root)` aan om de statische website te publiceren. Controleer daarna de enquête en de adminpagina.

De enquête staat **standaard op gesloten** (`is_open=false`). Na het testen kan een beheerder de enquête openen met een gerichte databasewijziging:

```sql
update public.optsch_surveys set is_open=true where survey_year=2026;
```

Om de enquête later te sluiten: `is_open=false`.

## Privacy en dubbele inzendingen

Er is geen login op de openbare enquête en er worden geen namen, e-mailadressen, PlayerID's of accountkoppelingen in de enquête opgeslagen. Browseropslag (`localStorage`) voorkomt normale herinzending in dezelfde browser. Dit is **geen sluitende dubbele-inzendingbeveiliging**: een andere browser of een privévenster omzeilt dit.

De resultaten zijn in de database afgeschermd van openbare Data API-toegang; alleen de Edge Function met gecontroleerde adminrechten kan antwoorden uitlezen.

Let op: vrije antwoorden kunnen door de invuller alsnog herkenbare informatie bevatten; controleer de export vóór het delen met derden. Controleer tevens de eventuele infrastructuurlogging en privacyverklaring voordat je absolute anonimiteit toezegt. De publieke API heeft nog geen robuuste rate limiter/CAPTCHA en moet voor grootschalige publicatie op spam- en misbruikbestendigheid worden getest.

## Testchecklist

1. Openbare statusmelding wanneer de enquête gesloten is.
2. Open de enquête en dien één proefinzending in.
3. Controleer de vier overlappende speelactiviteitsperiodes.
4. Controleer maximaal drie keuzes bij prioriteitsvragen.
5. Test dezelfde browser na een succesvolle inzending.
6. Test adminlogin met de bestaande beheerder.
7. Controleer het resultatenoverzicht en de CSV-export in Excel en ChatGPT.
8. Controleer dat publieke bezoekers de antwoorden niet kunnen uitlezen.

## AI-analyse

Geen betaalde AI-API ingebouwd. Download als beheerder de CSV en upload deze indien gewenst in ChatGPT voor een kwalitatieve analyse en een onderzoeksverslag.
