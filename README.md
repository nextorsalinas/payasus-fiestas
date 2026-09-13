# Payasus Fiestas

Aplicación de contrataciones con identidad propia y datos compartidos con Pispifiestas.

- Hosting: proyecto payasus-fiestas, https://payasus-fiestas.web.app
- Firestore compartido: proyecto contrata-pispi, colección contrataciones.
- Las nuevas contrataciones de Payasus incluyen marca: payasus y sourceProject: payasus-fiestas.
- Las contrataciones históricas de Pispi no incluyen marca. El formulario original de Pispi continúa guardando en la misma colección.
- Teléfono: 55 1276 7519
- Dirección: Dr. Juan Palomo 12, Barrio Los Reyes, Tláhuac

## Desarrollo y publicación

npm ci
npm run dev
npm run build
npx firebase deploy --only hosting --project payasus-fiestas

El despliegue normal modifica únicamente Hosting. Las reglas compartidas se publican por separado, siempre al proyecto contrata-pispi:

`npx firebase deploy --only firestore:rules --config firebase.shared.json --project contrata-pispi`

No desplegar la copia antigua de reglas del proyecto original de Pispi: deshabilitaría la lectura de la agenda. La configuración compartida vigente se mantiene en este repositorio.

## Agenda compartida

El botón **Consultar disponibilidad** abre la agenda de ambas agencias. Consulta en tiempo real la misma colección contrataciones; no requiere duplicar ni sincronizar reservas entre colecciones. Permite consultar fecha y horario, filtrar la lista por agencia o servicio y revisar inflables y payasos concretos. El estado de recursos siempre considera ambas agencias, incluso si se filtra la lista.

Las reservas históricas sin recurso asignado muestran **Por confirmar**. Los horarios que cruzan medianoche incluyen el día siguiente. Sin confirmación del servidor no se muestra disponibilidad. Los estados cancelada, cancelado, cancelled y canceled no ocupan recursos. Cosplay y pintacaritas requieren confirmar personal; la consulta no bloquea recursos ni contempla traslados.

El cierre guarda la contratación y el folio en Firestore antes de habilitar el PDF. El comprobante usa una copia de los datos guardados. Después de guardar, el formulario queda bloqueado; **Nueva contratación** inicia otra venta. Deben seleccionarse los inflables y payasos contratados para identificar los recursos de la agenda.

### Acceso durante la beta

La agenda no requiere inicio de sesión. La lectura pública de contrataciones fue autorizada para la beta: permite acceder también a los campos de clientes contenidos en los documentos, aunque el modal solo muestra servicios, recursos, agencia y horario. La edición y eliminación siguen bloqueadas. Google Authentication no se utiliza. Los documentos calendarReaders previamente configurados permanecen privados y no se utilizan para este acceso.

### Verificación

`node scripts/test-availability.cjs` prueba cruces de horarios y compatibilidad de reservas antiguas.

`node scripts/test-firestore-rules.cjs` usa la sesión administrativa de Firebase CLI para simular permisos con datos ficticios; no crea contrataciones. Incluye lectura pública para la beta, bloqueo de edición y eliminación, protección de otras colecciones y compatibilidad del guardado de ambas agencias.

## Unificación de registros anteriores

node scripts/share-reservations.cjs audit
node scripts/share-reservations.cjs migrate

El script usa la sesión de Firebase CLI, respalda los documentos en .local-data (excluida de Git) y copia los registros de Payasus a la colección común sin eliminar originales ni sobrescribir documentos. La revisión inicial encontró 0 registros en Payasus y 4 en Pispi.

Compartir registros no implementa automáticamente un bloqueo de horarios o recursos; ambos formularios mantienen su flujo actual de contratación.
