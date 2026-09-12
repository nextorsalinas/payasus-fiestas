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

El despliegue de este sitio modifica únicamente Hosting. Las reglas de la colección compartida se administran en contrata-pispi. El archivo firestore.rules se conserva como referencia del esquema original, sin publicarlo desde este proyecto.

## Unificación de registros anteriores

node scripts/share-reservations.cjs audit
node scripts/share-reservations.cjs migrate

El script usa la sesión de Firebase CLI, respalda los documentos en .local-data (excluida de Git) y copia los registros de Payasus a la colección común sin eliminar originales ni sobrescribir documentos. La revisión inicial encontró 0 registros en Payasus y 4 en Pispi.

Compartir registros no implementa automáticamente un bloqueo de horarios o recursos; ambos formularios mantienen su flujo actual de contratación.
