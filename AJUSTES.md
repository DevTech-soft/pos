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

## 2026-07-01 — Cuaderno de ventas: entradas y consumo de tienda juntos

Problema: `/ventas` solo mostraba `Sale` (pedidos de tienda pagados) — las
entradas cobradas (de inmediato o al liquidar una cuenta) no aparecían ahí,
aunque sí sumaban en caja.

- Nuevo `GET /access/sales`: entradas ya pagadas (`paymentMethod` no nulo),
  con sus pedidos `PAGADO` incluidos y un `paidAt` calculado
  (`exitTime` si se pagó al liquidar cuenta, si no `entryTime` si se pagó de
  inmediato).
- El frontend combina `/store/sales` + `/access/sales` en una sola lista
  ordenada por fecha. Los pedidos que ya se cargaron a una cuenta se excluyen
  de `/store/sales` en esa vista (se muestran una sola vez, dentro de la
  tarjeta de la entrada) para no duplicarlos.
- Cada tarjeta de entrada en el cuaderno muestra: visitante, desglose de
  personas, valor de la entrada, método de pago y — si tuvo cuenta — los
  productos de tienda que se cobraron junto con ella.

## 2026-07-01 — Alquiler de espacios (piscina, salones, etc.)

Problema: además de la entrada por persona, la piscina alquila espacios
completos por horario (ej. "piscina privada" de 2pm a 6pm, o un salón para
un evento). Una reserva puede combinar varios espacios a la vez, y — igual
que con las entradas — puede pagarse de inmediato o quedar como cuenta
abierta mientras el cliente consume en la tienda.

Reglas adoptadas (paralelas a las de Control de Acceso):

1. Catálogo de espacios (`RentalSpace`): nombre + precio, configurable por
   Admin desde el botón "Espacios" en `/alquiler`. Un espacio inactivo no
   se puede reservar pero conserva su historial.
2. Una reserva (`Rental`) tiene cliente, teléfono opcional, rango de fecha/hora
   (`startAt`/`endAt`) y uno o más espacios (`RentalItem`, con el precio
   vigente al momento de reservar — no cambia si luego se edita la tarifa del
   espacio). El total es la suma de esos espacios.
3. **Choque de horario**: no se puede crear una reserva que se solape en el
   tiempo con otra reserva activa (no cancelada) que use alguno de los mismos
   espacios.
4. Igual que las entradas: **registrar sin pagar** deja la reserva como
   **cuenta abierta** (`paymentMethod = null`), y en Tienda se puede "Cargar
   a cuenta" eligiendo esa reserva en vez de la de una entrada — el selector
   del carrito ahora agrupa "Entradas" y "Alquileres". **"Cobrar y
   finalizar"** (`POST /rentals/:id/settle`) cobra reserva + pedidos
   pendientes juntos y marca la reserva como `COMPLETADO`.
5. Una reserva pagada **al reservar** ("Pagar ahora") no admite cargos de
   tienda después. Se marca como finalizada con `POST /rentals/:id/complete`
   (no mueve dinero, solo cierra el estado) cuando el evento ya terminó.
6. Solo se puede **cancelar** (`POST /rentals/:id/cancel`) una reserva que
   siga `RESERVADO` y sin pagar — una vez cobrada, ya no se cancela.

### Modelo de datos

- `RentalSpace`: catálogo de espacios por tenant (`name`, `price`, `isActive`).
- `Rental`: `customerName`, `phone?`, `startAt`, `endAt`, `status`
  (`RESERVADO`/`COMPLETADO`/`CANCELADO`), `totalAmount`, `paymentMethod?`,
  `amountPaid?`, `change`, `cashierSessionId?`, `paidAt?`, `notes?`.
- `RentalItem`: espacio(s) incluidos en una reserva, con el precio congelado
  al momento de reservar.
- `Order` (tienda): + `rentalId?` — vínculo opcional a la reserva a la que se
  cargó el pedido (análogo a `accessEntryId`).

