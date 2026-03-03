-- Database Schema for Data Center Asset Manager

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ROLES
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT UNIQUE NOT NULL,
    permisos JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INITIAL ROLES
INSERT INTO roles (nombre, permisos) VALUES 
('Administrador', '{"all": true}'),
('Operador', '{"edit": true, "view": true}'),
('Visor', '{"view": true}');

-- USUARIOS
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Simplified for local dev, usually managed by Supabase Auth
    rol_id UUID REFERENCES roles(id),
    activo BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SALAS
CREATE TABLE salas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    sitio TEXT,
    piso INTEGER,
    ancho_coord FLOAT NOT NULL, -- Unidades x
    alto_coord FLOAT NOT NULL,  -- Unidades z
    origen_x FLOAT DEFAULT 0,
    origen_z FLOAT DEFAULT 0,
    plano_base_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ACTIVOS
CREATE TABLE activos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag_id TEXT UNIQUE NOT NULL, -- Identificador único (Ej: SRV-001)
    tipo TEXT NOT NULL, -- rack, servidor, switch, etc.
    modelo TEXT,
    fabricante TEXT,
    serie TEXT UNIQUE,
    estado TEXT DEFAULT 'operativo', -- operativo, mantenimiento, baja
    sala_id UUID REFERENCES salas(id),
    pos_x FLOAT NOT NULL,
    pos_z FLOAT NOT NULL,
    piso_nivel INTEGER DEFAULT 0,
    detalles JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- MOVIMIENTOS
CREATE TABLE movimientos_activos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    activo_id UUID REFERENCES activos(id) ON DELETE CASCADE,
    tipo_movimiento TEXT NOT NULL, -- alta, traslado, baja
    desde_sala_id UUID REFERENCES salas(id),
    desde_x FLOAT,
    desde_z FLOAT,
    hacia_sala_id UUID REFERENCES salas(id),
    hacia_x FLOAT,
    hacia_z FLOAT,
    usuario_id UUID REFERENCES usuarios(id),
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AUDITORIA
CREATE TABLE auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id),
    entidad TEXT NOT NULL,
    entidad_id UUID NOT NULL,
    accion TEXT NOT NULL, -- crear, actualizar, eliminar
    detalle JSONB,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_activos_modtime
    BEFORE UPDATE ON activos
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
