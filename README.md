# Mi Barrio — Panel Administrador Web

Panel de gestión web desarrollado en HTML, CSS y JavaScript puro para administrar los incidentes vecinales reportados desde la aplicación móvil **Mi Barrio**.

## Funcionalidades principales

- **Acceso restringido:** Autenticación mediante Firebase Authentication exclusiva para cuentas de administrador autorizadas.
- **Vista general de vecinos:** Tabla ordenada cronológicamente desde el primer reporte registrado, mostrando nombre, correo electrónico, cantidad total de reclamos y fechas de actividad.
- **Detalle y seguimiento:** Inspección individual de cada reporte con fotografía adjunta, ubicación, antigüedad y descripción del problema.
- **Gestión de estados en tiempo real:** Actualización directa en Cloud Firestore (`Pendiente`, `En proceso`, `Solicitado`), reflejada instantáneamente en la aplicación móvil del vecino.

## Estructura del proyecto

```text
├── index.html   # Estructura del login y vistas del panel
├── styles.css   # Estilos responsivos de la interfaz
├── app.js       # Conexión a Firebase Auth/Firestore y lógica de gestión
└── README.md    # Documentación del panel
```