### Endpoints nuevos

- `GET/POST /rentals/spaces`, `PATCH /rentals/spaces/:id` (ADMIN/SUPERADMIN
  para crear/editar) — catálogo de espacios.
- `GET /rentals` — últimas 100 reservas con sus espacios y pedidos.
- `POST /rentals` — crea reserva; sin datos de pago = cuenta abierta.
- `POST /rentals/:id/cancel` — cancela (solo si no pagó).
- `POST /rentals/:id/complete` — cierra una reserva ya pagada al reservar.
- `GET /rentals/open-tabs` — reservas sin pagar con sus pedidos pendientes.
- `POST /rentals/:id/settle` — cobra reserva + pedidos pendientes y cierra.
- `GET /rentals/sales` — reservas ya cobradas, para el cuaderno de ventas.
- `POST /store/orders` — admite `rentalId` opcional (igual que
  `accessEntryId`) para cargar el pedido a una cuenta de alquiler abierta.

### UI

- Nueva sección `/alquiler`: catálogo de espacios (panel "Espacios"), formulario
  de nueva reserva (cliente, horario, selección de espacios, pagar ahora vs.
  cuenta abierta), lista de reservas activas (con "Cobrar y finalizar" o
  "Completar" según corresponda) e historial de completadas/canceladas.
- Tienda (`/tienda`): el selector "Cargar a cuenta" del carrito ahora agrupa
  entradas y alquileres abiertos.
- Cuaderno de ventas (`/ventas`): combina `/store/sales` + `/access/sales` +
  `/rentals/sales`; los pedidos ya cargados a una entrada o alquiler se
  excluyen de `/store/sales` en esta vista para no duplicarlos.

## 2026-07-06 — Login para el admin de cada piscina y para empleados con acceso

Problema: crear una piscina (`Tenant`) no creaba su usuario admin — el
superadmin no tenía forma, desde la UI, de darle usuario/contraseña al admin
de una piscina nueva ni de editárselo después. Y crear un empleado
(`Employee`, ficha de RRHH) no le daba ningún acceso al sistema — no existía
vínculo entre `Employee` y `User`.

Reglas adoptadas:

1. **Crear una piscina crea su admin en el mismo paso.** El superadmin llena
   nombre/email/contraseña del admin junto con los datos de la piscina; se
   crean `Tenant` + `User` (`role: ADMIN`) en una sola transacción.
2. **El superadmin solo gestiona el admin de cada piscina** (nombre, email,
   contraseña, activo/inactivo) — no gestiona cajeros ni empleados de esa
   piscina, eso es responsabilidad exclusiva del admin de la piscina.
3. **El admin de una piscina puede dar acceso al sistema a un empleado** desde
   Empleados, con un check "Dar acceso al sistema". Al marcarlo elige un rol
   (**Cajero** o **Empleado**) y una contraseña; el email de acceso reutiliza
   el campo de email de contacto que ya tenía el empleado (no hay un campo
   separado). El acceso se puede otorgar al crear el empleado o después.
4. **Gestión posterior del acceso de un empleado**: desde su ficha se puede
   resetear la contraseña, cambiar el rol de acceso, y activar/desactivar el
   login sin borrar al empleado.
5. **Paridad `CAJERO`/`EMPLEADO`**: ambos roles tienen el mismo acceso
   operativo (Control de Acceso, Alquiler, Tienda, Caja, Ventas) — la
   diferencia entre los dos queda solo como etiqueta/cargo, no se construyó un
   sistema de permisos por módulo (habría sido sobre-ingeniería para lo
   pedido). Antes de este cambio `EMPLEADO` no tenía ningún acceso en el menú,
   ni siquiera Dashboard.
6. **Endurecimiento de seguridad en `/users`**: al revisar el controller para
   construir esto se encontró que un `ADMIN` podía crear o editar usuarios con
   rol `ADMIN`/`SUPERADMIN`, y tocar usuarios de **otra** piscina (sin
   validación de tenant). Se corrigió: un `ADMIN` solo puede crear/editar
   usuarios `CAJERO`/`EMPLEADO` de su propio tenant; `SUPERADMIN` sigue sin
   restricciones.

