insert into services (name, description, category, price_cents, active)
values
  (
    'Beginner Gardening Workshop',
    'A guided introductory group session covering soil basics, planting prep, and beginner-friendly garden planning.',
    'WORKSHOP',
    4500,
    true
  ),
  (
    'Indoor Plant Care Workshop',
    'A hands-on workshop focused on light, watering, humidity, and keeping indoor plants healthy year-round.',
    'WORKSHOP',
    5500,
    true
  ),
  (
    'Composting Basics',
    'Learn the fundamentals of composting, balancing green and brown materials, and creating healthy compost at home.',
    'WORKSHOP',
    4000,
    true
  ),
  (
    'Hydroponics Intro',
    'Explore beginner hydroponic systems, nutrient management, and setup options in a structured workshop environment.',
    'WORKSHOP',
    6500,
    true
  ),
  (
    'Potting Station',
    'Reserve an individual station for potting seedlings, herbs, and houseplants with room for focused work.',
    'STATION',
    1800,
    true
  ),
  (
    'Repotting Station',
    'Book a plant-care station designed for repotting rootbound plants and refreshing containers safely.',
    'STATION',
    2200,
    true
  ),
  (
    'Soil Mixing Station',
    'Use a dedicated bench to blend custom soil mixes for indoor plants, succulents, or raised beds.',
    'STATION',
    2000,
    true
  ),
  (
    'Plant Treatment Station',
    'A contained treatment station for pruning, cleaning, and addressing common plant health issues.',
    'STATION',
    2500,
    true
  )
on conflict (name) do update
set
  description = excluded.description,
  category = excluded.category,
  price_cents = excluded.price_cents,
  active = excluded.active,
  updated_at = now();
