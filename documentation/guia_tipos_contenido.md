# 📋 Guía de Tipos de Contenido - Sistema Coffee Coros

Esta guía explica de manera sencilla todos los tipos de información que maneja nuestro sistema de gestión de coros.

## 🏢 **Organización Principal**

### 🏠 **Tenant (Inquilino/Organización)**
Es como la "casa principal" donde vive toda tu información. Cada organizacion tiene su propio espacio separado.

**¿Qué información guarda?**
- Nombre de la organización (ej: "Parroquia Santa María")
- Administrador principal
- Fecha de creación

---

## 👥 **Personas y Usuarios**

### 👤 **Person (Persona)**
Es el directorio completo de todas las personas en tu organización.

**¿Qué información guarda?**
- **Datos personales**: Nombres, apellidos, fecha de nacimiento
- **Contacto**: Teléfono, email, WhatsApp
- **Foto de perfil**
- **Estado**: Si la persona está activa o inactiva
- **Información adicional**: Notas especiales, alergias, contactos de emergencia

**Ejemplos de personas:**
- Miembros del coro
- Directores musicales
- Coordinadores
- Familiares (para contactos de emergencia)

---

## 🎵 **Música y Coros**

### 🎭 **Choir (Coro)**
Representa cada grupo musical de tu organización.

**¿Qué información guarda?**
- **Nombre del coro** (ej: "Coro Adultos", "Coro Jóvenes")
- **Descripción** del tipo de coro
- **Estado**: Activo o inactivo
- **Email de contacto** del coro
- **Lista de miembros** (conexión con Personas)

### 🎶 **Song (Canción)**
La biblioteca completa de todas las canciones.

**¿Qué información guarda?**
- **Nombre de la canción**
- **Notas especiales** sobre la canción
- **Archivos adjuntos**:
  - 📄 Letra de la canción
  - 🎼 Partitura musical
  - 🎵 Pista de acompañamiento
  - 🎤 Grabación de la canción

---

## ⛪ **Clasificación Litúrgica**

### 📿 **Liturgical Section (Momento Litúrgico)**
Son las diferentes partes de una celebración religiosa.

**Ejemplos:**
- Entrada
- Gloria
- Salmo Responsorial
- Ofertorio
- Santo
- Comunión
- Salida

**¿Qué información guarda?**
- **Nombre** del momento
- **Descripción** de qué es
- **Orden** en la celebración
- Si es **obligatorio** o opcional

### 🌟 **Liturgical Season (Tiempo Litúrgico)**
Los diferentes periodos del año religioso.

**Ejemplos:**
- Adviento
- Navidad
- Cuaresma
- Pascua
- Tiempo Ordinario

**¿Qué información guarda?**
- **Nombre** del tiempo litúrgico
- **Descripción** del período
- **Fechas** de inicio y fin

### 👗 **Vestment (Vestuario)**
Los diferentes tipos de vestimenta para los coros.

**Ejemplos:**
- Gala (para ocasiones especiales)
- Civil (elegante casual)
- Blanco/Beige (para ciertos tiempos litúrgicos)

**¿Qué información guarda?**
- **Nombre** del tipo de vestuario
- **Descripción** de cuándo usarlo
- **Instrucciones especiales**

---

## 🎪 **Eventos y Presentaciones**

### 🎉 **Event (Evento)**
Cada celebración, misa o presentación donde participan los coros.

**¿Qué información guarda?**
- **Nombre del evento** (ej: "Misa de Domingo", "Concierto Navideño")
- **Descripción** del evento
- **Fecha y hora**
- **Lugar** donde se realizará
- **Instrucciones especiales**
- **Tiempo litúrgico** correspondiente
- **Tipo de vestuario** requerido

### 📋 **Event Program (Programa de Evento)**
Es como el "repertorio" de cada coro para un evento específico. Un evento puede tener varios programas si participan múltiples coros.

**¿Qué información guarda?**
- **Evento** al que pertenece
- **Coro** que va a cantar
- **Nombre del programa** (ej: "Repertorio Coro Adultos")
- **Notas especiales** para el coro

### 🎵 **Event Program Song (Canción del Programa)**
Cada canción individual dentro de un programa de evento.

**¿Qué información guarda?**
- **Programa** al que pertenece
- **Canción** que se va a interpretar
- **Momento litúrgico** donde se cantará
- **Orden de presentación** (1ra, 2da, 3ra canción, etc.)
- **Notas especiales** para esa canción

---

## 🔗 **¿Cómo se conecta todo?**

```
Organización (Tenant)
├── Personas
│   └── Miembros de Coros
├── Coros
│   └── Canciones que saben cantar
├── Canciones
│   ├── Momentos Litúrgicos donde se usan
│   └── Tiempos Litúrgicos apropiados
├── Eventos
│   ├── Programas de cada Coro
│   └── Canciones específicas para cada momento
└── Catálogos de Clasificación
    ├── Momentos Litúrgicos
    ├── Tiempos Litúrgicos
    └── Tipos de Vestuario
```

---

## 📝 **Ejemplo Práctico**

**Evento:** "Misa Dominical del 3er Domingo de Adviento"
- **Fecha:** 15 de diciembre, 10:00 AM
- **Lugar:** Iglesia Principal
- **Tiempo Litúrgico:** Adviento
- **Vestuario:** Civil

**Programa del Coro Adultos:**
1. **Entrada:** "Ven, Ven Señor"
2. **Gloria:** "Gloria a Dios en el Cielo"
3. **Ofertorio:** "Te Presentamos"
4. **Comunión:** "Pan de Vida"
5. **Salida:** "Id en Paz"

**Programa del Coro Jóvenes:**
1. **Entrada:** "Preparen el Camino"
2. **Aclamación:** "Aleluya de Adviento"

---

## 💡 **Beneficios del Sistema**

✅ **Organización total:** Toda la información en un solo lugar
✅ **Fácil planificación:** Crear programas rápidamente
✅ **Historial completo:** Ver qué se ha cantado en eventos pasados
✅ **Archivos seguros:** Todas las partituras y grabaciones organizadas
✅ **Comunicación clara:** Información actualizada para todos
✅ **Múltiples coros:** Gestionar varios grupos desde un mismo sistema

---

*Esta guía es un resumen simplificado. Para dudas específicas, contacta al administrador del sistema.*