### Modelo de datos

- `Employee`: + `userId?` (único) y relación opcional a `User` — un empleado
  puede o no tener acceso al sistema.

### Endpoints cambiados

- `POST /tenants` (SUPERADMIN): ahora requiere también `adminName`,
  `adminEmail`, `adminPassword` — crea el `Tenant` y su `User` ADMIN juntos.
- `GET /tenants`: incluye el admin de cada piscina (`users` filtrado a
  `role: ADMIN`).
- `POST /users`, `PATCH /users/:id` (ADMIN/SUPERADMIN): un `ADMIN` ya no puede
  asignar rol `ADMIN`/`SUPERADMIN` ni operar sobre usuarios de otro tenant.
- `POST /employees`, `PATCH /employees/:id` (ADMIN/SUPERADMIN): admiten
  `grantAccess`, `password`, `accessRole` (`CAJERO`/`EMPLEADO`) y, para editar,
  `revokeAccess` — crean/editan el `User` vinculado al empleado.
- `GET /employees`, `GET /employees/:id`: incluyen `user` (id, email, role,
  isActive) si el empleado tiene acceso.

### UI

- Piscinas (`/tenants`): el formulario de creación pide también los datos del
  admin; cada tarjeta muestra su admin con botón "Editar" (nombre, email,
  contraseña opcional) y toggle activo/inactivo.
- Empleados (`/empleados`): checkbox "Dar acceso al sistema" en el formulario
  de creación (con selector de rol y contraseña); cada tarjeta con acceso
  muestra su rol y estado, con botones "Resetear" y activar/desactivar; sin
  acceso, muestra botón "Dar acceso al sistema".
- Sidebar: `EMPLEADO` ahora ve los mismos módulos que `CAJERO`.

## 2026-07-06 — Dashboard del superadmin: solo piscinas, nada de operación de tenant

Problema: el superadmin (rol sin `tenantId`, es el dueño del negocio revisando
las piscinas que administra) veía en el menú Inventario, Métricas, Empleados y
Nómina — módulos que pertenecen a una piscina concreta. Como el superadmin no
tiene tenant propio, esas pantallas le salían vacías o rotas; no tienen ningún
sentido para su rol, que es solo dar de alta y supervisar piscinas.

Reglas adoptadas:

1. El menú del superadmin queda reducido a **Dashboard** y **Piscinas**.
2. El **Dashboard del superadmin** es una vista de solo lectura con el estado
   de las piscinas del sistema: tarjetas con el total, activas e inactivas, y
   una lista con cada piscina (admin asignado, empleados registrados, fecha de
   alta, badge activa/inactiva). Crear piscinas, editar su admin o
   activar/desactivarlas se sigue haciendo desde `/tenants` (el Dashboard no
   duplica esa gestión, solo el resumen).
3. Endurecimiento a nivel de API, en la misma línea que el hueco de seguridad
   cerrado el 2026-07-06 en `/users`: `SUPERADMIN` ya no está en `@Roles` de
   `/inventory`, `/metrics`, `/employees` ni `/payroll` — quedan solo para
   `ADMIN`. Antes el rol figuraba ahí pero fallaba igual en tiempo de
   ejecución (esos servicios exigen un `tenantId` de tenant que el superadmin
   no tiene), así que restringirlo no le quita ninguna capacidad real.

### UI

- Sidebar: `Inventario`, `Métricas`, `Empleados` y `Nómina` ya no aparecen
  para `SUPERADMIN` (antes sí, sin ser funcionales).
- Dashboard (`/dashboard`): ahora bifurca por rol — `SUPERADMIN` ve el resumen
  de piscinas descrito arriba; el resto de roles sigue viendo el dashboard
  operativo de siempre (aforo, caja, entradas del día).
