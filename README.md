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

## Proefmodus voor beheerders

De echte enquête blijft gesloten zolang `is_open=false`. Om te testen:

1. Log in op `admin.html` met het bestaande Ranking-beheerdersaccount.
2. Klik op **Open proefenquête (alleen beheerders)**.
3. Vul de vragen in en kies **Proefantwoord insturen**.
4. Ga terug naar beheer en kies **Testresultaten**.
5. Download eventueel de test-CSV.
6. Kies **Testresultaten wissen** wanneer je klaar bent.

De proefmodus vraagt een geldige Supabase-sessie van een gebruiker met rol `admin` en bewaart antwoorden uitsluitend in `public.optsch_survey_test_responses`. Deze proefantwoorden zijn gescheiden van de officiële enquêteresultaten en stellen geen browserblokkade in. Openbare deelnemers kunnen de proefmodus niet gebruiken.

De URL-queryparameter `preview=1` op zichzelf geeft **geen toegang** tot de proefmodus: de Edge Function controleert de ingelogde beheerder aan serverzijde. Een volledig end-to-end praktijkonderzoek met een echt beheerdersaccount is nog nodig voordat het systeem publiek wordt geopend.

## Moderatie van persoonlijke aanvallen

De enquête is bedoeld voor constructieve feedback over OPTSCH als geheel, niet voor het beledigen of zwartmaken van afzonderlijke spelers. Deze huisregel staat ook op de openbare enquêtepagina.

- Bij een nieuwe inzending controleert de Edge Function alleen de open tekstvelden op **signalen** zoals gerichte scheldwoorden, persoonlijke beschuldigingen en mogelijke naamvermeldingen.
- Gemarkeerde vraagantwoorden gaan naar een wachtrij. Zolang ze niet beoordeeld zijn, worden ze **niet opgenomen** in statistieken of de normale CSV-export.
- In `admin.html` opent **Controleer open antwoorden** het moderatieoverzicht. Beheerders kiezen per antwoord **Toch meenemen** (toelaatbaar) of **Uitsluiten** (persoonlijke aanval).
- Een uitsluiting geldt **per vraagantwoord**, niet automatisch voor de hele inzending. Andere antwoorden blijven behouden.
- Beheerders kunnen ook niet-gemarkeerde antwoorden controleren; automatische herkenning is niet volledig en kan zowel iets missen als onschuldige kritiek markeren.
- De beveiligde reviewinterface toont de oorspronkelijke tekst; normale rapportages en CSV's tonen alleen goedgekeurde of niet-gemarkeerde antwoorden.
- Geen betaalde AI-dienst nodig: het huidige systeem gebruikt transparante tekstherkenning met vaste patronen. Pas op voor fout-positieven en gemiste beledigingen, en controleer alle vrije reacties handmatig vóór externe rapportage.


## Automatisch bijgewerkte namencontrole

De vragen met vrije tekst worden door de server automatisch gescand op mogelijke persoonlijke aanvallen en herkenbare spelersnamen. De namenlijst wordt **niet handmatig gesynchroniseerd**: bij iedere nieuwe inzending en iedere resultatenopvraag haalt de `optsch-survey` Edge Function de actuele naamvelden rechtstreeks op uit `public.players` (`name`, `preferred_name`), `public.player_aliases` (`alias_name`) en eventuele aanvullende namen in `public.optsch_survey_name_blacklist`. Hierdoor worden nieuwe Ranking-spelers en aliassen meteen bij volgende controles meegenomen.

De spelersnamen worden uitsluitend in het tijdelijke servergeheugen gebruikt, nooit met de openbare website gedeeld of aan PlayerID/ingezonden antwoorden gekoppeld. In `auto_flags` worden alleen neutrale signalen opgeslagen, bijvoorbeeld ‘Mogelijke vermelding van spelersnaam of alias’, zonder de gematchte naam.

Het systeem markeert een naamvermelding voor handmatige beoordeling; een naam noemen is niet per definitie kwetsend. Het kan soms ook gewone Nederlandse woorden markeren. De beheerder beoordeelt daarom de context. Ook uitsluitingen gelden per open antwoord en niet per volledige enquête.


## Adaptieve vervolgvragen (24 basisvragen + 11 optionele vervolgvragen)

Het formulier toont extra open vragen direct na een relevante basisvraag. De hoofdvragen blijven voor alle deelnemers gelijk; de vervolgvragen verschijnen alleen wanneer het betreffende antwoord is geselecteerd. De vervolgvragen zijn optioneel.

| Vervolgvraag | Geactiveerd door |
| --- | --- |
| q25 – Vaker deelnemen | q5: minder vaak, gestopt, wisselend of niet gespeeld |
| q26 – Andere speeldagen / begintijden | q7: speeldagen of aanvangstijden |
| q27 – Kosten / inleg | q7: kosten of inleg |
| q28 – Problemen met de pokerapp | q7: pokerapp |
| q29 – Algemene verbeterprioriteit | q8: tevredenheid 1 of 2 |
| q30 – Sfeerverbetering | q10: negatief of zeer negatief |
| q31 – Transparantie en regels | q12: eerlijkheid/transparantie of regels |
| q32 – Onduidelijke regels | q14: wisselend of vaak onduidelijk/oneerlijk |
| q33 – Ontbrekende communicatie | q16: tevredenheid 1 of 2 |
| q34 – Betere inspraak | q18: meestal niet of nee |
| q35 – Gewenste spelvariant / evenement | q21: een van de genoemde varianten, toernooivormen, speciale evenementen of teamactiviteiten |

Verandert het antwoord op een basisvraag, dan verdwijnt een niet-relevante vervolgvraag en wordt de tekst gewist. De website verstuurt alleen relevante, daadwerkelijk ingevulde vervolgvragen. De Edge Function weigert antwoorden op verborgen (niet-geactiveerde) vervolgvragen. Het JSON-opslagmodel hoeft niet aangepast te worden. Het beheer en de CSV-export ondersteunen vaste kolommen **q1 t/m q35**; alleen weergegeven/ingevulde vervolgvragen krijgen een antwoord. Ook deze open antwoorden vallen onder automatische namencontrole en menselijke moderatie.

### Controle

De voorwaarden zijn op 11 scenario's getest, waaronder meerdere keuzes tegelijk en geen toepasselijke vervolgvragen. JavaScript-syntax van de website en beheerpagina is gecontroleerd. De serverfunctie is gedeployed naar Supabase; een end-to-end praktijktest met een beheerdersinzending blijft nodig. De publieke enquête staat nog gesloten.
