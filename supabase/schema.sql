-- ==============================================================================
-- Caserito Digno - Esquema de Base de Datos para Supabase (PostgreSQL)
-- ==============================================================================

-- 1. Tabla de Estadísticas de Campaña (Visitas y Compromisos)
CREATE TABLE IF NOT EXISTS public.campaign_stats (
    id TEXT PRIMARY KEY DEFAULT 'global',
    visits_count BIGINT NOT NULL DEFAULT 1428,
    pledges_count BIGINT NOT NULL DEFAULT 1284,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Insertar fila inicial si no existe
INSERT INTO public.campaign_stats (id, visits_count, pledges_count)
VALUES ('global', 1428, 1284)
ON CONFLICT (id) DO NOTHING;

-- Función RPC para incremento atómico de visitas
CREATE OR REPLACE FUNCTION public.increment_visits()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_count BIGINT;
BEGIN
    UPDATE public.campaign_stats
    SET visits_count = visits_count + 1,
        updated_at = timezone('utc'::text, now())
    WHERE id = 'global'
    RETURNING visits_count INTO new_count;

    RETURN new_count;
END;
$$;

-- Función RPC para incremento atómico de compromisos (pledges)
CREATE OR REPLACE FUNCTION public.increment_pledges()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_count BIGINT;
BEGIN
    UPDATE public.campaign_stats
    SET pledges_count = pledges_count + 1,
        updated_at = timezone('utc'::text, now())
    WHERE id = 'global'
    RETURNING pledges_count INTO new_count;

    RETURN new_count;
END;
$$;

-- 2. Tabla de Testimonios
CREATE TABLE IF NOT EXISTS public.testimonials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    anonymous BOOLEAN NOT NULL DEFAULT false,
    role TEXT NOT NULL,
    role_detail TEXT,
    zone TEXT NOT NULL,
    experience TEXT NOT NULL,
    quote TEXT NOT NULL,
    story TEXT NOT NULL,
    featured BOOLEAN NOT NULL DEFAULT false,
    approved BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_testimonials_created_at ON public.testimonials (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_testimonials_approved ON public.testimonials (approved);

-- 3. Semilla de testimonios iniciales (casos reales del informe UCB)
INSERT INTO public.testimonials (id, name, anonymous, role, role_detail, zone, experience, quote, story, featured, approved)
VALUES
(
    'carmen',
    'Doña Carmen',
    false,
    'Vendedora ambulante',
    'Vendedora de golosinas y pasankalla',
    'Pérez Velasco',
    '18 años en la acera',
    '«Puesto cerrado es estómago vacío. Yo no pido limosna: trabajo. Pero cuando se llevan mi mercadería, se llevan la comida de mis hijos.»',
    'Enviudé cuando mis tres hijos eran pequeños. Vendiendo pasankalla y golosinas en la Pérez Velasco los saqué adelante: mi hija mayor ya es enfermera. Cada operativo me da miedo, no por la multa, sino porque un decomiso puede borrar la semana entera. Nunca tuve seguro médico; cuando me enfermo, aguanto o pago las medicinas de mi bolsillo.',
    true,
    true
),
(
    'luis',
    'Luis',
    false,
    'Vendedor ambulante',
    'Vendedor itinerante de accesorios de celular',
    'Av. Buenos Aires',
    '3 años de trabajo',
    '«Dejé la carrera de Gastronomía porque necesitaba comer. Ahora ahorro para volver, pero cada día en la calle también es esquivar el prejuicio.»',
    'Vendo accesorios de celular en la Av. Buenos Aires desde hace tres años. Antes tuve empleos formales precarios donde me pagaban tarde y sin beneficios. Aquí, al menos, el esfuerzo es mío. Lo más duro no es el sol ni la lluvia: es que la gente te mire como si estuvieras haciendo algo malo. Un día quiero tener mi propio taller de cocina.',
    false,
    true
),
(
    'marisol',
    'Marisol',
    false,
    'Ciudadana aliada',
    'Vecina del centro de La Paz',
    'Sopocachi',
    'Aliada de la campaña',
    '«Mi abuela vendía en el mercado. Aprendí de ella que el trato digno no cuesta nada y puede cambiar un día entero.»',
    'Cuando paso por la Pérez Velasco saludo, pregunto el precio y pago sin regatear de más. No es caridad: es reconocer que esa persona lleva horas de pie, lejos de su familia, sosteniendo la economía de la ciudad. Ojalá más vecinos entendamos que la calle también es un lugar de trabajo.',
    false,
    true
)
ON CONFLICT (id) DO NOTHING;

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.campaign_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para lectura pública
CREATE POLICY "Permitir lectura publica de stats"
    ON public.campaign_stats FOR SELECT
    USING (true);

CREATE POLICY "Permitir lectura publica de testimonios aprobados"
    ON public.testimonials FOR SELECT
    USING (approved = true);

-- Las funciones serverless conectadas con Secret Key (service_role) pueden saltar RLS para insertar y actualizar.
