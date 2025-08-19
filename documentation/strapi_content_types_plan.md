# Coffee Coros - Strapi Content Types Plan

## Descripción General
Plan detallado de Content Types para el sistema de gestión de coros Coffee Coros, basado en los requisitos funcionales y la definición de aplicación.

---

## 1. CONTENT TYPES PRINCIPALES

### 1.1 Tenant (tenant)
**Propósito**: Gestión multi-inquilino para aislar datos de diferentes organizaciones

**Campos**:
- `name` (Text) - Nombre de la organización/parroquia
- `administrator` (Relation) - Relación con Person que administra el tenant
- `settings` (JSON) - Configuraciones específicas del tenant
- `status` (Enumeration) - active, inactive

**Relaciones**:
- `persons` (Has Many) → Person
- `choirs` (Has Many) → Choir
- `songs` (Has Many) → Song
- `events` (Has Many) → Event
- `liturgical_sections` (Has Many) → Liturgical Section
- `liturgical_seasons` (Has Many) → Liturgical Season
- `vestments` (Has Many) → Vestment

**Notas**:
- Root entity para multi-tenancy
- Solo SuperAdmin puede crear/editar tenants

---

### 1.2 Person (person)
**Propósito**: Directorio completo de personas en el sistema

**Campos**:
- `first_name` (Text, Required) - Primer nombre
- `middle_name` (Text) - Segundo nombre
- `last_name` (Text, Required) - Primer apellido
- `last_name_2` (Text) - Segundo apellido
- `birth_date` (Date) - Fecha de nacimiento
- `phone` (Text) - Teléfono principal
- `email` (Email) - Correo electrónico
- `photo` (Media) - Foto de perfil
- `status` (Enumeration) - active, inactive
- `notes` (Text) - Notas adicionales

**Relaciones**:
- `tenant` (Belongs To) → Tenant
- `user` (Has One) → User (users-permissions)
- `choir_memberships` (Has Many) → Choir Member

**Componentes**:
- `contact_info` - Información de contacto adicional
- `emergency_contact` - Contacto de emergencia

**Notas**:
- Campo calculado `full_name` en el frontend
- Foto opcional con validaciones de tamaño/formato

---

### 1.3 Choir (choir)
**Propósito**: Gestión de coros y grupos musicales

**Campos**:
- `name` (Text, Required) - Nombre del coro
- `description` (Text) - Descripción del coro
- `status` (Enumeration) - active, inactive
- `contact_email` (Email) - Email de contacto del coro

**Relaciones**:
- `tenant` (Belongs To) → Tenant
- `members` (Has Many) → Choir Member
- `repertoire` (Many to Many) → Song
- `event_programs` (Has Many) → Event Program

**Notas**:
- Status para activar/desactivar coros temporalmente
- Email de contacto opcional para comunicaciones

---

### 1.4 Song (song)
**Propósito**: Biblioteca de canciones con archivos adjuntos

**Campos**:
- `name` (Text, Required) - Título de la canción
- `notes` (Text) - Notas y observaciones
- `lyrics_file` (Media) - Archivo de letra
- `sheet_music_file` (Media) - Partitura
- `backing_track_file` (Media) - Pista de acompañamiento
- `recording_file` (Media) - Grabación de referencia
- `status` (Enumeration) - active, inactive

**Relaciones**:
- `tenant` (Belongs To) → Tenant
- `choirs` (Many to Many) → Choir
- `liturgical_sections` (Many to Many) → Liturgical Section
- `liturgical_seasons` (Many to Many) → Liturgical Season

**Notas**:
- Múltiples archivos opcionales por canción
- Validaciones de formato de archivo (PDF, MP3, etc.)

---

## 2. CONTENT TYPES DE CATÁLOGO

### 2.1 Liturgical Section (liturgical-section)
**Propósito**: Momentos litúrgicos (Entrada, Gloria, Ofertorio, etc.)

**Campos**:
- `name` (Text, Required) - Nombre del momento
- `description` (Text) - Descripción del momento
- `order_sequence` (Number) - Orden en la misa
- `is_required` (Boolean) - Si es obligatorio en eventos

**Relaciones**:
- `tenant` (Belongs To) → Tenant
- `songs` (Many to Many) → Song

**Datos predeterminados**:
```
- Preludio
- Entrada
- Gloria
- Salmo Responsorial
- Aclamación al Evangelio
- Ofertorio
- Santo
- Aclamación Memorial
- Amén
- Cordero de Dios
- Comunión
- Salida
```

---

### 2.2 Liturgical Season (liturgical-season)
**Propósito**: Tiempos litúrgicos del año eclesiástico

**Campos**:
- `name` (Text, Required) - Nombre del tiempo
- `description` (Text) - Descripción del tiempo
- `color` (Text) - Color litúrgico asociado
- `start_date` (Date) - Fecha aproximada de inicio
- `end_date` (Date) - Fecha aproximada de fin

**Relaciones**:
- `tenant` (Belongs To) → Tenant
- `songs` (Many to Many) → Song
- `events` (Has Many) → Event

**Datos predeterminados**:
```
- Adviento
- Navidad
- Tiempo Ordinario
- Cuaresma
- Pascua
- Pentecostés
```

---

### 2.3 Vestment (vestment)
**Propósito**: Tipos de vestimenta para eventos

**Campos**:
- `name` (Text, Required) - Nombre del tipo de vestimenta
- `description` (Text) - Descripción detallada
- `occasion` (Text) - Ocasiones de uso

