# Bety

Una pequeña compañía digital que conoce y recuerda a su persona con el tiempo.

Sprint 1 implementa el primer encuentro con Miso: sobre, carta, reveal, nombre, primera memoria y reconocimiento al regresar.

## Stack

- Next.js 16 App Router
- React 19 y TypeScript estricto
- Tailwind CSS 4
- Prisma 7 con PostgreSQL
- Vitest

## Configuración local

La aplicación necesita una base PostgreSQL exclusiva y esta variable privada:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/DATABASE"
```

`.env*` está ignorado por Git. Nunca se debe usar una variable `NEXT_PUBLIC_` para la conexión.

```bash
npm install
npm run db:validate
npx prisma migrate deploy
npm run dev
```

## Scripts

```bash
npm run dev
npm run lint
npm test
npm run test:integration
npm run build
npm run db:generate
npm run db:validate
```

La prueba de integración crea un visitante aislado y lo elimina al terminar. `npm run start` enlaza la aplicación exclusivamente a `127.0.0.1:4001`.

## Privacidad e identidad

La identidad inicial usa una cookie `bety_visitor` aleatoria de 256 bits, `httpOnly` y `sameSite=lax`. PostgreSQL recibe únicamente su hash SHA-256. El nombre canónico vive en `UserProfile` y su recuerdo derivado en `Memory`; ambos se escriben en una transacción junto con `PetState.lastInteractionAt`.
