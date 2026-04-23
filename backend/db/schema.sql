create extension if not exists pgcrypto;

do $$
begin
  create type role as enum ('ADMIN', 'USER');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type booking_status as enum ('CONFIRMED', 'CANCELLED');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type slot_type as enum ('WORKSHOP', 'STATION');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type payment_method as enum ('CARD', 'UPI', 'CASH');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type payment_status as enum ('PAID', 'REFUNDED');
exception
  when duplicate_object then null;
end $$;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  email varchar(255) not null unique,
  password_hash text not null,
  role role not null default 'USER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null unique,
  description text not null,
  category slot_type not null,
  price_cents integer not null default 0 check (price_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists slots (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services(id) on delete restrict,
  slot_type slot_type not null,
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  max_capacity integer not null check (max_capacity > 0),
  booked_count integer not null default 0 check (booked_count >= 0 and booked_count <= max_capacity),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_id, slot_date, start_time, slot_type),
  unique (id, service_id)
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  service_id uuid not null references services(id) on delete restrict,
  slot_id uuid not null,
  attendee_count integer not null default 1 check (attendee_count > 0),
  phone_number varchar(30) not null default '',
  payment_method payment_method not null default 'CARD',
  payment_status payment_status not null default 'PAID',
  payment_amount_cents integer not null default 0 check (payment_amount_cents >= 0),
  payment_reference varchar(120),
  status booking_status not null default 'CONFIRMED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slot_id),
  constraint fk_booking_slot_service
    foreign key (slot_id, service_id)
    references slots(id, service_id)
    on delete restrict
);

alter table services
  add column if not exists price_cents integer not null default 0;

alter table bookings
  add column if not exists attendee_count integer not null default 1;

alter table bookings
  add column if not exists phone_number varchar(30) not null default '';

alter table bookings
  add column if not exists payment_method payment_method not null default 'CARD';

alter table bookings
  add column if not exists payment_status payment_status not null default 'PAID';

alter table bookings
  add column if not exists payment_amount_cents integer not null default 0;

alter table bookings
  add column if not exists payment_reference varchar(120);

create index if not exists idx_slots_slot_date on slots(slot_date);
create index if not exists idx_slots_service_id on slots(service_id);
create index if not exists idx_slots_slot_date_service on slots(slot_date, service_id);
create index if not exists idx_bookings_status on bookings(status);
create index if not exists idx_bookings_user_id on bookings(user_id);
create index if not exists idx_bookings_service_id on bookings(service_id);
create index if not exists idx_bookings_slot_id on bookings(slot_id);
create index if not exists idx_users_role on users(role);

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at
before update on users
for each row
execute function set_updated_at();

drop trigger if exists trg_services_updated_at on services;
create trigger trg_services_updated_at
before update on services
for each row
execute function set_updated_at();

drop trigger if exists trg_slots_updated_at on slots;
create trigger trg_slots_updated_at
before update on slots
for each row
execute function set_updated_at();

drop trigger if exists trg_bookings_updated_at on bookings;
create trigger trg_bookings_updated_at
before update on bookings
for each row
execute function set_updated_at();
