# Ajustes de negocio — Pool Manager

Este archivo lleva control de decisiones funcionales/de negocio (no solo técnicas)
tomadas sobre el sistema, para que quede registro de *por qué* funciona así.

## 2026-07-01 — Tarifas de entrada configurables

- La piscina cobra entrada por persona: **adultos** y **niños** pagan una tarifa
  (por defecto $5.000 y $4.000 COP), los **menores de cierta edad** (por defecto
  4 años) entran gratis.
- Las tarifas (`entryAdultPrice`, `entryChildPrice`) y la edad límite para
  entrada gratuita (`entryFreeUnderAge`) son configurables por el Admin de cada
  piscina (campos en `Tenant`, editables desde `/access/pricing`, botón
  "Tarifas" en Control de Acceso — solo visible para ADMIN/SUPERADMIN).
- Al registrar una entrada se indica cuántos adultos, niños y menores gratis
  vienen en el grupo (una sola registro por grupo, no por persona).

## 2026-07-01 — Pago diferido de entradas ("cuenta abierta") + consumo de tienda

Problema planteado: una entrada se puede cobrar de inmediato, o el grupo puede
quedarse en la piscina y **pagar al salir**. Mientras están adentro pueden pedir
productos de la tienda y todo (entrada + lo pedido) se cobra junto al final.
Además debe seguir siendo posible que alguien llegue **solo a comprar en la
tienda**, sin pasar por control de acceso.

Reglas adoptadas:

1. **Registrar entrada sin pagar** (`POST /access/entry` sin
   `cashierSessionId`/`paymentMethod`/`amountPaid`) crea la entrada como
   **cuenta abierta**: `paymentMethod = null`. Si sí se envían esos datos, se
   cobra de inmediato como antes (comportamiento previo intacto).
2. Una entrada es una **"cuenta abierta"** mientras `paymentMethod IS NULL` y
   `exitTime IS NULL`. Solo esas entradas aparecen en la lista de "cuentas
   abiertas" para cargarles pedidos o para liquidarlas.
3. En Tienda (POS), al cobrar un pedido el cajero puede elegir **"Cargar a
   cuenta"** y seleccionar de una lista una entrada abierta (por nombre de
   visitante) en vez de cobrar de inmediato. El pedido (`Order`) queda
   `PENDIENTE` con `accessEntryId` apuntando a esa entrada — no se cobra en ese
   momento.
   - Si no se elige ninguna cuenta, el flujo de venta normal (cobrar ya) sigue
     funcionando exactamente igual que antes — esto cubre el caso de clientes
     que **solo compran en la tienda** sin usar la piscina.
4. **"Pagar = Salir"**: liquidar una cuenta abierta (`POST /access/:id/settle`)
   es una sola acción que:
   - Suma el valor de la entrada (si no se había pagado) + el total de todos
     los pedidos de tienda `PENDIENTE` ligados a esa entrada.
   - Cobra ese total (método de pago + monto recibido, contra una caja
     abierta), marca los pedidos como `PAGADO` (generando su `Sale`
     correspondiente para el cuaderno de ventas) y registra la **salida** de
     la piscina en el mismo momento.
   - Una vez pagada (`paymentMethod` deja de ser `null`), la entrada ya no
     admite más pedidos cargados a su cuenta.
5. Una entrada pagada **de inmediato** al registrarse (opción "Pagar ahora")
   no puede recibir cargos de tienda después — para eso hay que dejarla como
   cuenta abierta. Su salida se sigue registrando con el endpoint simple de
   salida (`PATCH /access/:id/exit`), que ahora rechaza entradas con cuenta
   abierta sin pagar (deben usar "Cobrar y salir").

### Modelo de datos

- `Tenant`: + `entryAdultPrice`, `entryChildPrice`, `entryFreeUnderAge`.
- `AccessEntry`: + `adults`, `children`, `freeMinors`, `totalAmount`,
  `paymentMethod?`, `amountPaid?`, `change`, `cashierSessionId?` (todo nullable
  para permitir el estado "cuenta abierta").
- `Order` (tienda): + `accessEntryId?` — vínculo opcional a la cuenta a la que
  se cargó el pedido.

### Endpoints nuevos/cambiados

- `GET /access/pricing`, `PATCH /access/pricing` (ADMIN/SUPERADMIN) — tarifas.
- `POST /access/entry` — `cashierSessionId`/`paymentMethod`/`amountPaid` ahora
  opcionales (omitirlos = cuenta abierta).
- `GET /access/open-tabs` — entradas abiertas (sin pagar, aún dentro), con sus
  pedidos `PENDIENTE` incluidos y el total pendiente.
- `POST /access/:id/settle` — liquida entrada + pedidos pendientes, cobra y
  marca la salida.
- `PATCH /access/:id/exit` — ahora rechaza (400) entradas con cuenta abierta
  sin pagar.
- `POST /store/orders` — admite `accessEntryId` opcional para cargar el pedido
  a una cuenta abierta en vez de cobrarlo de inmediato.

### UI

- Control de Acceso (`/acceso`): toggle "Pagar ahora" / "Dejar cuenta
  abierta" al registrar; en "Dentro ahora", las cuentas abiertas muestran sus
  pedidos pendientes y un botón "Cobrar y salir" (en vez de "Salida").
- Tienda (`/tienda`): selector "Cargar a cuenta" en el carrito — si se elige
  una cuenta abierta, el botón pasa de "Cobrar" a "Cargar a cuenta de …" y no
  pide pago.