**Relaciones**:
- `tenant` (Belongs To) → Tenant

**Datos predeterminados**:
```
- Gala (Negro formal para ocasiones especiales)
- Civil (Elegante casual)
- Blanco/Beige (Colores claros para temporadas específicas)
```

---

## 3. CONTENT TYPES DE EVENTOS

### 3.1 Event (event)
**Propósito**: Gestión de eventos y celebraciones

**Campos**:
- `name` (Text, Required) - Nombre del evento
- `description` (Text) - Descripción del evento
- `event_date` (DateTime, Required) - Fecha y hora del evento
- `venue` (Text) - Lugar del evento
- `vestment_requirement` (Relation) → Vestment
- `special_instructions` (Text) - Instrucciones especiales
- `status` (Enumeration) - planned, confirmed, completed, cancelled

**Relaciones**:
- `tenant` (Belongs To) → Tenant
- `liturgical_season` (Belongs To) → Liturgical Season
- `programs` (Has Many) → Event Program

**Componentes**:
- `event_contacts` - Contactos del evento

**Notas**:
- Vestment requirement es opcional
- Status permite rastrear el estado del evento

---

### 3.2 Event Program (event-program)
**Propósito**: Programa musical de un coro para un evento específico

**Campos**:
- `name` (Text) - Nombre del programa (ej: "Programa Coro Adultos")
- `notes` (Text) - Notas del programa
- `rehearsal_notes` (Text) - Notas de ensayo

**Relaciones**:
- `event` (Belongs To) → Event
- `choir` (Belongs To) → Choir
- `songs` (Has Many) → Event Program Song

**Notas**:
- Un evento puede tener múltiples programas (uno por coro)
- Cada programa contiene las canciones ordenadas

---

### 3.3 Event Program Song (event-program-song)
**Propósito**: Canciones específicas en un programa con orden y detalles

**Campos**:
- `performance_order` (Number, Required) - Orden de interpretación
- `liturgical_section` (Relation) → Liturgical Section
- `special_notes` (Text) - Notas específicas para esta interpretación

**Relaciones**:
- `event_program` (Belongs To) → Event Program
- `song` (Belongs To) → Song

**Notas**:
- Permite reordenar canciones fácilmente
- Notas específicas por interpretación

---

## 4. CONTENT TYPES DE RELACIÓN

### 4.1 Choir Member (choir-member)
**Propósito**: Membresía de personas en coros con detalles específicos

**Campos**:
- `joined_date` (Date) - Fecha de ingreso
- `voice_part` (Enumeration) - soprano, alto, tenor, bass, director
- `status` (Enumeration) - active, inactive, temporary
- `notes` (Text) - Notas sobre el miembro

**Relaciones**:
- `choir` (Belongs To) → Choir
- `person` (Belongs To) → Person

**Notas**:
- Historial de membresía
- Clasificación por voz

---

## 5. COMPONENTES REUTILIZABLES

### 5.1 Contact Info
**Campos**:
- `phone_2` (Text) - Teléfono secundario
- `whatsapp` (Text) - WhatsApp
- `address` (Text) - Dirección completa

### 5.2 Emergency Contact
**Campos**:
- `name` (Text) - Nombre del contacto
- `relationship` (Text) - Relación
- `phone` (Text) - Teléfono

### 5.3 Event Contacts
**Campos**:
- `contact_name` (Text) - Nombre del contacto
- `contact_role` (Text) - Rol o función
- `contact_phone` (Text) - Teléfono de contacto
- `contact_email` (Email) - Email de contacto

---

## 6. CONFIGURACIONES ESPECIALES

### 6.1 Permisos por Rol
- **SuperAdmin**: Acceso completo a todos los tenants
- **Admin**: Acceso completo dentro de su tenant
- **User**: Solo lectura y edición limitada

### 6.2 Plugins Necesarios
- `users-permissions` - Gestión de usuarios y roles
- `upload` - Gestión de archivos
- `email` - Notificaciones por email

### 6.3 Validaciones
- Archivos: PDF para partituras/letras, MP3/WAV para audio
- Imágenes: JPG/PNG para fotos, tamaño máximo
- Emails: Validación de formato
- Fechas: Validación de rangos lógicos

---

## 7. NOTAS DE IMPLEMENTACIÓN

### 7.1 Multi-tenancy
- Todos los content types principales incluyen relación con Tenant
- Middleware para filtrar datos por tenant del usuario
- Policies para validar permisos de tenant

### 7.2 Archivos
- Estructura de carpetas por tenant: `/uploads/{tenant_id}/{content_type}/`
- Respaldos automáticos de archivos importantes
- Compresión de imágenes automática

### 7.3 Performance
- Índices en campos de búsqueda frecuente
- Paginación en listados grandes
- Cache para catálogos estáticos

### 7.4 Datos Iniciales
- Seed data para liturgical sections/seasons/vestments
- Scripts de inicialización de catálogos
- Configuración de tenant por defecto para desarrollo

---

## 8. ORDEN DE CREACIÓN SUGERIDO

1. **Tenant** (base para multi-tenancy)
2. **Liturgical Section, Liturgical Season, Vestment** (catálogos)
3. **Person** (directorio)
4. **Choir** (coros)
5. **Song** (biblioteca)
6. **Choir Member** (relación coro-persona)
7. **Event** (eventos)
8. **Event Program** (programas)
9. **Event Program Song** (canciones en programas)

---

*Este documento debe revisarse y ajustarse antes de la implementación. Considerar feedback del equipo y requisitos específicos del cliente.*
