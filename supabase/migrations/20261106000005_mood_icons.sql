-- Align mood icons with the specification (A01 table 7.2) and the Figma design.
update public.moods set icon = 'weather-sunny'  where code = 'happy';
update public.moods set icon = 'fire'           where code = 'motivated';
update public.moods set icon = 'lightning-bolt' where code = 'angry';
