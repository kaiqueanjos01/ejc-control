-- Check-in de dois dias de retiro
alter table encontristas add column checkin_dia1_at timestamptz;
alter table encontristas add column checkin_dia2_at timestamptz;

-- Preserva check-ins existentes como Dia 1
update encontristas set checkin_dia1_at = checkin_at where checkin_at is not null;

alter table encontristas drop column checkin_at;

-- Dia ativo para o auto-check-in por QR (1 ou 2)
alter table encontros add column checkin_dia_ativo smallint not null default 1;
