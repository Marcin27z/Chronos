# Cloudflare Pages Deployment

## Przegląd

Aplikacja Chronos jest skonfigurowana do automatycznego wdrożenia na Cloudflare Pages przy każdym pushu do brancha `master`.

## Konfiguracja projektu Cloudflare

### Wymagane zmienne środowiskowe (GitHub Secrets)

W repozytorium GitHub należy skonfigurować następujące secrets:

1. **CLOUDFLARE_API_TOKEN** - API Token z odpowiednimi uprawnieniami
   - Utwórz token w Cloudflare Dashboard: Profile → API Tokens → Create Token
   - Wybierz szablon "Edit Cloudflare Workers" lub stwórz własny z uprawnieniami:
     - Account → Cloudflare Pages → Edit

2. **CLOUDFLARE_ACCOUNT_ID** - ID konta Cloudflare
   - Znajdziesz w Cloudflare Dashboard w sekcji Workers & Pages

3. **CLOUDFLARE_PROJECT_NAME** - Nazwa projektu Cloudflare Pages
   - Nazwa utworzonego projektu w Cloudflare Pages

4. **SUPABASE_URL** - URL bazy danych Supabase

5. **SUPABASE_KEY** - Klucz API Supabase (anon key)

### Environment w GitHub

Workflow `master.yml` używa środowiska `production`. Upewnij się, że:
- Environment `production` jest utworzony w ustawieniach repozytorium
- Wszystkie wymagane secrets są dostępne w tym environment

## Proces wdrożenia

Workflow `master.yml` wykonuje następujące kroki:

1. **Lint** - Weryfikacja kodu za pomocą ESLint
2. **Unit Tests** - Uruchomienie testów jednostkowych z pokryciem kodu
3. **Build** - Budowanie aplikacji dla Cloudflare Pages
4. **Deploy** - Wdrożenie zbudowanej aplikacji na Cloudflare Pages

## Adapter Cloudflare

Aplikacja używa `@astrojs/cloudflare` jako adapter, który jest skonfigurowany w `astro.config.mjs`:

```javascript
adapter: cloudflare({
  platformProxy: {
    enabled: true,
  },
})
```

### Platform Proxy

Włączenie `platformProxy` umożliwia:
- Lokalne testowanie z emulacją środowiska Cloudflare
- Dostęp do Workers APIs podczas developmentu
- Lepsze debugowanie przed deploymentem

## Różnice między Node.js a Cloudflare

### Runtime
- Cloudflare używa Workers runtime (V8 isolates), nie Node.js
- Niektóre Node.js APIs mogą być niedostępne
- Używaj Web APIs tam gdzie możliwe (np. `fetch` zamiast `node-fetch`)

### Zmienne środowiskowe
W Cloudflare Pages zmienne środowiskowe konfiguruje się w:
- Dashboard → Pages → Twój projekt → Settings → Environment variables

Dodaj tam:
- `SUPABASE_URL`
- `SUPABASE_KEY`

### KV Namespace dla sesji
Astro adapter dla Cloudflare używa KV namespace do przechowywania sesji. Aby to skonfigurować:

1. Utwórz KV namespace w Cloudflare Dashboard:
   - Workers & Pages → KV
   - Create namespace → Nazwa: `chronos-sessions`

2. Dodaj binding w konfiguracji Pages:
   - Dashboard → Pages → Twój projekt → Settings → Functions
   - KV namespace bindings → Add binding
   - Variable name: `SESSION`
   - KV namespace: `chronos-sessions`

Binding `SESSION` jest wymagany przez `@astrojs/cloudflare` adapter.

### Limitacje
- Maksymalny rozmiar bundle: 25 MB (po kompresji)
- Timeout: 30 sekund dla Free tier, więcej dla płatnych
- Brak dostępu do systemu plików

## Lokalne testowanie

Aby przetestować lokalnie z Cloudflare runtime:

```bash
npm run build
npx wrangler pages dev dist
```

## Monitorowanie

Po wdrożeniu możesz monitorować aplikację poprzez:
- Cloudflare Dashboard → Analytics & Logs
- Real-time logs w Workers & Pages → Twój projekt → Logs

## Troubleshooting

### Build fails
- Sprawdź czy wszystkie zależności są kompatybilne z Cloudflare Workers
- Upewnij się, że nie używasz Node.js specific APIs

### Deployment fails
- Zweryfikuj poprawność CLOUDFLARE_API_TOKEN
- Sprawdź czy CLOUDFLARE_PROJECT_NAME istnieje
- Upewnij się, że token ma odpowiednie uprawnienia

### Runtime errors
- Sprawdź logi w Cloudflare Dashboard
- Upewnij się, że zmienne środowiskowe są ustawione w Cloudflare Pages
- Przetestuj lokalnie używając `wrangler pages dev`

