# Ricordi dal cuore — Italia ↔ Canada

Sito privato per raccogliere lettere scritte a mano, trascrizioni digitali e lettura vocale.

## Funzioni incluse

- Accesso senza registrazione tramite un solo codice/data.
- Codice predefinito locale: `17/07/2008`.
- Protezione lato server di testi e immagini.
- Elenco delle lettere con nome, titolo e anteprima.
- Scheda con scansione/foto della lettera e testo digitale.
- Lettura vocale in italiano con pausa, arresto e velocità regolabile.
- Modalità lettura con caratteri e spaziatura più adatti alla dislessia.
- Grafica responsive per telefono, tablet e computer.
- Tema Italia–Canada con foglie d'acero originali, senza immagini esterne.

## Struttura delle cartelle

```text
ricordi-canada-site/
├─ data/
│  └─ letters.json              ← qui scrivi titoli e testi
├─ private/
│  ├─ app.html
│  └─ images/                   ← qui metti foto/scansioni delle lettere
├─ public/
│  ├─ app.js
│  ├─ login.html
│  ├─ login.js
│  └─ styles.css
├─ .env.example
├─ .gitignore
├─ package.json
├─ render.yaml
└─ server.js
```

## Come inserire le tue lettere

### 1. Metti l'immagine nella cartella giusta

Copia la foto o la scansione dentro:

```text
private/images/
```

Formati consigliati: `.jpg`, `.jpeg`, `.png` o `.webp`.

Usa nomi semplici, per esempio:

```text
lettera-martina.jpg
lettera-andrea.png
```

Evita spazi e caratteri accentati nel nome del file.

### 2. Modifica `data/letters.json`

Ogni lettera ha questa forma:

```json
{
  "id": "martina",
  "title": "Aprila quando ti mancherà casa",
  "author": "Lettera di Martina",
  "date": "17 luglio 2026",
  "image": "lettera-martina.jpg",
  "imageAlt": "Lettera scritta a mano da Martina",
  "preview": "Una breve frase che si vede nell'elenco.",
  "text": "Cara amica,\n\nqui inserisci tutto il testo digitale della lettera.\n\nUn abbraccio,\nMartina"
}
```

Per aggiungere un'altra lettera, inserisci una virgola dopo la precedente e incolla un altro blocco prima della parentesi `]` finale.

Regole importanti:

- Ogni `id` deve essere diverso.
- Il valore di `image` deve essere identico al nome del file nella cartella `private/images`.
- Nel testo usa `\n` per andare a capo e `\n\n` per lasciare una riga vuota.
- Se scrivi virgolette dentro il testo, usa `\"`.
- Non lasciare una virgola dopo l'ultima lettera dell'elenco.

## Prova sul computer Windows

1. Installa Node.js 20 o superiore.
2. Apri la cartella del progetto.
3. Fai doppio clic su `AVVIA_IN_LOCALE.bat`, oppure apri PowerShell nella cartella ed esegui:

```powershell
npm install
npm start
```

4. Apri nel browser:

```text
http://localhost:3000
```

Il codice locale predefinito è `17/07/2008`.

## Pubblicazione su Render

Questo progetto deve essere pubblicato come **Web Service**, non come Static Site, perché il controllo del codice avviene sul server.

### Metodo consigliato: GitHub + Render

1. Estrai lo ZIP.
2. Modifica immagini e `data/letters.json`.
3. Crea un repository GitHub e carica dentro tutti i file della cartella.
4. Su Render scegli **New → Web Service**.
5. Collega il repository GitHub.
6. Imposta:

```text
Language: Node
Build Command: npm install
Start Command: npm start
Health Check Path: /health
```

7. Nella sezione **Environment** aggiungi:

```text
ACCESS_CODE = 17/07/2008
NODE_ENV = production
SESSION_SECRET = una-frase-molto-lunga-casuale-e-segreta
```

`SESSION_SECRET` non è il codice di accesso: serve a firmare il cookie. Usa almeno 32 caratteri casuali e non pubblicarla nel repository.

> Nota: con l’istanza gratuita Render il servizio può andare in pausa dopo 15 minuti senza visite. La prima apertura successiva può richiedere circa un minuto. Le immagini devono restare nel repository: non caricarle direttamente nel filesystem temporaneo del servizio.

### Metodo Blueprint

Nel progetto è già incluso `render.yaml`. Creando un Blueprint da questo repository, Render legge automaticamente build, avvio e health check. Durante la configurazione devi indicare `ACCESS_CODE`; `SESSION_SECRET` viene generata automaticamente.

## Cambiare il codice di accesso

Su Render apri il servizio, vai in **Environment** e cambia:

```text
ACCESS_CODE
```

Dopo il salvataggio Render avvierà un nuovo deploy. Non devi modificare il codice sorgente e i vecchi cookie di accesso non saranno più validi.

## Privacy e limiti

- Le lettere e le immagini sono protette dalle route del server e non vengono servite direttamente come file pubblici.
- Il cookie di accesso dura 30 giorni ed è `HttpOnly`.
- Dopo 10 codici errati dallo stesso indirizzo IP, l'accesso viene bloccato per circa 15 minuti.
- È comunque un sito con una password condivisa: chi conosce il codice può entrare. Non usare questa soluzione per documenti riservati o dati sensibili.
- La qualità della voce dipende dalle voci installate nel browser, telefono o computer.

## Personalizzazione grafica rapida

Nel file `public/styles.css`, all'inizio trovi i colori principali:

```css
--red-700: #a82033;
--cream: #fbf6ec;
--paper: #fffdf8;
```

Puoi cambiare titolo e frasi introduttive modificando:

```text
public/login.html
private/app.html
```

## Album fotografici divisi per persona

La nuova sezione **Le nostre foto** legge i gruppi da:

```text
data/photos.json
```

Le fotografie vanno nelle cartelle:

```text
private/photos/ilaria/
private/photos/sofia/
```

Ogni persona ha un blocco nel JSON. Esempio:

```json
{
  "id": "ilaria",
  "name": "Ilaria",
  "description": "Tutti i ricordi con Ilaria.",
  "cover": "ilaria-01.jpg",
  "photos": [
    {
      "file": "ilaria-01.jpg",
      "alt": "Foto ricordo con Ilaria",
      "caption": "Una giornata speciale"
    },
    {
      "file": "ilaria-02.jpg",
      "alt": "Seconda foto con Ilaria",
      "caption": "Il nostro viaggio"
    }
  ]
}
```

Per aggiungere un'altra persona:

1. crea una nuova cartella dentro `private/photos/`, per esempio `private/photos/martina/`;
2. copia lì le fotografie;
3. duplica un gruppo in `data/photos.json` e cambia `id`, `name`, `cover` e l'elenco `photos`.

Sono accettati file JPG, JPEG, PNG, WEBP, GIF e SVG. Evita spazi e caratteri accentati nei nomi dei file.

## Icona del sito

L'icona è già inclusa nei file:

```text
public/favicon.svg
public/apple-touch-icon.png
public/site.webmanifest
```

Compare nella scheda del browser e, sui dispositivi compatibili, quando il sito viene aggiunto alla schermata Home.

## Lettere già inserite

Questa versione contiene 12 lettere: Ilaria, Angela, Arianna, Betta, Caterina, Jappy, Maino, Matteo, Micheal, Rita, Stefania e Sofia. La lettera di Sofia mantiene le due fotografie originali; per le lettere disponibili solo come testo sono state create immagini in stile manoscritto. I testi digitali completi sono in `data/letters.json` e vengono letti dal pulsante di sintesi vocale.

